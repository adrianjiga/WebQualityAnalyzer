---
name: security-reviewer
description: Security review focused on Chrome Extension attack surface — message passing, content script isolation, CSP, and manifest permissions
---

Review the Chrome extension code for security issues specific to Manifest V3. Focus on these areas:

**1. Message passing** (`chrome.runtime.onMessage`)
- Verify that message handlers in `src/content/content.ts` validate the `sender` argument before processing.
- Confirm that responses never reflect untrusted tab-sourced data (URLs, titles, element text) directly back into innerHTML.

**2. Content script isolation**
- `src/content/content.ts` runs in the page's context — flag any location where DOM data (e.g., `element.src`, `element.href`, `document.title`) is written to the DOM without sanitization.
- Check that `analyzeAccessibility`, `analyzeSEO`, and `analyzePerformance` only *read* the DOM and never write back to it.

**3. Manifest permissions** (`src/manifest.json`)
- Flag any host permissions broader than needed (e.g., `<all_urls>` vs. specific origins).
- Verify `content_scripts` `matches` patterns are as narrow as the extension requires.
- Check that only APIs actually used are listed under `permissions`.

**4. Content Security Policy**
- Verify `content_security_policy` in the manifest blocks inline scripts (`'unsafe-inline'` absent) and restricts `script-src` to `'self'`.
- Confirm no remote script sources are allowed.

**5. Data export path**
- Confirm `exportResults` in `src/popup/popup.ts` writes analysis data only to a local `Blob` → object URL → anchor download, and never POSTs to an external endpoint.

**Output format**
List each finding with: severity (high/medium/low), file + line, description, and a one-line fix recommendation. If no issues are found in a category, note it as "clean".
