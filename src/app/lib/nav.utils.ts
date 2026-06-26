export type NavigationApp = 'google' | 'waze' | 'apple';

interface GeoPoint {
  lat: number;
  lng: number;
}

export function buildNavigationUrl(
  origin: GeoPoint | null,
  dest: GeoPoint,
  app: NavigationApp = 'google',
): string {
  switch (app) {
    case 'waze':
      return `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`;
    case 'apple':
      return origin
        ? `maps://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${dest.lat},${dest.lng}&dirflg=w`
        : `maps://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=w`;
    case 'google':
    default:
      return origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=walking`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=walking`;
  }
}

export function openNavigation(
  origin: GeoPoint | null,
  dest: GeoPoint,
  app: NavigationApp = 'google',
): void {
  window.open(buildNavigationUrl(origin, dest, app), '_blank', 'noopener,noreferrer');
}
