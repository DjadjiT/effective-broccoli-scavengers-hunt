import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  SimpleChanges,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Step } from '../../../types';
import { environment } from '../../../environments/environment';
import { circlePolygonCoords, LOCATION_CHECK_RADIUS_METERS } from '../../lib/geo.utils';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapContainer class="map-container"></div>`,
  styles: [`
    .map-container { width: 100%; height: 100%; min-height: 300px; }
    :host ::ng-deep .mapboxgl-canvas-container { cursor: inherit; }
  `],
})
export class MapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input() steps: Step[] = [];
  /** Index of the currently highlighted/selected step (-1 = none). */
  @Input() activeStepIndex = -1;
  @Input() completedStepIds: string[] = [];
  @Input() pendingStepIds: string[] = [];
  @Input() pickMode = false;
  /** Ids of steps whose enigmas require GPS proximity — drawn as a validation radius. */
  @Input() locationCheckStepIds: string[] = [];
  /** Player's live GPS position — drawn as a "you are here" dot. */
  @Input() userPosition: { lat: number; lng: number } | null = null;

  @Output() markerClick = new EventEmitter<number>();
  @Output() mapClick = new EventEmitter<{ lat: number; lng: number }>();

  private map: any;
  private mapboxgl: any;
  private mapLoaded = false;
  private resizeObserver?: ResizeObserver;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const mod = await import('mapbox-gl');
      this.mapboxgl = (mod as any).default ?? mod;
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.mapboxgl) {
      const mod = await import('mapbox-gl');
      this.mapboxgl = (mod as any).default ?? mod;
    }
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map || !this.mapLoaded) return;
    if (changes['steps'] || changes['activeStepIndex'] || changes['completedStepIds'] || changes['pendingStepIds']) {
      this.updateMarkers();
    }
    if (changes['steps'] || changes['locationCheckStepIds']) {
      this.updateLocationCircles();
    }
    if (changes['userPosition']) {
      this.updateUserPosition();
    }
    if (changes['pickMode']) {
      this.map.getCanvas().style.cursor = this.pickMode ? 'crosshair' : '';
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const mapboxgl = this.mapboxgl;
    if (!mapboxgl || !this.mapContainer?.nativeElement) return;

    mapboxgl.accessToken = environment.mapboxToken;

    const center = this.steps.length > 0
      ? [this.steps[0].lng, this.steps[0].lat]
      : [2.3522, 48.8566];

    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom: 12,
      attributionControl: false,
    });

    this.map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    this.map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    this.map.on('load', () => {
      this.mapLoaded = true;

      this.map.addSource('location-check-circles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'location-check-circles-fill',
        type: 'fill',
        source: 'location-check-circles',
        paint: { 'fill-color': '#9B5DE5', 'fill-opacity': 0.18 },
      });
      this.map.addLayer({
        id: 'location-check-circles-line',
        type: 'line',
        source: 'location-check-circles',
        paint: { 'line-color': '#9B5DE5', 'line-width': 2 },
      });

      // Step markers are rendered as a GL symbol layer (canvas icons) rather than
      // DOM overlays, so they stay perfectly in sync with the basemap and the
      // validation circles during zoom/pan — DOM markers visibly lag behind the
      // WebGL canvas for a frame or two on continuous zoom gestures.
      this.map.addSource('step-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'step-markers',
        type: 'symbol',
        source: 'step-markers',
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
      });

      this.map.on('click', 'step-markers', (e: any) => {
        const f = e.features?.[0];
        if (f?.properties?.isClickable) this.markerClick.emit(f.properties.index);
      });
      this.map.on('mousemove', 'step-markers', (e: any) => {
        const clickable = e.features?.[0]?.properties?.isClickable;
        this.map.getCanvas().style.cursor = clickable ? 'pointer' : (this.pickMode ? 'crosshair' : '');
      });
      this.map.on('mouseleave', 'step-markers', () => {
        this.map.getCanvas().style.cursor = this.pickMode ? 'crosshair' : '';
      });

      // "You are here" dot — rendered on top of step markers.
      this.map.addSource('user-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'user-location-halo',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 14,
          'circle-color': '#4285F4',
          'circle-opacity': 0.25,
        },
      });
      this.map.addLayer({
        id: 'user-location-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 7,
          'circle-color': '#4285F4',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      this.updateMarkers();
      this.updateLocationCircles();
      this.updateUserPosition();
      this.fitBounds();
    });

    // Recalibrate canvas whenever the container is resized
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);

    this.map.on('click', (e: any) => {
      if (!this.pickMode) return;
      const hits = this.map.queryRenderedFeatures(e.point, { layers: ['step-markers'] });
      if (hits.length > 0 && hits[0].properties?.isClickable) return;
      this.mapClick.emit({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
  }

  private updateMarkers(): void {
    if (!this.map || !this.mapLoaded) return;
    const source = this.map.getSource('step-markers');
    if (!source) return;

    const features = this.steps.map((step, index) => {
      const isPending = this.pendingStepIds.includes(step.id);
      const isDone = this.completedStepIds.includes(step.id) && !isPending;
      const isSelected = index === this.activeStepIndex && !isDone && !isPending;
      const isClickable = !isDone;
      const iconId = this.getStepIconId(step, index, isPending, isDone, isSelected);

      return {
        type: 'Feature' as const,
        properties: { index, isClickable, iconId },
        geometry: { type: 'Point' as const, coordinates: [step.lng, step.lat] },
      };
    });

    source.setData({ type: 'FeatureCollection', features });
  }

  /** Renders (and caches) a small canvas icon matching a marker's visual state. */
  private getStepIconId(
    step: Step, index: number, isPending: boolean, isDone: boolean, isSelected: boolean,
  ): string {
    // pending=lemon, done=mint, selected=coral, available=sky
    const color = isPending ? '#FFE66D' : isDone ? '#6BCB77' : isSelected ? '#FF6B6B' : '#4ECDC4';
    const size = isSelected ? 48 : 38;
    const textColor = isPending ? '#2D2D2D' : '#ffffff';
    const label = isDone ? '✓' : isPending ? '⏳' : String(index + 1);
    const opacity = isDone ? 0.75 : 1;

    const iconId = `step-icon-${color}-${size}-${label}-${textColor}-${opacity}`;
    if (this.map.hasImage(iconId)) return iconId;

    const dpr = window.devicePixelRatio || 1;
    const padding = 6;
    const dim = size + padding * 2;
    const canvas = document.createElement('canvas');
    canvas.width = dim * dpr;
    canvas.height = dim * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.globalAlpha = opacity;

    const cx = dim / 2;
    const cy = dim / 2;
    const r = size / 2 - 1.5;

    // hard drop shadow (matches the previous CSS box-shadow look)
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2D2D2D';
    ctx.fill();

    // main circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2D2D2D';
    ctx.stroke();

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FF6B6B';
      ctx.stroke();
    }

    ctx.fillStyle = textColor;
    ctx.font = `${isSelected ? 20 : 15}px "Fredoka One", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);

    this.map.addImage(iconId, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: dpr });
    return iconId;
  }

  private updateLocationCircles(): void {
    if (!this.map || !this.mapLoaded) return;
    const source = this.map.getSource('location-check-circles');
    if (!source) return;

    const features = this.steps
      .filter(step => this.locationCheckStepIds.includes(step.id))
      .map(step => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [circlePolygonCoords(step.lat, step.lng, LOCATION_CHECK_RADIUS_METERS)],
        },
      }));

    source.setData({ type: 'FeatureCollection', features });
  }

  private updateUserPosition(): void {
    if (!this.map || !this.mapLoaded) return;
    const source = this.map.getSource('user-location');
    if (!source) return;

    const features = this.userPosition
      ? [{
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: [this.userPosition.lng, this.userPosition.lat] },
        }]
      : [];

    source.setData({ type: 'FeatureCollection', features });
  }

  private fitBounds(): void {
    if (!this.map || this.steps.length === 0) return;
    if (this.steps.length === 1) {
      this.map.flyTo({ center: [this.steps[0].lng, this.steps[0].lat], zoom: 14 });
      return;
    }
    const bounds = new this.mapboxgl.LngLatBounds();
    this.steps.forEach(s => bounds.extend([s.lng, s.lat]));
    this.map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
  }

  flyToStep(index: number): void {
    if (!this.map || !this.steps[index] || !this.mapLoaded) return;
    const { lat, lng } = this.steps[index];
    this.map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
  }
}
