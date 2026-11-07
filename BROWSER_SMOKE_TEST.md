# Browser Extension Smoke Test

Run this checklist after building the extension. Keep separate notes for Chrome and Firefox because their Manifest V3 background implementations differ.

## Prepare builds

- [ ] Run `npm run build:chrome` and confirm `dist/chrome/manifest.json` exists.
- [ ] Run `npm run build:firefox` and confirm `dist/firefox/manifest.json` exists.

## Chrome

- [ ] Open `chrome://extensions`, enable Developer mode, and load `dist/chrome/` unpacked.
- [ ] Open a normal HTTPS page with a title and at least one heading; open the extension popup and analyze it.
- [ ] Confirm the report URL matches the active page, the score and all three category panels render, and issue details expand.
- [ ] Change a setting, close and reopen the popup, and confirm the setting persists.
- [ ] Export a report and confirm a dated JSON file downloads and contains the page URL, score, categories, and `exportedAt`.
- [ ] Try a restricted page such as a browser settings page and confirm the popup exits loading state and gives a clear error.
- [ ] Navigate the analyzed tab before opening the popup again; confirm the next report corresponds to the new page.

## Firefox

- [ ] Open `about:debugging` → **This Firefox**, load `dist/firefox/manifest.json` as a temporary add-on.
- [ ] Repeat the normal-page analysis, report rendering, settings persistence, export, and restricted-page checks above.
- [ ] Confirm the extension remains functional with the Firefox MV3 background scripts manifest configuration.

## Record results

Record browser version, operating system, date, pass/fail for each check, and any console or extension errors. Do not treat a build or jsdom test pass as a substitute for these browser checks.
