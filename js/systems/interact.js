/**
 * interact.js — تعامل با نزدیک‌ترین هدف (سابقهٔ InteractionSystem حفظ شده):
 * نزدیک‌ترین هدف در شعاع خودش برنده است؛ منطق انتخاب pure است.
 */
export function selectInteractable(list, x, y) {
  let best = null;
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
  constructor() {
    this.items = [];
  }

  add(item) { this.items.push(item); }

  update(x, y) { return selectInteractable(this.items, x, y); }
}
