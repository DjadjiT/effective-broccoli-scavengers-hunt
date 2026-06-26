const EARTH_RADIUS_METERS = 6371000;

export const LOCATION_CHECK_RADIUS_METERS = 50;
export const LOCATION_CHECK_TOLERANCE_METERS = 20;

export function haversineDistanceMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function destinationPoint(
  lat: number, lng: number, distanceMeters: number, bearingDeg: number,
): [number, number] {
  const delta = distanceMeters / EARTH_RADIUS_METERS;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  );
  const lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
  );

  return [(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI];
}

/** Returns [lng, lat] pairs approximating a circle around the given center. */
export function circlePolygonCoords(
  lat: number, lng: number, radiusMeters: number, points = 64,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    coords.push(destinationPoint(lat, lng, radiusMeters, (i * 360) / points));
  }
  return coords;
}
