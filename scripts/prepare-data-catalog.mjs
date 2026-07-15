/**
 * Minify data/icarus-game/data-catalog.json → public/icarus-game/Data/data-catalog.json
 * and copy version.json next to it (with catalogHash for cache-busting).
 * used by Vite builds when the pretty catalog already exists (no re-export needed).
 * Prefer `yarn build-data-catalog` after a game data export — it writes both.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashCatalogJson, stripVolatileCatalogMeta, withCatalogHash } from './version-json.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prettyPath = resolve(root, 'data/icarus-game/data-catalog.json');
const prettyVersionPath = resolve(root, 'data/icarus-game/version.json');
const publicDir = resolve(root, 'public/icarus-game/Data');
const minPath = resolve(publicDir, 'data-catalog.json');
const publicVersionPath = resolve(publicDir, 'version.json');

function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function main() {
    if (!existsSync(prettyPath)) {
        console.error(`Missing pretty catalog: ${prettyPath}`);
        console.error('Run: yarn build-data-catalog <path/to/IC_Export>');
        process.exit(1);
    }

    const catalog = JSON.parse(readFileSync(prettyPath, 'utf8'));
    const stripped = stripVolatileCatalogMeta(catalog);
    const prettyJson = `${JSON.stringify(catalog, null, 2)}\n`;
    const minified = JSON.stringify(catalog);
    const catalogHash = hashCatalogJson(minified);

    mkdirSync(publicDir, { recursive: true });
    if (stripped) {
        writeFileSync(prettyPath, prettyJson, 'utf8');
        console.log('Stripped volatile meta (generatedAt / exportPath / dataRoot) from pretty catalog');
    }
    writeFileSync(minPath, minified, 'utf8');

    console.log(`Data catalog → ${minPath}`);
    console.log(`  pretty:   ${formatBytes(statSync(prettyPath).size)}`);
    console.log(`  minified: ${formatBytes(Buffer.byteLength(minified))}`);
    console.log(`  catalogHash: ${catalogHash}`);

    if (existsSync(prettyVersionPath)) {
        const versionJson = withCatalogHash(readFileSync(prettyVersionPath, 'utf8'), catalogHash);
        writeFileSync(prettyVersionPath, versionJson, 'utf8');
        writeFileSync(publicVersionPath, versionJson, 'utf8');
        console.log(`Game version → ${publicVersionPath} (catalogHash=${catalogHash})`);
    } else {
        console.warn(`Missing ${prettyVersionPath} (header will not show a game version; catalogHash not stored)`);
    }
}

main();
