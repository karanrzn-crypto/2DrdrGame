/**
 * InteractionSystem.ts — reliable proximity interactions
 * (master directive §58): nearest target wins, range respected,
 * selection logic is pure and unit-tested.
 */
export interface Interactable {
  id: string;
  /** Interaction point in world px (usually the prop/NPC base). */
  x: number;
  y: number;
  /** Activation radius in px. */
  range: number;
  /** Persian prompt shown in the HUD hint bar. */
  prompt: string;
  /** Dialogue key from DIALOGUES. */
  dialogue: string;
}

/**
 * Pick the nearest interactable within its own range.
 * Pure function — unit tested in tests/interaction.test.ts.
 */
export function selectInteractable<T extends Interactable>(
  list: T[],
  x: number,
  y: number,
): T | null {
  let best: T | null = null;
  let bestD2 = Infinity;
  for (const it of list) {
    const dx = it.x - x;
    const dy = it.y - y;
    const d2 = dx * dx + dy * dy;
    const r = it.range;
    if (d2 <= r * r && d2 < bestD2) {
      best = it;
      bestD2 = d2;
    }
  }
  return best;
}

export class InteractionSystem {
  private items: Interactable[] = [];
  private selectedId: string | null = null;

  add(item: Interactable): void {
    this.items.push(item);
  }

  /**
   * Update selection and return the interactable currently highlighted
   * (or null). The caller reacts to changes.
   */
  update(x: number, y: number): Interactable | null {
    const sel = selectInteractable(this.items, x, y);
    this.selectedId = sel ? sel.id : null;
    return sel;
  }

  get currentId(): string | null {
    return this.selectedId;
  }
}
