import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

for (const browser of ['chrome', 'firefox']) {
  const outputDirectory = join('dist', browser);
  const manifest = JSON.parse(
    await readFile(join(outputDirectory, 'manifest.json'), 'utf8')
  );

  if (manifest.manifest_version !== 3) {
    throw new Error(`${browser} manifest is not Manifest V3`);
  }
  if (!Array.isArray(manifest.permissions) || !manifest.permissions.includes('storage')) {
    throw new Error(`${browser} manifest is missing storage permission`);
  }
  if (!manifest.permissions.includes('scripting')) {
    throw new Error(`${browser} manifest is missing scripting permission`);
  }
  if (manifest.content_scripts || manifest.host_permissions) {
    throw new Error(
      `${browser} manifest must inject on demand, not request site access`
    );
  }
  const csp = new Map(
    (manifest.content_security_policy?.extension_pages ?? '')
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name.toLowerCase(), sources.join(' ')])
  );
  for (const [name, sources] of [
    ['script-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'none'"],
    ['form-action', "'none'"],
    ['frame-ancestors', "'none'"],
  ]) {
    if (csp.get(name) !== sources) {
      throw new Error(`${browser} manifest CSP must set ${name} ${sources}`);
    }
  }
  for (const name of ['script-src-elem', 'script-src-attr', 'worker-src']) {
    if (csp.has(name)) {
      throw new Error(
        `${browser} manifest CSP must not loosen scripts via ${name}`
      );
    }
  }
  const backgroundScripts = manifest.background?.service_worker
    ? [manifest.background.service_worker]
    : manifest.background?.scripts;
  if (!Array.isArray(backgroundScripts) || backgroundScripts.length === 0) {
    throw new Error(`${browser} manifest has no background script`);
  }

  for (const file of [
    'popup.html',
    'popup.bundle.js',
    'content.bundle.js',
    ...backgroundScripts,
  ]) {
    await access(join(outputDirectory, file));
  }

  const popupBundle = await readFile(
    join(outputDirectory, 'popup.bundle.js'),
    'utf8'
  );
  const injectedFiles = new Set(
    Array.from(
      popupBundle.matchAll(/['"`]([\w.-]+\.bundle\.js)['"`]/g),
      ([, file]) => file
    )
  );
  if (injectedFiles.size === 0) {
    throw new Error(`${browser} popup bundle references no script to inject`);
  }
  for (const file of injectedFiles) {
    await access(join(outputDirectory, file)).catch(() => {
      throw new Error(`${browser} popup injects ${file}, which was not built`);
    });
  }
}
