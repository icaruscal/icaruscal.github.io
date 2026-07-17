/**
 * Serialize / hydrate Gear Explore page filters into Vue Router query params.
 * Omits keys that match defaults so shared URLs stay compact.
 * Does not touch `item` — that belongs to the item-detail modal.
 */

const ALL_CATEGORIES = ['armor', 'weapon', 'tool', 'ammo', 'attachment', 'module'];
const ALL_SOURCES = ['craft', 'gather', 'mission', 'shop', 'workshop'];
const DEFAULT_TIER = [0, 5];
const VALID_SORT = new Set(['name', 'tierAsc', 'physDesc', 'meleeDesc', 'multDesc']);

export const createDefaultGearFilters = () => ({
    search: '',
    categories: { armor: true, weapon: true, tool: true, ammo: true, attachment: true, module: true },
    sources: { craft: true, gather: true, mission: true, shop: true, workshop: true },
    /** Selected armour slots; empty = any. */
    slots: [],
    /** Selected armour set ids; empty = any. */
    sets: [],
    tier: [...DEFAULT_TIER],
    phys: [0, 100],
    melee: [0, 200],
    mult: [0, 5],
    statKeys: [],
    statLimits: {},
    statMatchMode: 'and',
    favoritesOnly: false,
});

const queryString = (query, key) => {
    const value = query[key];
    if (Array.isArray(value)) return value[0] || '';
    return value == null ? '' : String(value);
};

const parseRange = (raw, fallback) => {
    const fallbackRange = fallback ? [...fallback] : null;
    if (!raw) return fallbackRange;
    const match = String(raw).match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
    if (!match) return fallbackRange;
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (Number.isNaN(min) || Number.isNaN(max)) return fallbackRange;
    return [Math.min(min, max), Math.max(min, max)];
};

const rangesEqual = (a, b) => a?.[0] === b?.[0] && a?.[1] === b?.[1];

const parseStatLimits = (raw) => {
    const limits = {};
    if (!raw) return limits;
    for (const part of String(raw).split(',')) {
        if (!part) continue;
        const colon = part.indexOf(':');
        if (colon <= 0) continue;
        const key = part.slice(0, colon);
        const range = parseRange(part.slice(colon + 1), [0, 0]);
        if (range && key) limits[key] = range;
    }
    return limits;
};

const serializeStatLimits = (statLimits, statKeys, getBounds) => {
    const parts = [];
    for (const key of statKeys) {
        const range = statLimits[key];
        if (!range || range.length !== 2) continue;
        const bounds = getBounds?.(key);
        if (bounds && rangesEqual(range, [bounds.min, bounds.max])) continue;
        parts.push(`${key}:${range[0]}-${range[1]}`);
    }
    return parts.length ? parts.join(',') : undefined;
};

/**
 * @param {object} options
 * @param {object} options.filters
 * @param {string} options.sortBy
 * @param {string} options.viewMode
 * @param {{ min: number, max: number }} options.physBounds
 * @param {{ min: number, max: number }} options.meleeBounds
 * @param {{ min: number, max: number }} options.multBounds
 * @param {(key: string) => { min: number, max: number }} [options.getStatBounds]
 * @param {string|null} [options.itemId] preserved `item` query
 */
export function gearStateToQuery({
    filters,
    sortBy,
    viewMode,
    physBounds,
    meleeBounds,
    multBounds,
    getStatBounds,
    itemId,
}) {
    const query = {};

    const search = (filters.search || '').trim();
    if (search) query.q = search;

    const catsOn = ALL_CATEGORIES.filter((key) => filters.categories?.[key]);
    if (catsOn.length > 0 && catsOn.length < ALL_CATEGORIES.length) {
        query.cat = catsOn.join(',');
    }

    const srcOn = ALL_SOURCES.filter((key) => filters.sources?.[key]);
    if (srcOn.length > 0 && srcOn.length < ALL_SOURCES.length) {
        query.src = srcOn.join(',');
    }

    if (filters.slots?.length) query.slot = filters.slots.join(',');
    if (filters.sets?.length) query.set = filters.sets.join(',');

    if (!rangesEqual(filters.tier, DEFAULT_TIER)) {
        query.tier = `${filters.tier[0]}-${filters.tier[1]}`;
    }
    if (physBounds && !rangesEqual(filters.phys, [physBounds.min, physBounds.max])) {
        query.phys = `${filters.phys[0]}-${filters.phys[1]}`;
    }
    if (meleeBounds && !rangesEqual(filters.melee, [meleeBounds.min, meleeBounds.max])) {
        query.melee = `${filters.melee[0]}-${filters.melee[1]}`;
    }
    if (multBounds && !rangesEqual(filters.mult, [multBounds.min, multBounds.max])) {
        query.mult = `${filters.mult[0]}-${filters.mult[1]}`;
    }

    if (filters.statKeys?.length) {
        query.stat = filters.statKeys.join(',');
    }
    if (filters.statMatchMode === 'or') {
        query.statMode = 'or';
    }
    const sl = serializeStatLimits(filters.statLimits || {}, filters.statKeys || [], getStatBounds);
    if (sl) query.sl = sl;

    if (filters.favoritesOnly) query.fav = '1';

    if (sortBy && sortBy !== 'name' && VALID_SORT.has(sortBy)) {
        query.sort = sortBy;
    }
    if (viewMode && viewMode !== 'cards') {
        query.view = viewMode;
    }

    if (itemId) {
        query.item = itemId;
    }

    return query;
}

/**
 * @returns {{ filters: object, sortBy: string, viewMode: string, rangeKeysFromQuery: Set<string> }}
 */
export function queryToGearState(query, { physBounds, meleeBounds, multBounds } = {}) {
    const filters = createDefaultGearFilters();
    const rangeKeysFromQuery = new Set();

    filters.search = queryString(query, 'q');

    const catRaw = queryString(query, 'cat');
    if (catRaw) {
        const selected = new Set(catRaw.split(',').filter(Boolean));
        for (const key of ALL_CATEGORIES) {
            filters.categories[key] = selected.has(key);
        }
    }

    const srcRaw = queryString(query, 'src');
    if (srcRaw) {
        const selected = new Set(srcRaw.split(',').filter(Boolean));
        for (const key of ALL_SOURCES) {
            filters.sources[key] = selected.has(key);
        }
    }

    const slotRaw = queryString(query, 'slot');
    if (slotRaw) {
        filters.slots = slotRaw.split(',').filter(Boolean);
    }
    const setRaw = queryString(query, 'set');
    if (setRaw) {
        filters.sets = setRaw.split(',').filter(Boolean);
    }

    if (queryString(query, 'tier')) {
        filters.tier = parseRange(queryString(query, 'tier'), DEFAULT_TIER);
        rangeKeysFromQuery.add('tier');
    }

    const physFallback = physBounds ? [physBounds.min, physBounds.max] : filters.phys;
    if (queryString(query, 'phys')) {
        filters.phys = parseRange(queryString(query, 'phys'), physFallback);
        rangeKeysFromQuery.add('phys');
    } else if (physBounds) {
        filters.phys = [physBounds.min, physBounds.max];
    }

    const meleeFallback = meleeBounds ? [meleeBounds.min, meleeBounds.max] : filters.melee;
    if (queryString(query, 'melee')) {
        filters.melee = parseRange(queryString(query, 'melee'), meleeFallback);
        rangeKeysFromQuery.add('melee');
    } else if (meleeBounds) {
        filters.melee = [meleeBounds.min, meleeBounds.max];
    }

    const multFallback = multBounds ? [multBounds.min, multBounds.max] : filters.mult;
    if (queryString(query, 'mult')) {
        filters.mult = parseRange(queryString(query, 'mult'), multFallback);
        rangeKeysFromQuery.add('mult');
    } else if (multBounds) {
        filters.mult = [multBounds.min, multBounds.max];
    }

    const statRaw = queryString(query, 'stat');
    if (statRaw) {
        filters.statKeys = statRaw.split(',').filter(Boolean);
    }
    if (queryString(query, 'statMode') === 'or') {
        filters.statMatchMode = 'or';
    }
    filters.statLimits = parseStatLimits(queryString(query, 'sl'));

    filters.favoritesOnly = queryString(query, 'fav') === '1';

    const sortRaw = queryString(query, 'sort');
    const sortBy = VALID_SORT.has(sortRaw) ? sortRaw : 'name';
    const viewRaw = queryString(query, 'view');
    const viewMode = viewRaw === 'table' ? 'table' : 'cards';

    return { filters, sortBy, viewMode, rangeKeysFromQuery };
}

/** Stable compare of gear query objects (ignores key order). */
export function gearQueriesEqual(a, b) {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of keys) {
        const left = a?.[key];
        const right = b?.[key];
        const leftVal = Array.isArray(left) ? left[0] : left;
        const rightVal = Array.isArray(right) ? right[0] : right;
        if (String(leftVal ?? '') !== String(rightVal ?? '')) return false;
    }
    return true;
}
