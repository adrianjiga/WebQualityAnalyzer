// ─── Shared DOM helpers for content analyser tests ───────────────────────────

export function appendImg(src: string, alt?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  if (alt !== undefined) img.alt = alt;
  document.body.appendChild(img);
  return img;
}

export function appendInput(
  type: string,
  opts: { id?: string; ariaLabel?: string } = {}
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  if (opts.id) input.id = opts.id;
  if (opts.ariaLabel) input.setAttribute('aria-label', opts.ariaLabel);
  document.body.appendChild(input);
  return input;
}

export function appendHeading(level: number, text = 'Heading'): HTMLElement {
  const h = document.createElement(`h${level}`) as HTMLElement;
  h.textContent = text;
  document.body.appendChild(h);
  return h;
}

export function appendMeta(attrs: Record<string, string>): HTMLMetaElement {
  const meta = document.createElement('meta');
  for (const [k, v] of Object.entries(attrs)) meta.setAttribute(k, v);
  document.head.appendChild(meta);
  return meta;
}

export function appendLink(attrs: Record<string, string>): HTMLLinkElement {
  const link = document.createElement('link');
  for (const [k, v] of Object.entries(attrs)) link.setAttribute(k, v);
  document.head.appendChild(link);
  return link;
}

export function appendH1(text = 'Main Heading'): HTMLHeadingElement {
  const h1 = document.createElement('h1') as HTMLHeadingElement;
  h1.textContent = text;
  document.body.appendChild(h1);
  return h1;
}

// jsdom always reports naturalWidth/naturalHeight as 0; override per element.
// loading="lazy" prevents the unrelated lazy-loading check from firing when
// many of these images are added in the same test.
export function addImageWithDimensions(
  naturalWidth: number,
  naturalHeight: number,
  src = 'http://example.com/image.jpg'
): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  img.setAttribute('loading', 'lazy');
  Object.defineProperty(img, 'naturalWidth', {
    get: () => naturalWidth,
    configurable: true,
  });
  Object.defineProperty(img, 'naturalHeight', {
    get: () => naturalHeight,
    configurable: true,
  });
  document.body.appendChild(img);
  return img;
}

export function appendImgs(count: number, src = 'x.jpg'): void {
  for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    img.src = src;
    document.body.appendChild(img);
  }
}

export function appendSpansWithStyle(count: number): void {
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.style.color = 'red';
    document.body.appendChild(span);
  }
}

export function appendExternalScripts(count: number): void {
  for (let i = 0; i < count; i++) {
    const script = document.createElement('script');
    script.src = 'http://cdn.example.com/lib.js';
    document.head.appendChild(script);
  }
}

export function appendExternalLinks(count: number): void {
  for (let i = 0; i < count; i++) {
    const link = document.createElement('link');
    link.setAttribute('href', 'http://cdn.example.com/style.css');
    document.head.appendChild(link);
  }
}

export function appendExternalAnchors(count: number, withRel = false): void {
  for (let i = 0; i < count; i++) {
    const a = document.createElement('a');
    a.href = 'http://example.com';
    a.textContent = 'link';
    if (withRel) a.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(a);
  }
}
