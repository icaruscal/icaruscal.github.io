/**
 * Vite helper for data-catalog.json:
 * - dev: serve the pretty file from data/ at /icarus-game/Data/data-catalog.json
 * - build: minify into public/ before assets are copied to dist
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prettyPath = resolve(root, 'data/icarus-game/data-catalog.json');
const prepareScript = resolve(root, 'scripts/prepare-data-catalog.mjs');
const catalogUrlPath = '/icarus-game/Data/data-catalog.json';

function runPrepare() {
    const result = spawnSync(process.execPath, [prepareScript], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
        throw new Error('prepare-data-catalog failed');
    }
}

export function dataCatalogPlugin() {
    return {
        name: 'data-catalog',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const urlPath = req.url?.split('?')[0];
                if (urlPath !== catalogUrlPath) {
                    next();
                    return;
                }
                if (!existsSync(prettyPath)) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                        JSON.stringify({
                            error: 'Missing data/icarus-game/data-catalog.json. Run yarn build-data-catalog.',
                        })
                    );
                    return;
                }
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache');
                res.end(readFileSync(prettyPath));
            });
        },
        buildStart() {
            if (!existsSync(prettyPath)) {
                this.warn(`data-catalog: skipped minify (missing ${prettyPath})`);
                return;
            }
            runPrepare();
        },
    };
}
