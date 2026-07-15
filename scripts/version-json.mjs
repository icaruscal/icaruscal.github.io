/**
 * Shared helpers for Icarus Config/version.json used by sync scripts.
 * Stamps extractedAt (YYYY-MM-DD) when missing so the site tooltip can show export date.
 */
import { readFile, writeFile, chmod } from 'node:fs/promises';

/**
 * @param {string} text
 * @param {Date} [when]
 * @returns {string} pretty JSON with extractedAt set
 */
export function stampExtractedAt(text, when = new Date()) {
    const doc = JSON.parse(text);
    if (!doc.extractedAt) {
        doc.extractedAt = when.toISOString().slice(0, 10);
    }
    return `${JSON.stringify(doc, null, 4)}\n`;
}

/**
 * Read version.json, ensure extractedAt, write to destinations.
 * @param {string} srcPath
 * @param {string[]} destPaths
 */
export async function syncStampedVersionJson(srcPath, destPaths) {
    const stamped = stampExtractedAt(await readFile(srcPath, 'utf8'));
    for (const dest of destPaths) {
        await writeFile(dest, stamped, 'utf8');
        await chmod(dest, 0o644);
    }
    return stamped;
}
