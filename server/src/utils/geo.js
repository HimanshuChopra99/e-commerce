// haversineMeters is re-exported from tracking.controller for external use

/** Is distanceMeters within radiusMeters? Fails closed on non-finite values. */
export function withinRadius(distanceMeters, radiusMeters) {
  return (
    Number.isFinite(distanceMeters) &&
    Number.isFinite(radiusMeters) &&
    distanceMeters <= radiusMeters
  );
}
