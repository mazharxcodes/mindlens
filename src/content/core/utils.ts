export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function nowIso(): string {
  return new Date().toISOString();
}
