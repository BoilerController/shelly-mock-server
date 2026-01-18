export const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseBoolean(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y", "on", "minus", "neg", "negative"].includes(normalized);
}

export function toKilowatts(watts: number): number {
  return Number((watts / 1000).toFixed(3));
}

export function randomBetween(min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
