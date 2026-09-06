export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function clampMoney(value: number): number {
  return Math.max(0, Math.round(value));
}
