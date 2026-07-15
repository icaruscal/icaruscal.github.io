/**
 * Vite helper for data-catalog.json and version.json:
 * - dev: serve pretty files from data/ at /icarus-game/Data/*
 * - build: minify/copy into public/ before assets are copied to dist
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prettyCatalogPath = resolve(root, 'data/icarus-game/data-catalog.json');
const prettyVersionPath = resolve(root, 'data/icarus-game/version.json');
const prepareScript = resolve(root, 'scripts/prepare-data-catalog.mjs');
const catalogUrlPath = '/icarus-game/Data/data-catalog.json';
const versionUrlPath = '/icarus-game/Data/version.json';

function runPrepare() {
    const result = spawnSync(process.execPath, [prepareScript], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
        throw new Error('prepare-data-catalog failed');
    }
}

function serveJsonFile(res, filePath, missingMessage) {
    if (!existsSync(filePath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: missingMessage }));
        return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(readFileSync(filePath));
}

export function dataCatalogPlugin() {
    return {
        name: 'data-catalog',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const urlPath = req.url?.split('?')[0];
                if (urlPath === catalogUrlPath) {
                    serveJsonFile(res, prettyCatalogPath, 'Missing data/icarus-game/data-catalog.json. Run yarn build-data-catalog.');
                    return;
                }
                if (urlPath === versionUrlPath) {
                    serveJsonFile(res, prettyVersionPath, 'Missing data/icarus-game/version.json. Run yarn update-game-assets after export.bat.');
                    return;
                }
                next();
            });
        },
        buildStart() {
            if (!existsSync(prettyCatalogPath)) {
                this.warn(`data-catalog: skipped minify (missing ${prettyCatalogPath})`);
                return;
            }
            runPrepare();
        },
    };
}
