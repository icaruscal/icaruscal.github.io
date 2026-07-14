/**
 * Minify data/icarus-game/data-catalog.json → public/icarus-game/Data/data-catalog.json
 * used by Vite builds when the pretty catalog already exists (no re-export needed).
 * Prefer `yarn build-data-catalog` after a game data export — it writes both.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prettyPath = resolve(root, 'data/icarus-game/data-catalog.json');
const publicDir = resolve(root, 'public/icarus-game/Data');
const minPath = resolve(publicDir, 'data-catalog.json');

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

    const minified = JSON.stringify(JSON.parse(readFileSync(prettyPath, 'utf8')));
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(minPath, minified, 'utf8');

    console.log(`Data catalog → ${minPath}`);
    console.log(`  pretty:   ${formatBytes(statSync(prettyPath).size)}`);
    console.log(`  minified: ${formatBytes(Buffer.byteLength(minified))}`);
}

main();
