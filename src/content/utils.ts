export function getCssSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    let segment = current.tagName.toLowerCase();

    if (current.id) {
      segment += `#${current.id}`;
      parts.unshift(segment);
      break;
    }

    if (current.className) {
      const firstClass = current.className.trim().split(/\s+/)[0];
      if (firstClass) segment += `.${firstClass}`;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(segment);
    current = current.parentElement;
  }

  return parts.join(' > ') || el.tagName.toLowerCase();
}

export function getHtmlSnippet(el: Element, maxLength = 120): string {
  const raw = el.outerHTML;
  return raw.length > maxLength ? raw.slice(0, maxLength) + '\u2026' : raw;
}
