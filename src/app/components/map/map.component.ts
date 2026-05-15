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

  @Output() markerClick = new EventEmitter<number>();
  @Output() mapClick = new EventEmitter<{ lat: number; lng: number }>();

  private map: any;
  private markers: any[] = [];
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
    if (changes['pickMode']) {
      this.map.getCanvas().style.cursor = this.pickMode ? 'crosshair' : '';
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.markers.forEach(m => m.remove());
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
      this.updateMarkers();
      this.fitBounds();
    });

    // Recalibrate canvas whenever the container is resized
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);

    this.map.on('click', (e: any) => {
      if (this.pickMode) {
        this.mapClick.emit({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });
  }

  private updateMarkers(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];
    if (!this.map || this.steps.length === 0) return;

    this.steps.forEach((step, index) => {
      const isPending = this.pendingStepIds.includes(step.id);
      const isDone = this.completedStepIds.includes(step.id) && !isPending;
      const isSelected = index === this.activeStepIndex && !isDone && !isPending;
      const isClickable = !isDone;

      // pending=lemon, done=mint, selected=coral, available=sky
      const color = isPending ? '#FFE66D' : isDone ? '#6BCB77' : isSelected ? '#FF6B6B' : '#4ECDC4';
      const size = isSelected ? 48 : 38;
      const textColor = isPending ? '#2D2D2D' : '#fff';
      const label = isDone ? '✓' : isPending ? '⏳' : String(index + 1);

      const el = document.createElement('div');
      el.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `background:${color}`,
        'border:3px solid #2D2D2D',
        'border-radius:50%',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'font-family:"Fredoka One",cursive',
        `font-size:${isSelected ? 20 : 15}px`,
        `color:${textColor}`,
        'box-shadow:3px 3px 0 #2D2D2D',
        `cursor:${isClickable ? 'pointer' : 'default'}`,
        'position:relative',
        'user-select:none',
        `opacity:${isDone ? '0.75' : '1'}`,
      ].join(';');
      el.textContent = label;

      if (isSelected) {
        const ring = document.createElement('div');
        ring.style.cssText = [
          'position:absolute',
          'inset:-10px',
          'border:3px solid #FF6B6B',
          'border-radius:50%',
          'animation:pulseRing 1.4s ease-out infinite',
          'pointer-events:none',
        ].join(';');
        el.appendChild(ring);
      }

      if (isClickable) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.markerClick.emit(index);
        });
      }

      const marker = new this.mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([step.lng, step.lat])
        .addTo(this.map);

      this.markers.push(marker);
    });
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
