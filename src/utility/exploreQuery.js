/**
 * Serialize / hydrate Explore page filters into Vue Router query params.
 * Omits keys that match defaults so shared URLs stay compact.
 * Does not touch `item` — that belongs to the item-detail modal.
 */

const ALL_SOURCES = ['craft', 'gather', 'mission', 'shop', 'workshop'];
const ALL_CATEGORIES = ['food', 'medicine'];
const DEFAULT_TIER = [0, 5];
const VALID_SORT = new Set(['name', 'foodDesc', 'waterDesc', 'durationDesc', 'tierAsc']);

export const createDefaultExploreFilters = () => ({
    search: '',
    categories: { food: true, medicine: true },
    sources: { craft: true, gather: true, mission: true, shop: true, workshop: true },
    tier: [...DEFAULT_TIER],
    food: [0, 400],
    water: [0, 400],
    duration: [0, 400],
    buffKeys: [],
    buffLimits: {},
    buffMatchMode: 'and',
    hasBuffOnly: false,
    hasNegativeOnly: false,
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

const parseBuffLimits = (raw) => {
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

const serializeBuffLimits = (buffLimits, buffKeys, getBounds) => {
    const parts = [];
    for (const key of buffKeys) {
        const range = buffLimits[key];
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
 * @param {{ min: number, max: number }} options.foodBounds
 * @param {{ min: number, max: number }} options.waterBounds
 * @param {{ min: number, max: number }} options.durationBounds
 * @param {(key: string) => { min: number, max: number }} [options.getBuffBounds]
 * @param {string|null} [options.itemId] preserved `item` query
 */
export function exploreStateToQuery({
    filters,
    sortBy,
    viewMode,
    foodBounds,
    waterBounds,
    durationBounds,
    getBuffBounds,
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

    if (!rangesEqual(filters.tier, DEFAULT_TIER)) {
        query.tier = `${filters.tier[0]}-${filters.tier[1]}`;
    }
    if (foodBounds && !rangesEqual(filters.food, [foodBounds.min, foodBounds.max])) {
        query.food = `${filters.food[0]}-${filters.food[1]}`;
    }
    if (waterBounds && !rangesEqual(filters.water, [waterBounds.min, waterBounds.max])) {
        query.water = `${filters.water[0]}-${filters.water[1]}`;
    }
    if (durationBounds && !rangesEqual(filters.duration, [durationBounds.min, durationBounds.max])) {
        query.duration = `${filters.duration[0]}-${filters.duration[1]}`;
    }

    if (filters.buffKeys?.length) {
        query.buff = filters.buffKeys.join(',');
    }
    if (filters.buffMatchMode === 'or') {
        query.buffMode = 'or';
    }
    const bl = serializeBuffLimits(filters.buffLimits || {}, filters.buffKeys || [], getBuffBounds);
    if (bl) query.bl = bl;

    if (filters.hasBuffOnly) query.hasBuff = '1';
    if (filters.hasNegativeOnly) query.neg = '1';
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
export function queryToExploreState(query, { foodBounds, waterBounds, durationBounds } = {}) {
    const filters = createDefaultExploreFilters();
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

    if (queryString(query, 'tier')) {
        filters.tier = parseRange(queryString(query, 'tier'), DEFAULT_TIER);
        rangeKeysFromQuery.add('tier');
    }

    const foodFallback = foodBounds ? [foodBounds.min, foodBounds.max] : filters.food;
    if (queryString(query, 'food')) {
        filters.food = parseRange(queryString(query, 'food'), foodFallback);
        rangeKeysFromQuery.add('food');
    } else if (foodBounds) {
        filters.food = [foodBounds.min, foodBounds.max];
    }

    const waterFallback = waterBounds ? [waterBounds.min, waterBounds.max] : filters.water;
    if (queryString(query, 'water')) {
        filters.water = parseRange(queryString(query, 'water'), waterFallback);
        rangeKeysFromQuery.add('water');
    } else if (waterBounds) {
        filters.water = [waterBounds.min, waterBounds.max];
    }

    const durationFallback = durationBounds ? [durationBounds.min, durationBounds.max] : filters.duration;
    if (queryString(query, 'duration')) {
        filters.duration = parseRange(queryString(query, 'duration'), durationFallback);
        rangeKeysFromQuery.add('duration');
    } else if (durationBounds) {
        filters.duration = [durationBounds.min, durationBounds.max];
    }

    const buffRaw = queryString(query, 'buff');
    if (buffRaw) {
        filters.buffKeys = buffRaw.split(',').filter(Boolean);
    }
    if (queryString(query, 'buffMode') === 'or') {
        filters.buffMatchMode = 'or';
    }
    filters.buffLimits = parseBuffLimits(queryString(query, 'bl'));

    filters.hasBuffOnly = queryString(query, 'hasBuff') === '1';
    filters.hasNegativeOnly = queryString(query, 'neg') === '1';
    filters.favoritesOnly = queryString(query, 'fav') === '1';

    const sortRaw = queryString(query, 'sort');
    const sortBy = VALID_SORT.has(sortRaw) ? sortRaw : 'name';
    const viewRaw = queryString(query, 'view');
    const viewMode = viewRaw === 'table' ? 'table' : 'cards';

    return { filters, sortBy, viewMode, rangeKeysFromQuery };
}

/** Stable compare of explore query objects (ignores key order). */
export function exploreQueriesEqual(a, b) {
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
