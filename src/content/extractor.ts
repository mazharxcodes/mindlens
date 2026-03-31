import { InstagramPost } from "./types";
import { normalizeText } from "./utils";

function getVisibleTextBlocks(root: ParentNode): string[] {
  const selectors = [
    "h1",
    "h2",
    "span",
    "div[role='button'] span",
    "a[role='link'] span"
  ];

  return selectors.flatMap((selector) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector))
      .map((node) => normalizeText(node.innerText))
      .filter((text) => text.length > 0)
  );
}

function getPostId(article: HTMLElement): string | null {
  const permalink =
    article.querySelector<HTMLAnchorElement>("a[href*='/p/']") ??
    article.querySelector<HTMLAnchorElement>("a[href*='/reel/']");

  if (permalink?.href) {
    return permalink.href;
  }

  const timeElement = article.querySelector<HTMLTimeElement>("time[datetime]");
  if (timeElement?.dateTime) {
    return `${location.pathname}::${timeElement.dateTime}`;
  }

  const fallback = normalizeText(article.innerText).slice(0, 120);
  return fallback.length > 0 ? `${location.pathname}::${fallback}` : null;
}

export function extractInstagramPost(article: HTMLElement): InstagramPost | null {
  const id = getPostId(article);
  if (!id) {
    return null;
  }

  const permalink =
    article.querySelector<HTMLAnchorElement>("a[href*='/p/']") ??
    article.querySelector<HTMLAnchorElement>("a[href*='/reel/']");
  const timestamp = article.querySelector<HTMLTimeElement>("time[datetime]")?.dateTime;

  const imageAltTexts = Array.from(article.querySelectorAll<HTMLImageElement>("img[alt]"))
    .map((image) => normalizeText(image.alt))
    .filter(Boolean);

  const visibleTextBlocks = Array.from(new Set(getVisibleTextBlocks(article))).filter(
    (chunk) => chunk.length >= 8
  );
  const uniqueTextChunks = Array.from(new Set([...visibleTextBlocks, ...imageAltTexts])).filter(
    (chunk) => chunk.length >= 8
  );

  const text = normalizeText(uniqueTextChunks.join(" "));
  if (!text) {
    return null;
  }

  return {
    id,
    href: permalink?.href,
    timestamp,
    text,
    textLength: text.length,
    visibleTextBlocks,
    imageAltTexts
  };
}
