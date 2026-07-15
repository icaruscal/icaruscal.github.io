/**
 * This script is inteneded to be used via yarn script command: 'update-game-assets'.
 *
 * It's usage would be from within yarn:
 *   yarn update-game-assets C:\path\to\Ue4Export\export
 *
 * This script will attempt to update all of the web app assets related to the game from what was extracted with the
 * `UE4ExportFiles` directory.  So this game expects you to have followed the export instructions in the readme, as
 * well as, execute the export.bat.
 *
 * This script will attempt to prune any extra assets as well as find all new ones, and assets that changed. It uses the
 * export's `Traits/D_Itemable.json` to decide which ItemIcons belong in the web app.
 * Also syncs `version.json` from the export root into data/ and public/.
 * Game recipe/item JSON for the app is built separately via `yarn build-data-catalog` (not copied into public/Data).
 *
 * @module
 */
import { readdir, readFile, stat, copyFile, rm, realpath, chmod } from 'node:fs/promises';
import * as path from 'node:path';
import { syncStampedVersionJson } from './version-json.mjs';
/**
 * An Item row is 1 row within one of the D_Item*.json files extracted from the data.pak file.
 *
 * @typedef ItemRow
 * @type {object}
 * @property {string} Name
 * @property {string|undefined} Icon
 */
/**
 * Itemables represents the parsed D_Item*.json file from the data.pak file.
 * @typedef Itemables
 * @type {object}
 * @property {ItemRow[]} Rows
 */
/**
 * ParsedAsset represents the meta information about the parsing and extraction of each of the assets.
 *
 * @typedef ParsedAsset
 * @type {object}
 * @property {string[]} categories,
 * @property {string} name,
 * @property {string} ext,
 * @property {boolean} hasDuplicatedName,
 * @property {boolean} webLocExist,
 * @property {string} uaAssetName,
 * @property {string} uaAssetPath,
 * @property {boolean} uaAssetPathExist,
 * @property {string} fullPathName
 * @property {string|undefined} pathWebRelative
 * @property {boolean|undefined} inItemableFiles
 */

const ITEM_ICONS_UE4_EXPORT_DIR = path.join('Icarus', 'Content', 'Assets', '2DArt', 'UI', 'Items', 'Item_Icons');

/**
 * Since the stat fs function throws, but we really just want to know if the file exist or not,
 * this wraps around the stat file and just return undefined when the stat operation fail.
 *
 * @param {import('node:fs').PathLike} pathLike
 * @returns
 */
async function statOrUndefined(pathLike) {
    try {
        return await stat(pathLike);
    } catch {
        return undefined;
    }
}

/**
 * Executes {@link statOrUndefined} for each item in items, assuming a base directory of the given baseName.
 * Will return the pair of the full name generated from baseName/item for each item with its  'stat' object (or undefined).
 *
 * @param {import('node:fs').PathLike[]} items the file items to stat
 * @param {import('node:fs').PathLike} baseName the base directory of the files to stat
 * @returns {AsyncGenerator<[import('node:fs').PathLike, import('node:fs').Stats]>}
 */
async function* statFileLikeItems(items, baseName) {
    for (const item of items) {
        const fullName = path.join(baseName, item);
        yield [fullName, await statOrUndefined(fullName)];
    }
}

/**
 * Walk the directory tree with the stat of each file.
 * @param {import('node:fs').PathLike} startDir the start directory to recur down
 * @returns {AsyncGenerator<[import('node:fs').PathLike, import('node:fs').Stats]>} an async iterator of each item and stat pair
 */
async function* walk(startDir) {
    const items = await readdir(startDir);
    for await (const [item, itemStat] of statFileLikeItems(items, startDir)) {
        if (itemStat) {
            if (itemStat.isDirectory()) {
                yield* await walk(item);
            } else {
                yield [item, itemStat];
            }
        }
    }
}

/**
 * Parse out meta information about the asset file, that can be used to determine if the asset needs to be updated or not.
 *
 * @param {import('node:fs').PathLike} fullPathName the fullPath to the asset (within the webapp)
 * @param {import('node:fs').PathLike} extractedUeExportDir the directory where the assets were extracted from the game with UeExport (prior to copying to the webapp)
 * @param {boolean} webLocExist if the asset exist already in the webapp asset folder
 *
 * @returns {Promise<ParsedAsset>} a parsed out metadata for the given asset.
 */
async function pathLogic(fullPathName, extractedUeExportDir, webLocExist) {
    /**
     * @type {string[]}
     */
    const splitted = fullPathName.split(path.sep);
    const itemsIconIdx = splitted.indexOf('ItemIcons');
    if (itemsIconIdx < 0) {
        throw new Error('Can not find ItemIcons in path string, unable to parse path');
    }
    // make it relative to ItemsIcons
    splitted.splice(0, itemsIconIdx + 1);
    const categories = splitted.slice(0, splitted.length - 1);
    const parsedPath = path.parse(fullPathName);
    const parsedPathNameSplit = parsedPath.name.split('.');
    const hasDuplicatedName = parsedPathNameSplit.length === 2 && parsedPathNameSplit[0] === parsedPathNameSplit[1];
    const uaAssetName = parsedPath.base;
    const uaAssetPath = path.join(extractedUeExportDir, ITEM_ICONS_UE4_EXPORT_DIR, ...categories, uaAssetName);
    const uaAssetPathExist = !!(await statOrUndefined(uaAssetPath));
    return {
        categories,
        name: parsedPath.name,
        ext: parsedPath.ext,
        hasDuplicatedName,
        webLocExist,
        uaAssetName,
        uaAssetPath,
        uaAssetPathExist,
        fullPathName,
    };
}

/**
 * Resolve Ue4Export `data/` root (export root or nested `data/`).
 * @param {import('node:fs').PathLike} extractedUeExportDir
 * @returns {Promise<string>}
 */
async function resolveExportDataRoot(extractedUeExportDir) {
    const abs = path.resolve(String(extractedUeExportDir));
    const candidates = [
        path.join(abs, 'Traits', 'D_Itemable.json'),
        path.join(abs, 'data', 'Traits', 'D_Itemable.json'),
    ];
    for (const candidate of candidates) {
        if (await statOrUndefined(candidate)) {
            return path.dirname(path.dirname(candidate));
        }
    }
    throw new Error(`Could not find Traits/D_Itemable.json under "${extractedUeExportDir}"`);
}

/**
 * Parse D_Itemable from the Ue4Export data tree (UTF-8).
 * @param {import('node:fs').PathLike} extractedUeExportDir
 * @returns {Promise<Itemables>}
 */
async function parseItemablesFile(extractedUeExportDir) {
    const dataRoot = await resolveExportDataRoot(extractedUeExportDir);
    const itemableJsonFileName = path.join(dataRoot, 'Traits', 'D_Itemable.json');
    return JSON.parse(await readFile(itemableJsonFileName, { encoding: 'utf-8' }));
}

/**
 * This generator iterates over each item in D_Itemable.json and outputs a parse structure for the asset.
 *
 * @param {*} baseWebLoc
 * @param {*} extractedUeExportDir
 * @param {Itemables} itemables
 */
async function* parseIcarusAssetsFromDataFile(baseWebLoc, extractedUeExportDir, itemables) {
    const baseWebItemIconsFolder = path.join(baseWebLoc, 'ItemIcons');

    // Example Icon path: /Game/Assets/2DArt/UI/Items/Item_Icons/Resources/ITEM_Fibre.ITEM_Fibre
    for (const itemable of itemables.Rows) {
        if (!itemable.Icon) {
            continue;
        }
        const splitted = itemable.Icon.split('/');
        const itemsIconIdx = splitted.indexOf('Item_Icons');
        if (itemsIconIdx < 0) {
            continue;
        }
        // make it relative to Item_Icons
        splitted.splice(0, itemsIconIdx + 1);
        // Strip UE4 object reference suffix from filename (e.g. AssetName.ObjectName → AssetName)
        const lastIdx = splitted.length - 1;
        const dotIdx = splitted[lastIdx].lastIndexOf('.');
        if (dotIdx >= 0) {
            splitted[lastIdx] = splitted[lastIdx].substring(0, dotIdx);
        }
        const webPathName = `${path.join(baseWebItemIconsFolder, ...splitted)}.png`;

        yield await pathLogic(webPathName, extractedUeExportDir, !!statOrUndefined(webPathName));
    }
}
/**
 * This looks for assets that is under the web assets folder, that is no longer reference in the Data Json files.
 * This way we can clean up the Icons.
 *
 * @param {import('node:fs').PathLike} baseWebLoc The path to the public folder containing the web assets
 * @param {import('node:fs').PathLike} extractedUeExportDir the path to the extracted assets from the game.
 * @param {Itemables} itemables the parsed Data itemables JSON file.
 *
 * @returns {AsyncGenerator<[ParsedAsset, import('node:fs').Stats]>} iterates over each orphaned asset with its file stat object.
 */
async function* findOrphanedAssets(baseWebLoc, extractedUeExportDir, itemables) {
    const baseWebItemIconsFolder = path.join(baseWebLoc, 'ItemIcons');
    function makeRelative(iconPath, pathName) {
        /**
         * @type {string[]}
         */
        const splitted = iconPath.replaceAll(path.sep, '/').split('/');
        const itemsIconIdx = splitted.indexOf(pathName);
        if (itemsIconIdx < 0) {
            return undefined;
        }
        splitted.splice(0, itemsIconIdx + 1);
        const str = splitted.join(path.sep);
        if (str.endsWith('.png')) {
            return str.substring(0, str.length - '.png'.length);
        }
        // Strip UE4 object reference suffix (e.g. AssetName.ObjectName → AssetName)
        const extIdx = str.lastIndexOf('.');
        if (extIdx >= 0) {
            return str.substring(0, extIdx);
        }
        return str;
    }
    const webRelativeItems = new Set(
        itemables.Rows.map((row) => row.Icon)
            .filter((icon) => !!icon)
            .map((i) => makeRelative(i, 'Item_Icons'))
            .filter((s) => !!s)
    );

    for await (const [iconPath, iconStat] of walk(baseWebItemIconsFolder)) {
        const parsedPath = await pathLogic(iconPath, extractedUeExportDir, !!iconStat);
        const pathWebRelative = makeRelative(parsedPath.fullPathName, 'ItemIcons');
        parsedPath.pathWebRelative = pathWebRelative;
        parsedPath.inItemableFiles = webRelativeItems.has(pathWebRelative);
        if (!parsedPath.uaAssetPathExist || !parsedPath.inItemableFiles) {
            yield [parsedPath, iconStat];
        }
    }
}

/** Legacy raw tables previously copied into public/Data — removed in favor of data-catalog.json. */
const obsoletePublicDataFiles = [
    'D_Itemable.json',
    'D_ItemsStatic.json',
    'D_ItemTemplate.json',
    'D_ProcessorRecipes.json',
];

/**
 * Remove obsolete raw DataTable JSON from public/Data (app loads data-catalog.json only).
 * @param {import('node:fs').PathLike} webPublicData
 */
async function removeObsoletePublicDataFiles(webPublicData) {
    for (const name of obsoletePublicDataFiles) {
        const webFilePath = path.join(webPublicData, name);
        if (await statOrUndefined(webFilePath)) {
            await rm(webFilePath, { force: true });
            console.log(`Removed obsolete ${webFilePath}`);
        }
    }
}

/**
 * Update all of the web app assets with the assets extracted from the game.
 *
 * @param {import('node:fs').PathLike} baseWebLoc the web app public asset directory
 * @param {import('node:fs').PathLike} extractedUeExportDir the base directory of the extracted assets from the game
 */
async function updateGameAssets(baseWebLoc, extractedUeExportDir) {
    const itemables = await parseItemablesFile(extractedUeExportDir);

    const missingAssets = [];
    async function gather() {
        for await (const assetInfo of parseIcarusAssetsFromDataFile(baseWebLoc, extractedUeExportDir, itemables)) {
            if (!assetInfo.uaAssetPathExist) {
                missingAssets.push(assetInfo);
                continue;
            }
            try {
                await copyFile(assetInfo.uaAssetPath, assetInfo.fullPathName);
                await chmod(assetInfo.fullPathName, 0o644);
                console.log(`${assetInfo.uaAssetPath} => ${assetInfo.fullPathName} ${assetInfo.webLocExist ? 'replaced' : 'created'} successfully.`);
            } catch (e) {
                console.warn(`ERROR: ${assetInfo.uaAssetPath} => ${assetInfo.fullPathName} failed to copy`, e.message);
            }
        }
    }
    await gather();
    if (missingAssets.length) {
        console.log('Can not find these assets in the extracted assets directory\n', missingAssets.map((a) => JSON.stringify(a)).join('\n'));
    }
    let logger = (...args) => {
        console.log('Orphaned Assets');
        console.log(
            '****** These are assets in the web IconItems folder, that either does not exist in the extracted assets folder,\n',
            'or is not referenced by Traits/D_Itemable.json in the export.'
        );
        console.log(...args);
        logger = console.log;
    };
    for await (const orphanedAsset of findOrphanedAssets(baseWebLoc, extractedUeExportDir, itemables)) {
        logger(orphanedAsset[0].name);
        await rm(orphanedAsset[0].fullPathName, { force: true });
    }
}

/**
 * Main entry point of the script.  This script is expected to be ran from the scripts folder.
 */
async function main() {
    const baseWebLoc = path.join('public', 'icarus-game');
    if (!statOrUndefined(baseWebLoc)) {
        console.error('ERROR: Unable to find public/icarus-game');
        process.exit(1);
    }

    if (process.argv.length < 3) {
        console.error(`USAGE: ${process.argv[0]} ${process.argv[1]} Ue4ExportDir`);
        process.exit(1);
    }
    const extractedUeExportDir = await realpath(process.argv[2]);
    console.log('Export dir: ', extractedUeExportDir);
    if (!statOrUndefined(extractedUeExportDir)) {
        console.error('ERROR: Unable to find export directory.');
        process.exit(1);
    }

    console.log('Removing obsolete raw DataTable JSON from public/icarus-game/Data');
    await removeObsoletePublicDataFiles(path.join(baseWebLoc, 'Data'));

    console.log('Updating web game assets (ItemIcons)');
    await updateGameAssets(baseWebLoc, extractedUeExportDir);

    console.log('Syncing game version.json');
    await syncVersionJson(extractedUeExportDir);

    console.log('Remember: yarn build-data-catalog <exportRoot> to refresh data/icarus-game/data-catalog.json');
}

/**
 * Copy install version.json from the export root into data/ (git) and public/ (deploy).
 * @param {import('node:fs').PathLike} extractedUeExportDir
 */
async function syncVersionJson(extractedUeExportDir) {
    const src = path.join(extractedUeExportDir, 'version.json');
    if (!(await statOrUndefined(src))) {
        console.warn(`WARNING: No version.json in export (${src}). Run export.bat to copy Icarus/Config/version.json.`);
        return;
    }
    const dataDest = path.join('data', 'icarus-game', 'version.json');
    const publicDest = path.join('public', 'icarus-game', 'Data', 'version.json');
    await syncStampedVersionJson(src, [dataDest, publicDest]);
    console.log(`${src} => ${dataDest}`);
    console.log(`${src} => ${publicDest}`);
}

await main();
