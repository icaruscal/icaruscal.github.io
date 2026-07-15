/**
 * Shared helpers for Icarus Config/version.json used by sync scripts.
 * Stamps extractedAt (YYYY-MM-DD) when missing so the site tooltip can show export date.
 * Attaches catalogHash (content hash of data-catalog.json) for client cache-busting.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';

/** Meta keys that change per machine / rebuild and must not affect catalogHash. */
export const VOLATILE_CATALOG_META_KEYS = ['generatedAt', 'exportPath', 'dataRoot'];

/**
 * @param {string} minifiedCatalogJson
 * @param {number} [length=12]
 * @returns {string}
 */
export function hashCatalogJson(minifiedCatalogJson, length = 12) {
    return createHash('sha256').update(minifiedCatalogJson, 'utf8').digest('hex').slice(0, length);
}

/**
 * Drop per-build / machine-local meta fields from a parsed catalog (mutates).
 * @param {Record<string, unknown>} catalog
 * @returns {boolean} true if anything was removed
 */
export function stripVolatileCatalogMeta(catalog) {
    const meta = catalog?.meta;
    if (!meta || typeof meta !== 'object') return false;
    let changed = false;
    for (const key of VOLATILE_CATALOG_META_KEYS) {
        if (Object.prototype.hasOwnProperty.call(meta, key)) {
            delete meta[key];
            changed = true;
        }
    }
    return changed;
}

/**
 * @param {string} text
 * @param {Date} [when]
 * @param {Record<string, unknown>} [extras] fields merged onto the doc (e.g. catalogHash)
 * @returns {string} pretty JSON with extractedAt set
 */
export function stampExtractedAt(text, when = new Date(), extras = {}) {
    const doc = JSON.parse(text);
    if (!doc.extractedAt) {
        doc.extractedAt = when.toISOString().slice(0, 10);
    }
    Object.assign(doc, extras);
    return `${JSON.stringify(doc, null, 4)}\n`;
}

/**
 * Read version.json, ensure extractedAt, optionally keep catalogHash from an existing dest, write destinations.
 * @param {string} srcPath
 * @param {string[]} destPaths
 * @param {{ preserveCatalogHash?: boolean }} [options]
 */
export async function syncStampedVersionJson(srcPath, destPaths, { preserveCatalogHash = true } = {}) {
    let catalogHash;
    if (preserveCatalogHash && destPaths[0]) {
        try {
            const existing = JSON.parse(await readFile(destPaths[0], 'utf8'));
            if (typeof existing.catalogHash === 'string' && existing.catalogHash) {
                catalogHash = existing.catalogHash;
            }
        } catch {
            // no prior version / hash
        }
    }
    const extras = catalogHash ? { catalogHash } : {};
    const stamped = stampExtractedAt(await readFile(srcPath, 'utf8'), new Date(), extras);
    for (const dest of destPaths) {
        await writeFile(dest, stamped, 'utf8');
        await chmod(dest, 0o644);
    }
    return stamped;
}

/**
 * Set or refresh catalogHash on version.json text and return pretty JSON.
 * @param {string} versionText
 * @param {string} catalogHash
 * @returns {string}
 */
export function withCatalogHash(versionText, catalogHash) {
    return stampExtractedAt(versionText, new Date(), { catalogHash });
}
