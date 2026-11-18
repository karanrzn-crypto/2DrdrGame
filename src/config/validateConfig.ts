/**
 * validateConfig.ts — pure runtime validation of the game tuning constants
 * and boot inputs (no Phaser, no DOM — unit-tested in tests/validateconfig.test.ts).
 *
 * Why it exists (Phase 2 objective 7):
 * - GAME constants were trusted blindly; a typo (speed 0, inverted speed
 *   order, malformed color) surfaced as bizarre gameplay or a dead sampler
 *   instead of a clear error. BootScene now fail-fasts with assertValidGameConfig
 *   BEFORE any texture work, so a bad config becomes a visible boot error
 *   panel instead of an undefined world.
 * - Rules mirror real invariants: canvas must be positive-integer sized,
 *   zoom >= 1 (pixel-art), runSpeed >= walkSpeed (Shift must be faster),
 *   acceleration > 0, drag >= 0 (drag 0 would mean no friction), a positive
 *   world-clock rate, and a strict #rrggbb clear color (VisibleCheck's
 *   hexToRgb and Phaser's backgroundColor both parse this exact format).
 */

export interface ConfigValues {
  width: number;
  height: number;
  tileSize: number;
  camZoom: number;
  walkSpeed: number;
  runSpeed: number;
  acceleration: number;
  drag: number;
  minutesPerRealSecond: number;
  backgroundColor: string;
}

export interface ConfigIssue {
  field: string;
  problem: string;
}

function needPositiveInteger(issues: ConfigIssue[], field: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0 || !Number.isInteger(v)) {
    issues.push({ field, problem: `must be a positive integer (got ${v})` });
  }
}

function needPositiveNumber(issues: ConfigIssue[], field: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) {
    issues.push({ field, problem: `must be a finite number > 0 (got ${v})` });
  }
}

/** Validate the tuning constants. Empty array = valid. */
export function validateGameConfig(c: ConfigValues): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  needPositiveInteger(issues, 'width', c.width);
  needPositiveInteger(issues, 'height', c.height);
  needPositiveInteger(issues, 'tileSize', c.tileSize);
  if (!Number.isFinite(c.camZoom) || c.camZoom < 1) {
    issues.push({ field: 'camZoom', problem: `must be a finite number >= 1 (got ${c.camZoom})` });
  }
  needPositiveNumber(issues, 'walkSpeed', c.walkSpeed);
  if (!Number.isFinite(c.runSpeed) || c.runSpeed < c.walkSpeed) {
    issues.push({
      field: 'runSpeed',
      problem: `must be a finite number >= walkSpeed (${c.walkSpeed}) (got ${c.runSpeed})`,
    });
  }
  needPositiveNumber(issues, 'acceleration', c.acceleration);
  if (!Number.isFinite(c.drag) || c.drag < 0) {
    issues.push({ field: 'drag', problem: `must be a finite number >= 0 (got ${c.drag})` });
  }
  needPositiveNumber(issues, 'minutesPerRealSecond', c.minutesPerRealSecond);
  if (!/^#[0-9a-f]{6}$/i.test(c.backgroundColor)) {
    issues.push({
      field: 'backgroundColor',
      problem: `must be a strict '#rrggbb' hex color (got ${JSON.stringify(c.backgroundColor)})`,
    });
  }
  return issues;
}

/** Fail fast with every issue listed (called from BootScene.create). */
export function assertValidGameConfig(c: ConfigValues): void {
  const issues = validateGameConfig(c);
  if (issues.length > 0) {
    throw new Error(
      'Invalid GAME configuration:\n'
      + issues.map((i) => `  - ${i.field}: ${i.problem}`).join('\n'),
    );
  }
}
