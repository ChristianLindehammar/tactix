// Snap angles: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
const SNAP_ANGLES = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
const SNAP_THRESHOLD = Math.PI / 18; // 10 degrees — gentle snap zone

/**
 * Snaps the moving endpoint to the nearest cardinal/diagonal angle
 * relative to the fixed endpoint, preserving the arrow length.
 */
export function snapEndpoint(
  fixedX: number, fixedY: number,
  movingX: number, movingY: number,
): { x: number; y: number } {
  const dx = movingX - fixedX;
  const dy = movingY - fixedY;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  for (const snapAngle of SNAP_ANGLES) {
    let diff = angle - snapAngle;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    if (Math.abs(diff) < SNAP_THRESHOLD) {
      return {
        x: fixedX + length * Math.cos(snapAngle),
        y: fixedY + length * Math.sin(snapAngle),
      };
    }
  }

  return { x: movingX, y: movingY };
}
