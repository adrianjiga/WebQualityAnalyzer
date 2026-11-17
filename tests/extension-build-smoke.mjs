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
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  for (const directive of ["script-src 'self'", "object-src 'none'"]) {
    if (!csp.includes(directive)) {
      throw new Error(`${browser} manifest CSP is missing ${directive}`);
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
}
