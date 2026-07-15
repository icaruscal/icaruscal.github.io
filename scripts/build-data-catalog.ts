/**
 * Combine Icarus Ue4Export data into a single data catalog JSON
 * shaped for the crafting calculator (and rich item browsing).
 *
 * Usage:
 *   yarn build-data-catalog <exportPath> [prettyOutFile]
 *
 * exportPath may be the Ue4Export root (containing `data/`) or the `data/` dir itself.
 *
 * Always writes:
 *   - Pretty (dev / git):  data/icarus-game/data-catalog.json  (or prettyOutFile)
 *   - Minified (deploy):   public/icarus-game/Data/data-catalog.json
 *
 * Output shape (compact — same key names, sparse omit null/[]):
 *   - recipes[]     craft fields + stats/tier; display via items[staticItemName]
 *   - items{}       displayName / description / iconPath / recipeIds
 *   - stations{}    displayName / recipeSetDisplayName / iconPath / craftRecipeId
 *
 * Not shipped: raw Unreal `icon`, `lookup`, `reviewQueue` (rebuild from items.recipeIds / flags).
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { stampExtractedAt } from './version-json.mjs';

type RowRef = { RowName?: string; DataTableName?: string };
type DataTable<T extends { Name: string }> = { Rows?: T[]; Defaults?: Record<string, unknown> };

type RecipeRow = {
    Name: string;
    Requirement?: RowRef;
    RecipeSets?: RowRef[];
    Inputs?: Array<{ Element?: RowRef; Count?: number }>;
    /** Pipe/fuel fluids (Water, Biofuel, …) — not D_ItemsStatic rows. */
    ResourceInputs?: Array<{ Type?: { Value?: string }; RequiredUnits?: number }>;
    Outputs?: Array<{ Element?: RowRef; Count?: number }>;
    bForceDisableRecipe?: boolean;
};

type ItemTemplateRow = { Name: string; ItemStaticData?: RowRef };
type ItemsStaticRow = {
    Name: string;
    Itemable?: RowRef;
    Consumable?: RowRef;
    Equippable?: RowRef;
    Processing?: RowRef;
    Deployable?: RowRef;
    Manual_Tags?: { GameplayTags?: Array<{ TagName?: string }> };
};
type ProcessingRow = {
    Name: string;
    DefaultRecipeSet?: RowRef;
};
type ItemableRow = {
    Name: string;
    DisplayName?: string;
    Description?: string;
    Icon?: string;
};
type ConsumableRow = {
    Name: string;
    Stats?: Record<string, number>;
    Modifier?: {
        Modifier?: RowRef;
        ModifierLifetime?: number;
        ModifierEffectiveness?: number;
    };
};
type ModifierRow = {
    Name: string;
    ModifierName?: string;
    ModifierDescription?: string;
    GrantedStats?: Record<string, number>;
};
type EquippableRow = {
    Name: string;
    GrantedStats?: Record<string, number>;
    GlobalStat_GrantedStats?: Record<string, number>;
};
type StatRow = {
    Name: string;
    PositiveDescription?: string;
    NegativeDescription?: string;
};
type TalentRow = {
    Name: string;
    TalentTree?: RowRef;
    RequiredTalents?: RowRef[];
    RequiredLevel?: number;
    bDefaultUnlocked?: boolean;
};
type WorkshopCostEntry = { Meta?: RowRef; Amount?: number };
type WorkshopItemRow = {
    Name: string;
    Item?: RowRef;
    ResearchCost?: WorkshopCostEntry[];
    ReplicationCost?: WorkshopCostEntry[];
    RequiredMission?: RowRef;
};
type MetaCurrencyRow = {
    Name: string;
    DisplayName?: string;
    ItemStaticData?: RowRef;
};
type RecipeSetRow = {
    Name: string;
    RecipeSetName?: string;
    DisplayText?: string;
    RecipeSetIcon?: string;
};

type Flag =
    | 'missing_output_template'
    | 'missing_static_item'
    | 'missing_itemable'
    | 'missing_consumable_row'
    | 'missing_modifier_row'
    | 'missing_requirement_talent'
    | 'missing_station_talent'
    | 'tier_unknown'
    | 'multi_station_tiers'
    | 'partial_station_tier_gaps'
    | 'no_granted_stats'
    | 'recipe_disabled'
    | 'unknown_stat_key'
    | 'non_blueprint_talent_tree'
    | 'unknown_currency'
    | 'shop_price_missing';

type ResolvedStat = {
    key: string;
    value: number;
    display: string | null;
};

type TierInfo = {
    value: number | null;
    method: 'recipe_requirement' | 'station_deduced' | 'default_unlocked' | 'purchase_only' | 'unknown';
    talentName: string | null;
    talentTree: string | null;
    stationSources: Array<{ station: string; tier: number | null; talentName: string | null }>;
};

type PurchaseCost = { currency: string; currencyDisplay: string | null; amount: number };
type PurchaseInfo = {
    shop?: { station: string; costs: PurchaseCost[] };
    workshop?: {
        workshopEntry: string;
        researchCost: PurchaseCost[];
        replicationCost: PurchaseCost[];
        requiredMission: string | null;
    };
};

type CatalogIngredient = {
    id: string;
    count: number;
    table: string | null;
};

/** One recipe output (primary is also mirrored on templateName / staticItemName / outputCount). */
type CatalogOutput = {
    /** D_ItemsStatic id when resolvable; otherwise template name. */
    id: string;
    templateName: string;
    count: number;
};

type CatalogModifier = {
    name: string | null;
    displayName: string | null;
    description: string | null;
    lifetimeSeconds: number | null;
    grantedStats: ResolvedStat[];
};

/** Internal recipe row (display fields used while building; omitted from emit when on items). */
type CatalogRecipe = {
    id: string;
    acquisition: 'craft' | 'shop' | 'workshop' | 'gather' | 'mission';
    purchase: PurchaseInfo | null;
    templateName: string | null;
    staticItemName: string | null;
    displayName: string | null;
    description: string | null;
    /** Path relative to ItemIcons/, with UE asset suffix stripped (ready for UI). */
    iconPath: string | null;
    stations: string[];
    ingredients: CatalogIngredient[];
    /** All Outputs; omitted from emit when length ≤ 1 (use staticItemName / outputCount). */
    outputs: CatalogOutput[];
    outputCount: number;
    consumableName: string | null;
    instantStats: ResolvedStat[];
    modifier: CatalogModifier | null;
    equipGrantedStats: ResolvedStat[];
    /** Faction / mission reward item (D_ItemsStatic Manual_Tags FactionMission.*). */
    mission?: boolean;
    tier: TierInfo;
    flags: Flag[];
};

/** Display record for a D_ItemsStatic row referenced by recipes / materials. */
type CatalogItem = {
    id: string;
    displayName: string | null;
    description: string | null;
    iconPath: string | null;
    /** Craft recipe ids that produce this static item (absent/empty = raw / gather-only). */
    recipeIds: string[];
    /**
     * World-gather primary material (from D_ItemsStatic Manual_Tags Item.Resource.Ore* / similar).
     * Tree recursion stops here even when recipeIds lists conversion recipes (Quarrite → Ore, etc.).
     */
    gatherFirst?: boolean;
    /** Faction / mission reward item (Manual_Tags FactionMission.*). */
    mission?: boolean;
};

/** Crafting station (D_RecipeSets) with UI labels/icons. */
type CatalogStation = {
    id: string;
    displayName: string | null;
    recipeSetDisplayName: string | null;
    iconPath: string | null;
    /** Recipe id to craft this station deployable, if any. */
    craftRecipeId: string | null;
};

type TalentTierResult = {
    tier: number | null;
    talentName: string | null;
    talentTree: string | null;
    method: TierInfo['method'];
    flags: Flag[];
};

const REVIEW_FLAGS = new Set<Flag>([
    'missing_output_template',
    'missing_static_item',
    'missing_itemable',
    'missing_consumable_row',
    'missing_modifier_row',
    'missing_requirement_talent',
    'missing_station_talent',
    'tier_unknown',
    'partial_station_tier_gaps',
    'recipe_disabled',
    'unknown_stat_key',
    'non_blueprint_talent_tree',
]);

const STATION_NOISE_FLAGS = new Set<Flag>([
    'tier_unknown',
    'missing_station_talent',
    'missing_requirement_talent',
    'non_blueprint_talent_tree',
]);

const ITEM_ICON_PREFIX = '/Game/Assets/2DArt/UI/Items/Item_Icons/';

function die(message: string): never {
    console.error(message);
    process.exit(1);
}

function parseNsLocText(value: string | undefined | null): string | null {
    if (!value) return null;
    const nsloc = value.match(
        /NSLOCTEXT\(\s*"(?:\\.|[^"\\])*"\s*,\s*"(?:\\.|[^"\\])*"\s*,\s*"((?:\\.|[^"\\])*)"\s*\)/
    );
    const inv = nsloc ? null : value.match(/INVTEXT\(\s*"((?:\\.|[^"\\])*)"\s*\)/);
    const raw = nsloc?.[1] ?? inv?.[1] ?? value;
    return raw
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/^\[DNT\]\s*/, '');
}

function parseStatKey(rawKey: string): string {
    const match = rawKey.match(/Value\s*=\s*\\?"([^"\\]+)\\?"/);
    return match?.[1] ?? rawKey;
}

function formatStatDisplay(stat: StatRow | undefined, value: number): string | null {
    if (!stat) return null;
    const template = value < 0 ? stat.NegativeDescription ?? stat.PositiveDescription : stat.PositiveDescription;
    const text = parseNsLocText(template);
    if (!text) return null;
    return text.replace(/\{0\}/g, String(Math.abs(value)));
}

/**
 * Manual_Tags that mean "primarily mined/gathered in the world".
 * Excludes refined types (Ingot) and the bare Item.Resource catch-all.
 * Examples: Item.Resource.Ore.Oxite, Item.Resource.Wood, Item.Resource.Stone.
 */
const GATHER_FIRST_TAG_RE = /^Item\.Resource\.(Ore|Wood|Fiber|Stone|Stick|Leather|Bone|Fur|Ice)(\.|$)/;

function isGatherFirstFromTags(tags: string[]): boolean {
    return tags.some((tag) => GATHER_FIRST_TAG_RE.test(tag));
}

/** Mission / faction reward items (Manual_Tags FactionMission.Item / FactionMission.Item.*). */
function isMissionFromTags(tags: string[]): boolean {
    return tags.some((tag) => tag === 'FactionMission.Item' || tag.startsWith('FactionMission.Item.'));
}

function manualTagNames(row: ItemsStaticRow | undefined): string[] {
    return (row?.Manual_Tags?.GameplayTags ?? [])
        .map((t) => t.TagName)
        .filter((name): name is string => Boolean(name));
}

/** Strip Unreal Item_Icons prefix and ".AssetName" suffix → path under public ItemIcons/. */
function toIconPath(icon: string | null | undefined): string | null {
    if (!icon) return null;
    let relative = icon;
    if (relative.startsWith(ITEM_ICON_PREFIX)) {
        relative = relative.slice(ITEM_ICON_PREFIX.length);
    } else if (relative.startsWith('/Game/')) {
        // Non-item UI icons (e.g. Character crafting) — not served from ItemIcons.
        return null;
    }
    if (relative.includes('.')) {
        relative = relative.split('.')[0] ?? relative;
    }
    return relative || null;
}

/** Deep-omit null / undefined / empty arrays (and objects left empty after omit). Keys unchanged when kept. */
function omitEmpty(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) {
        if (value.length === 0) return undefined;
        return value.map((entry) => {
            const next = omitEmpty(entry);
            return next === undefined ? null : next;
        });
    }
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            const next = omitEmpty(child);
            if (next === undefined) continue;
            out[key] = next;
        }
        return Object.keys(out).length === 0 ? undefined : out;
    }
    return value;
}

function emitObject<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
    return (omitEmpty(value) as Record<string, unknown>) ?? {};
}

/** Recipe emit: display lives on items[staticItemName] when present; keep overrides / orphans on the recipe. */
function emitRecipe(recipe: CatalogRecipe, items: Record<string, CatalogItem>): Record<string, unknown> {
    const item = recipe.staticItemName ? items[recipe.staticItemName] : undefined;
    const row: Record<string, unknown> = {
        id: recipe.id,
        acquisition: recipe.acquisition,
        purchase: recipe.purchase,
        templateName: recipe.templateName,
        staticItemName: recipe.staticItemName,
        stations: recipe.stations,
        ingredients: recipe.ingredients,
        // Only emit when multi-output — single-output is staticItemName + outputCount.
        outputs: recipe.outputs.length > 1 ? recipe.outputs : undefined,
        outputCount: recipe.outputCount,
        consumableName: recipe.consumableName,
        instantStats: recipe.instantStats,
        modifier: recipe.modifier,
        equipGrantedStats: recipe.equipGrantedStats,
        mission: recipe.mission || undefined,
        tier: recipe.tier,
        flags: recipe.flags,
    };
    if (!item) {
        row.displayName = recipe.displayName;
        row.description = recipe.description;
        row.iconPath = recipe.iconPath;
    } else {
        if (recipe.displayName !== item.displayName) row.displayName = recipe.displayName;
        if (recipe.description !== item.description) row.description = recipe.description;
        if (recipe.iconPath !== item.iconPath) row.iconPath = recipe.iconPath;
    }
    return emitObject(row);
}

function indexByName<T extends { Name: string }>(table: DataTable<T> | undefined): Map<string, T> {
    const map = new Map<string, T>();
    for (const row of table?.Rows ?? []) {
        map.set(row.Name, row);
    }
    return map;
}

/** Exact match first, then case-insensitive (export ids sometimes mismatch casing). */
function lookupByName<T extends { Name: string }>(map: Map<string, T>, name: string | null | undefined): T | undefined {
    if (!name) return undefined;
    const exact = map.get(name);
    if (exact) return exact;
    const lower = name.toLowerCase();
    for (const [key, value] of map) {
        if (key.toLowerCase() === lower) return value;
    }
    return undefined;
}

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolveDataRoot(exportPath: string): Promise<string> {
    const abs = path.resolve(exportPath);
    const direct = path.join(abs, 'Crafting', 'D_ProcessorRecipes.json');
    const nested = path.join(abs, 'data', 'Crafting', 'D_ProcessorRecipes.json');
    if (await exists(direct)) return abs;
    if (await exists(nested)) return path.join(abs, 'data');
    die(`Could not find game data under "${exportPath}". Expected .../Crafting/D_ProcessorRecipes.json`);
}

function parseBlueprintTier(treeName: string | undefined | null): number | null {
    if (!treeName) return null;
    const match = treeName.match(/^Blueprint_T(\d+)_/i);
    if (!match) return null;
    return Number(match[1]);
}

function resolveStats(
    raw: Record<string, number> | undefined,
    statsByName: Map<string, StatRow>,
    flags: Flag[]
): ResolvedStat[] {
    if (!raw) return [];
    const resolved: ResolvedStat[] = [];
    for (const [rawKey, value] of Object.entries(raw)) {
        const key = parseStatKey(rawKey);
        const stat = statsByName.get(key);
        if (!stat) flags.push('unknown_stat_key');
        resolved.push({
            key,
            value,
            display: formatStatDisplay(stat, value),
        });
    }
    return resolved;
}

function uniqueFlags(flags: Flag[]): Flag[] {
    return [...new Set(flags)];
}

function stationNames(recipe: RecipeRow): string[] {
    return (recipe.RecipeSets ?? [])
        .map((s) => s.RowName)
        .filter((name): name is string => Boolean(name) && name !== 'None');
}

async function main(): Promise<void> {
    const exportArg = process.argv[2];
    if (!exportArg) {
        die('Usage: yarn build-data-catalog <exportPath> [prettyOutFile]');
    }
    const outArg = process.argv[3];
    const dataRoot = await resolveDataRoot(exportArg);

    const load = async <T>(relative: string): Promise<T> => {
        const full = path.join(dataRoot, relative);
        if (!(await exists(full))) die(`Missing required file: ${full}`);
        return JSON.parse(await fs.readFile(full, 'utf8')) as T;
    };

    const loadOptional = async <T>(relative: string): Promise<T | null> => {
        const full = path.join(dataRoot, relative);
        if (!(await exists(full))) return null;
        return JSON.parse(await fs.readFile(full, 'utf8')) as T;
    };

    const [
        recipesTable,
        templatesTable,
        staticTable,
        itemableTable,
        consumableTable,
        modifierTable,
        equippableTable,
        statsTable,
        talentsTable,
        workshopTable,
        currencyTable,
        recipeSetsTable,
        processingTable,
    ] = await Promise.all([
        load<DataTable<RecipeRow>>('Crafting/D_ProcessorRecipes.json'),
        load<DataTable<ItemTemplateRow>>('Items/D_ItemTemplate.json'),
        load<DataTable<ItemsStaticRow>>('Items/D_ItemsStatic.json'),
        load<DataTable<ItemableRow>>('Traits/D_Itemable.json'),
        load<DataTable<ConsumableRow>>('Traits/D_Consumable.json'),
        load<DataTable<ModifierRow>>('Modifiers/D_ModifierStates.json'),
        load<DataTable<EquippableRow>>('Traits/D_Equippable.json'),
        load<DataTable<StatRow>>('Stats/D_Stats.json'),
        load<DataTable<TalentRow>>('Talents/D_Talents.json'),
        load<DataTable<WorkshopItemRow>>('MetaWorkshop/D_WorkshopItems.json'),
        load<DataTable<MetaCurrencyRow>>('Currency/D_MetaCurrency.json'),
        loadOptional<DataTable<RecipeSetRow>>('Crafting/D_RecipeSets.json'),
        loadOptional<DataTable<ProcessingRow>>('Traits/D_Processing.json'),
    ] as const);

    const recipes = recipesTable.Rows ?? [];
    const templatesByName = indexByName(templatesTable);
    const staticByName = indexByName(staticTable);
    const itemableByName = indexByName(itemableTable);
    const consumableByName = indexByName(consumableTable);
    const modifierByName = indexByName(modifierTable);
    const equippableByName = indexByName(equippableTable);
    const statsByName = indexByName(statsTable);
    const talentsByName = indexByName(talentsTable);
    const currencyByName = indexByName(currencyTable);
    const recipeSetsByName = indexByName(recipeSetsTable ?? undefined);
    const talentsByNameLower = new Map<string, TalentRow>();
    for (const [name, row] of talentsByName) {
        talentsByNameLower.set(name.toLowerCase(), row);
    }

    const recipesByName = new Map<string, RecipeRow>();
    const recipesByNameLower = new Map<string, RecipeRow>();
    for (const recipe of recipes) {
        recipesByName.set(recipe.Name, recipe);
        recipesByNameLower.set(recipe.Name.toLowerCase(), recipe);
    }

    const stationTierCache = new Map<string, TalentTierResult>();

    function findTalent(name: string | undefined | null): TalentRow | undefined {
        if (!name || name === 'None') return undefined;
        return talentsByName.get(name) ?? talentsByNameLower.get(name.toLowerCase());
    }

    function findRecipe(name: string | undefined | null): RecipeRow | undefined {
        if (!name || name === 'None') return undefined;
        return recipesByName.get(name) ?? recipesByNameLower.get(name.toLowerCase());
    }

    function tierFromTalent(talentName: string | undefined | null): TalentTierResult {
        if (!talentName || talentName === 'None') {
            return { tier: null, talentName: null, talentTree: null, method: 'unknown', flags: ['tier_unknown'] };
        }

        const talent = findTalent(talentName);
        if (!talent) {
            return {
                tier: null,
                talentName,
                talentTree: null,
                method: 'unknown',
                flags: ['missing_requirement_talent', 'tier_unknown'],
            };
        }

        const tree = talent.TalentTree?.RowName ?? null;
        const tier = parseBlueprintTier(tree);
        const flags: Flag[] = [];

        if (tree && tier == null) flags.push('non_blueprint_talent_tree');

        if (tier != null) {
            return { tier, talentName: talent.Name, talentTree: tree, method: 'recipe_requirement', flags };
        }

        if (talent.bDefaultUnlocked) {
            return { tier: 0, talentName: talent.Name, talentTree: tree, method: 'default_unlocked', flags };
        }

        flags.push('tier_unknown');
        return { tier: null, talentName: talent.Name, talentTree: tree, method: 'unknown', flags };
    }

    function resolveStationTier(station: string): TalentTierResult {
        const cached = stationTierCache.get(station);
        if (cached) return cached;

        const stationTalent = findTalent(station);
        if (stationTalent) {
            const fromTalent = tierFromTalent(stationTalent.Name);
            const result: TalentTierResult = {
                ...fromTalent,
                method: fromTalent.tier != null || fromTalent.method === 'default_unlocked' ? 'station_deduced' : 'unknown',
                flags: fromTalent.flags.map((flag) =>
                    flag === 'missing_requirement_talent' ? 'missing_station_talent' : flag
                ),
            };
            if (result.tier == null && result.method !== 'default_unlocked') {
                result.flags = uniqueFlags([...result.flags, 'missing_station_talent']);
            }
            stationTierCache.set(station, result);
            return result;
        }

        const stationRecipe = findRecipe(station);
        const req = stationRecipe?.Requirement?.RowName;
        if (req && req !== 'None') {
            const fromReq = tierFromTalent(req);
            const result: TalentTierResult = {
                ...fromReq,
                method: fromReq.tier != null || fromReq.method === 'default_unlocked' ? 'station_deduced' : 'unknown',
            };
            stationTierCache.set(station, result);
            return result;
        }

        const result: TalentTierResult = {
            tier: null,
            talentName: null,
            talentTree: null,
            method: 'unknown',
            flags: ['missing_station_talent', 'tier_unknown'],
        };
        stationTierCache.set(station, result);
        return result;
    }

    function resolveRecipeTier(recipe: RecipeRow): TierInfo & { flags: Flag[] } {
        const flags: Flag[] = [];
        const requirement = recipe.Requirement?.RowName;

        if (requirement && requirement !== 'None') {
            const direct = tierFromTalent(requirement);
            flags.push(...direct.flags);
            return {
                value: direct.tier,
                method: direct.method === 'default_unlocked' ? 'default_unlocked' : direct.tier != null ? 'recipe_requirement' : 'unknown',
                talentName: direct.talentName,
                talentTree: direct.talentTree,
                stationSources: [],
                flags,
            };
        }

        const stations = stationNames(recipe);

        if (stations.length === 1 && stations[0] === 'Character') {
            return {
                value: 0,
                method: 'default_unlocked',
                talentName: null,
                talentTree: null,
                stationSources: [{ station: 'Character', tier: 0, talentName: null }],
                flags,
            };
        }

        const stationSources = stations.map((station) => {
            const resolved = resolveStationTier(station);
            return {
                station,
                tier: resolved.tier,
                talentName: resolved.talentName,
                flags: resolved.flags,
            };
        });

        const known = stationSources.map((s) => s.tier).filter((t): t is number => t != null);
        if (known.length === 0) {
            for (const source of stationSources) flags.push(...source.flags);
            flags.push('tier_unknown');
            return {
                value: null,
                method: 'unknown',
                talentName: null,
                talentTree: null,
                stationSources: stationSources.map(({ station, tier, talentName }) => ({
                    station,
                    tier,
                    talentName,
                })),
                flags: uniqueFlags(flags),
            };
        }

        const minTier = Math.min(...known);
        const maxTier = Math.max(...known);
        if (minTier !== maxTier) flags.push('multi_station_tiers');

        const unresolved = stationSources.filter((s) => s.tier == null);
        if (unresolved.length > 0) {
            flags.push('partial_station_tier_gaps');
            for (const source of unresolved) {
                flags.push(
                    ...source.flags.filter((flag) => STATION_NOISE_FLAGS.has(flag) && flag !== 'tier_unknown')
                );
            }
        }

        const best = stationSources.find((s) => s.tier === minTier);
        return {
            value: minTier,
            method: 'station_deduced',
            talentName: best?.talentName ?? null,
            talentTree: best?.talentName ? findTalent(best.talentName)?.TalentTree?.RowName ?? null : null,
            stationSources: stationSources.map(({ station, tier, talentName }) => ({
                station,
                tier,
                talentName,
            })),
            flags: uniqueFlags(flags),
        };
    }

    type DisplayDetails = {
        displayName: string | null;
        description: string | null;
        icon: string | null;
        iconPath: string | null;
    };

    function resolveStaticDisplay(staticItemName: string | null | undefined): DisplayDetails {
        const empty: DisplayDetails = { displayName: null, description: null, icon: null, iconPath: null };
        if (!staticItemName || staticItemName === 'None') return empty;
        const staticItem = staticByName.get(staticItemName);
        if (!staticItem) return empty;
        const itemableName = staticItem.Itemable?.RowName;
        if (!itemableName || itemableName === 'None') return empty;
        const itemable = itemableByName.get(itemableName);
        if (!itemable) return empty;
        const icon = itemable.Icon ?? null;
        return {
            displayName: parseNsLocText(itemable.DisplayName),
            description: parseNsLocText(itemable.Description),
            icon,
            iconPath: toIconPath(icon),
        };
    }

    type TemplateDetails = {
        staticItemName: string | null;
        displayName: string | null;
        description: string | null;
        icon: string | null;
        iconPath: string | null;
        consumableName: string | null;
        instantStats: ResolvedStat[];
        modifier: CatalogModifier | null;
        equipGrantedStats: ResolvedStat[];
    };

    function resolveTemplateDetails(templateName: string | null, flags: Flag[]): TemplateDetails {
        const details: TemplateDetails = {
            staticItemName: null,
            displayName: null,
            description: null,
            icon: null,
            iconPath: null,
            consumableName: null,
            instantStats: [],
            modifier: null,
            equipGrantedStats: [],
        };

        if (!templateName || templateName === 'None') {
            flags.push('missing_output_template');
            return details;
        }
        const template = templatesByName.get(templateName);
        if (!template) {
            flags.push('missing_output_template');
            return details;
        }
        details.staticItemName = template.ItemStaticData?.RowName ?? null;
        if (!details.staticItemName || details.staticItemName === 'None') {
            flags.push('missing_static_item');
            return details;
        }
        const staticItem = staticByName.get(details.staticItemName);
        if (!staticItem) {
            flags.push('missing_static_item');
            return details;
        }

        const itemableName = staticItem.Itemable?.RowName;
        if (!itemableName || itemableName === 'None') {
            flags.push('missing_itemable');
        } else {
            const itemable = itemableByName.get(itemableName);
            if (!itemable) {
                flags.push('missing_itemable');
            } else {
                details.displayName = parseNsLocText(itemable.DisplayName);
                details.description = parseNsLocText(itemable.Description);
                details.icon = itemable.Icon ?? null;
                details.iconPath = toIconPath(details.icon);
            }
        }

        const rawConsumable = staticItem.Consumable?.RowName;
        details.consumableName = rawConsumable && rawConsumable !== 'None' ? rawConsumable : null;
        if (details.consumableName) {
            const consumable = lookupByName(consumableByName, details.consumableName);
            if (!consumable) {
                flags.push('missing_consumable_row');
            } else {
                details.instantStats = resolveStats(consumable.Stats, statsByName, flags);
                const modName = consumable.Modifier?.Modifier?.RowName;
                if (modName && modName !== 'None') {
                    const mod = modifierByName.get(modName);
                    if (!mod) {
                        flags.push('missing_modifier_row');
                        details.modifier = {
                            name: modName,
                            displayName: null,
                            description: null,
                            lifetimeSeconds: consumable.Modifier?.ModifierLifetime ?? null,
                            grantedStats: [],
                        };
                    } else {
                        details.modifier = {
                            name: mod.Name,
                            displayName: parseNsLocText(mod.ModifierName),
                            description: parseNsLocText(mod.ModifierDescription),
                            lifetimeSeconds: consumable.Modifier?.ModifierLifetime ?? null,
                            grantedStats: resolveStats(mod.GrantedStats, statsByName, flags),
                        };
                    }
                }
            }
        }

        const equipName = staticItem.Equippable?.RowName;
        if (equipName && equipName !== 'None') {
            const equip = equippableByName.get(equipName);
            if (equip) {
                details.equipGrantedStats = [
                    ...resolveStats(equip.GrantedStats, statsByName, flags),
                    ...resolveStats(equip.GlobalStat_GrantedStats, statsByName, flags),
                ];
            }
        }

        return details;
    }

    /** Resolve display + consumable stats for a D_ItemsStatic row (no ItemTemplate required). */
    function resolveStaticItemDetails(staticItemName: string, flags: Flag[]): TemplateDetails {
        const details: TemplateDetails = {
            staticItemName,
            displayName: null,
            description: null,
            icon: null,
            iconPath: null,
            consumableName: null,
            instantStats: [],
            modifier: null,
            equipGrantedStats: [],
        };
        const staticItem = staticByName.get(staticItemName);
        if (!staticItem) {
            flags.push('missing_static_item');
            return details;
        }

        const itemableName = staticItem.Itemable?.RowName;
        if (!itemableName || itemableName === 'None') {
            flags.push('missing_itemable');
        } else {
            const itemable = itemableByName.get(itemableName);
            if (!itemable) {
                flags.push('missing_itemable');
            } else {
                details.displayName = parseNsLocText(itemable.DisplayName);
                details.description = parseNsLocText(itemable.Description);
                details.icon = itemable.Icon ?? null;
                details.iconPath = toIconPath(details.icon);
            }
        }

        const rawConsumable = staticItem.Consumable?.RowName;
        details.consumableName = rawConsumable && rawConsumable !== 'None' ? rawConsumable : null;
        if (details.consumableName) {
            const consumable = lookupByName(consumableByName, details.consumableName);
            if (!consumable) {
                flags.push('missing_consumable_row');
            } else {
                details.instantStats = resolveStats(consumable.Stats, statsByName, flags);
                const modName = consumable.Modifier?.Modifier?.RowName;
                if (modName && modName !== 'None') {
                    const mod = modifierByName.get(modName);
                    if (!mod) {
                        flags.push('missing_modifier_row');
                        details.modifier = {
                            name: modName,
                            displayName: null,
                            description: null,
                            lifetimeSeconds: consumable.Modifier?.ModifierLifetime ?? null,
                            grantedStats: [],
                        };
                    } else {
                        details.modifier = {
                            name: mod.Name,
                            displayName: parseNsLocText(mod.ModifierName),
                            description: parseNsLocText(mod.ModifierDescription),
                            lifetimeSeconds: consumable.Modifier?.ModifierLifetime ?? null,
                            grantedStats: resolveStats(mod.GrantedStats, statsByName, flags),
                        };
                    }
                }
            }
        }

        return details;
    }

    function resolveCosts(entries: WorkshopCostEntry[] | undefined, flags: Flag[]): PurchaseCost[] {
        return (entries ?? []).map((entry) => {
            const currency = entry.Meta?.RowName ?? 'Unknown';
            const currencyRow = currencyByName.get(currency);
            if (!currencyRow) flags.push('unknown_currency');
            return {
                currency,
                currencyDisplay: parseNsLocText(currencyRow?.DisplayName) ?? null,
                amount: entry.Amount ?? 0,
            };
        });
    }

    // Workshop purchases (orbital exchange), keyed by output template.
    const workshopByTemplate = new Map<string, { row: WorkshopItemRow }>();
    for (const row of workshopTable.Rows ?? []) {
        const template = row.Item?.RowName;
        if (template && template !== 'None') {
            workshopByTemplate.set(template, { row });
        }
    }

    function workshopPurchase(templateName: string | null, flags: Flag[]): PurchaseInfo['workshop'] | undefined {
        if (!templateName) return undefined;
        const entry = workshopByTemplate.get(templateName);
        if (!entry) return undefined;
        const mission = entry.row.RequiredMission?.RowName;
        return {
            workshopEntry: entry.row.Name,
            researchCost: resolveCosts(entry.row.ResearchCost, flags),
            replicationCost: resolveCosts(entry.row.ReplicationCost, flags),
            requiredMission: mission && mission !== 'None' ? mission : null,
        };
    }

    const CURRENCY_ITEM_NAMES = new Set(['Ren', 'MetaResource', 'Exotic_Red', 'Biomass', 'Uranium_Rod', 'Licence']);

    const catalog: CatalogRecipe[] = [];
    const flagSummary = new Map<Flag, number>();
    const referencedStaticIds = new Set<string>();
    const referencedStationIds = new Set<string>();

    for (const recipe of recipes) {
        const flags: Flag[] = [];
        if (recipe.bForceDisableRecipe) flags.push('recipe_disabled');

        const primaryOutput = recipe.Outputs?.[0];
        const templateName = primaryOutput?.Element?.RowName ?? null;
        const outputCount = primaryOutput?.Count ?? 1;

        const details = resolveTemplateDetails(templateName, flags);
        const {
            staticItemName,
            displayName,
            description,
            iconPath,
            consumableName,
            instantStats,
            modifier,
            equipGrantedStats,
        } = details;

        const hasStats =
            instantStats.length > 0 ||
            (modifier?.grantedStats.length ?? 0) > 0 ||
            equipGrantedStats.length > 0;
        if (!hasStats) flags.push('no_granted_stats');

        const stations = stationNames(recipe);
        const inputs = recipe.Inputs ?? [];
        const resourceInputs = recipe.ResourceInputs ?? [];

        // Shop purchases are modeled as recipes at *_Shop stations paid with currency items.
        const isShop =
            stations.some((s) => s.endsWith('_Shop')) ||
            (inputs.length > 0 && inputs.every((i) => CURRENCY_ITEM_NAMES.has(i.Element?.RowName ?? '')));

        const purchase: PurchaseInfo = {};
        let acquisition: CatalogRecipe['acquisition'] = 'craft';
        let tierResolved: TierInfo & { flags: Flag[] };

        if (isShop) {
            acquisition = 'shop';
            const costs: PurchaseCost[] = inputs
                .filter((i) => CURRENCY_ITEM_NAMES.has(i.Element?.RowName ?? ''))
                .map((i) => {
                    const itemName = i.Element?.RowName ?? 'Unknown';
                    // Currency items map to D_MetaCurrency rows via ItemStaticData; Ren → Credits.
                    const currencyRow = [...currencyByName.values()].find(
                        (c) => c.ItemStaticData?.RowName === itemName
                    );
                    return {
                        currency: currencyRow?.Name ?? itemName,
                        currencyDisplay: parseNsLocText(currencyRow?.DisplayName) ?? itemName,
                        amount: i.Count ?? 0,
                    };
                });
            if (costs.length === 0) flags.push('shop_price_missing');
            purchase.shop = { station: stations.find((s) => s.endsWith('_Shop')) ?? stations[0] ?? 'Unknown', costs };
            tierResolved = {
                value: null,
                method: 'purchase_only',
                talentName: null,
                talentTree: null,
                stationSources: [],
                flags: [],
            };
        } else {
            tierResolved = resolveRecipeTier(recipe);
        }
        flags.push(...tierResolved.flags);

        const workshop = workshopPurchase(templateName, flags);
        if (workshop) purchase.workshop = workshop;

        const uniq = uniqueFlags(flags);
        for (const flag of uniq) {
            flagSummary.set(flag, (flagSummary.get(flag) ?? 0) + 1);
        }

        const outputs: CatalogOutput[] = [];
        for (const output of recipe.Outputs ?? []) {
            const outTemplate = output.Element?.RowName ?? null;
            if (!outTemplate || outTemplate === 'None') continue;
            const outStatic = templatesByName.get(outTemplate)?.ItemStaticData?.RowName ?? null;
            const outId = outStatic && outStatic !== 'None' ? outStatic : outTemplate;
            outputs.push({
                id: outId,
                templateName: outTemplate,
                count: output.Count ?? 1,
            });
        }

        const ingredients: CatalogIngredient[] = isShop
            ? []
            : [
                  ...inputs.map((input) => ({
                      id: input.Element?.RowName ?? 'None',
                      count: input.Count ?? 0,
                      table: input.Element?.DataTableName ?? null,
                  })),
                  ...resourceInputs
                      .map((resource) => ({
                          id: resource.Type?.Value ?? 'None',
                          count: resource.RequiredUnits ?? 0,
                          table: 'Resource',
                      }))
                      .filter((resource) => resource.id && resource.id !== 'None'),
              ];

        if (staticItemName) referencedStaticIds.add(staticItemName);
        for (const output of outputs) {
            if (output.id && output.id !== 'None') referencedStaticIds.add(output.id);
        }
        for (const ingredient of ingredients) {
            if (ingredient.id && ingredient.id !== 'None') referencedStaticIds.add(ingredient.id);
        }
        if (!isShop) {
            for (const station of stations) referencedStationIds.add(station);
        }

        const mission = isMissionFromTags(manualTagNames(staticByName.get(staticItemName ?? '')));

        catalog.push({
            id: recipe.Name,
            acquisition,
            purchase: purchase.shop || purchase.workshop ? purchase : null,
            templateName,
            staticItemName,
            displayName,
            description,
            iconPath,
            stations: isShop ? [] : stations,
            ingredients,
            outputs,
            outputCount,
            consumableName,
            instantStats,
            modifier,
            equipGrantedStats,
            ...(mission ? { mission: true } : {}),
            tier: {
                value: tierResolved.value,
                method: tierResolved.method,
                talentName: tierResolved.talentName,
                talentTree: tierResolved.talentTree,
                stationSources: tierResolved.stationSources,
            },
            flags: uniq,
        });
    }

    // Workshop-only items (no processor recipe), e.g. Meta_Oxygen_Gel, Meta_Ration.
    const templatesWithRecipes = new Set(catalog.map((item) => item.templateName).filter(Boolean));
    for (const [templateName, entry] of workshopByTemplate) {
        if (templatesWithRecipes.has(templateName)) continue;

        const flags: Flag[] = [];
        const details = resolveTemplateDetails(templateName, flags);
        const workshop = workshopPurchase(templateName, flags)!;

        const hasStats =
            details.instantStats.length > 0 ||
            (details.modifier?.grantedStats.length ?? 0) > 0 ||
            details.equipGrantedStats.length > 0;
        if (!hasStats) flags.push('no_granted_stats');

        const uniq = uniqueFlags(flags);
        for (const flag of uniq) {
            flagSummary.set(flag, (flagSummary.get(flag) ?? 0) + 1);
        }

        if (details.staticItemName) referencedStaticIds.add(details.staticItemName);

        const mission = isMissionFromTags(manualTagNames(staticByName.get(details.staticItemName ?? '')));

        catalog.push({
            id: entry.row.Name,
            acquisition: 'workshop',
            purchase: { workshop },
            templateName,
            staticItemName: details.staticItemName,
            displayName: details.displayName,
            description: details.description,
            iconPath: details.iconPath,
            stations: [],
            ingredients: [],
            outputs: details.staticItemName
                ? [{ id: details.staticItemName, templateName, count: 1 }]
                : [],
            outputCount: 1,
            consumableName: details.consumableName,
            instantStats: details.instantStats,
            modifier: details.modifier,
            equipGrantedStats: details.equipGrantedStats,
            ...(mission ? { mission: true } : {}),
            tier: {
                value: null,
                method: 'purchase_only',
                talentName: null,
                talentTree: null,
                stationSources: [],
            },
            flags: uniq,
        });
    }

    // Gather / raw edible items that have a Consumable trait but no craft/shop/workshop recipe
    // covering that static id (e.g. Wild Berry, Carrot, raw meats). Mission-tagged orphans use
    // acquisition "mission" (e.g. FactionMission.Item.AnimalFood variants).
    const coveredConsumableStaticIds = new Set(
        catalog.map((row) => row.staticItemName).filter((id): id is string => Boolean(id))
    );
    const isFoodOrWaterInstant = (stats: ResolvedStat[]) =>
        stats.some((stat) => /FoodRecovery|WaterRecovery/.test(stat.key));

    for (const staticRow of staticTable.Rows ?? []) {
        const consumableName = staticRow.Consumable?.RowName;
        if (!consumableName || consumableName === 'None') continue;
        if (coveredConsumableStaticIds.has(staticRow.Name)) continue;

        const flags: Flag[] = [];
        const details = resolveStaticItemDetails(staticRow.Name, flags);
        if (!isFoodOrWaterInstant(details.instantStats)) continue;

        const hasStats =
            details.instantStats.length > 0 || (details.modifier?.grantedStats.length ?? 0) > 0;
        if (!hasStats) flags.push('no_granted_stats');

        const uniq = uniqueFlags(flags);
        for (const flag of uniq) {
            flagSummary.set(flag, (flagSummary.get(flag) ?? 0) + 1);
        }

        referencedStaticIds.add(staticRow.Name);
        coveredConsumableStaticIds.add(staticRow.Name);

        const mission = isMissionFromTags(manualTagNames(staticRow));

        catalog.push({
            id: staticRow.Name,
            acquisition: mission ? 'mission' : 'gather',
            purchase: null,
            templateName: null,
            staticItemName: details.staticItemName,
            displayName: details.displayName,
            description: details.description,
            iconPath: details.iconPath,
            stations: [],
            ingredients: [],
            outputs: details.staticItemName
                ? [{ id: details.staticItemName, templateName: details.staticItemName, count: 1 }]
                : [],
            outputCount: 1,
            consumableName: details.consumableName,
            instantStats: details.instantStats,
            modifier: details.modifier,
            equipGrantedStats: [],
            ...(mission ? { mission: true } : {}),
            tier: {
                value: 0,
                method: 'default_unlocked',
                talentName: null,
                talentTree: null,
                stationSources: [],
            },
            flags: uniq,
        });
    }

    catalog.sort((a, b) => {
        const aStats = a.flags.includes('no_granted_stats') ? 1 : 0;
        const bStats = b.flags.includes('no_granted_stats') ? 1 : 0;
        if (aStats !== bStats) return aStats - bStats;
        return (a.displayName ?? a.id).localeCompare(b.displayName ?? b.id);
    });

    // Ingredient / output static ids → craft recipe ids (also stored on items[*].recipeIds).
    // Link every Outputs[] entry so secondary products (e.g. Uranium_Inert from Uranium) are craftable.
    const lookupByStatic: Record<string, string[]> = {};
    for (const recipe of catalog) {
        if (recipe.acquisition !== 'craft') continue;
        const outputIds =
            recipe.outputs.length > 0
                ? recipe.outputs.map((o) => o.id)
                : recipe.staticItemName
                  ? [recipe.staticItemName]
                  : [];
        for (const outputId of outputIds) {
            if (!outputId || outputId === 'None') continue;
            const list = lookupByStatic[outputId] ?? (lookupByStatic[outputId] = []);
            if (!list.includes(recipe.id)) list.push(recipe.id);
        }
    }

    // Item display dictionary for every referenced static id (raw mats + outputs).
    const items: Record<string, CatalogItem> = {};
    const itemsOut: Record<string, Record<string, unknown>> = {};
    let gatherFirstCount = 0;
    for (const staticId of [...referencedStaticIds].sort()) {
        const display = resolveStaticDisplay(staticId);
        // Pipe/fuel ResourceInputs (Water, Biofuel, …) are not D_ItemsStatic rows.
        const isResource = !staticByName.has(staticId);
        const gatherFirst = isGatherFirstFromTags(manualTagNames(staticByName.get(staticId)));
        const mission = isMissionFromTags(manualTagNames(staticByName.get(staticId)));
        if (gatherFirst) gatherFirstCount += 1;
        const item: CatalogItem = {
            id: staticId,
            displayName: display.displayName ?? (isResource ? staticId.replace(/_/g, ' ') : null),
            description: display.description,
            iconPath: display.iconPath,
            recipeIds: lookupByStatic[staticId] ?? [],
            ...(gatherFirst ? { gatherFirst: true } : {}),
            ...(mission ? { mission: true } : {}),
        };
        items[staticId] = item;
        itemsOut[staticId] = emitObject({ ...item });
    }

    // Stations: all recipe sets used by craft recipes, plus full D_RecipeSets when present.
    for (const row of recipeSetsTable?.Rows ?? []) {
        referencedStationIds.add(row.Name);
    }

    const recipesById = new Map(catalog.map((r) => [r.id, r]));
    const recipesByIdCraft = new Map(
        catalog.filter((r) => r.acquisition === 'craft').map((r) => [r.id, r] as const)
    );

    // RecipeSet id → deployable/static id when Processing remaps (e.g. Cleaning_Device → T3_Cleaning_Device).
    const processingNamesByRecipeSet = new Map<string, string[]>();
    for (const row of processingTable?.Rows ?? []) {
        const recipeSetId = row.DefaultRecipeSet?.RowName;
        if (!recipeSetId || recipeSetId === 'None') continue;
        const list = processingNamesByRecipeSet.get(recipeSetId) ?? [];
        list.push(row.Name);
        processingNamesByRecipeSet.set(recipeSetId, list);
    }
    const staticNamesByProcessing = new Map<string, string[]>();
    for (const row of staticTable.Rows ?? []) {
        const processingName = row.Processing?.RowName;
        if (!processingName || processingName === 'None') continue;
        const list = staticNamesByProcessing.get(processingName) ?? [];
        list.push(row.Name);
        staticNamesByProcessing.set(processingName, list);
    }

    function pickLinkedStaticForStation(stationId: string): string | null {
        const processingNames = processingNamesByRecipeSet.get(stationId) ?? [];
        type Candidate = { staticId: string; score: number };
        const candidates: Candidate[] = [];
        for (const processingName of processingNames) {
            for (const staticId of staticNamesByProcessing.get(processingName) ?? []) {
                // Field-guide / meta stubs sometimes share a Processing row (e.g. Character).
                if (staticId.startsWith('FieldGuide_')) continue;
                const hasCraftRecipe =
                    recipesByIdCraft.has(staticId) || (lookupByStatic[staticId] ?? []).length > 0;
                const staticRow = staticByName.get(staticId);
                const isDeployable = Boolean(staticRow?.Deployable?.RowName);
                let score = 0;
                if (staticId === stationId) score += 100;
                if (staticId === processingName) score += 40;
                if ((lookupByStatic[staticId] ?? []).length > 0) score += 50;
                if (recipesByIdCraft.has(staticId)) score += 30;
                if (isDeployable) score += 10;
                // Require a real craftable/deployable device — skip Processing-only stubs.
                if (!hasCraftRecipe && !isDeployable && staticId !== stationId) continue;
                candidates.push({ staticId, score });
            }
        }
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score || a.staticId.localeCompare(b.staticId));
        return candidates[0].staticId;
    }

    const stationsOut: Record<string, Record<string, unknown>> = {};
    for (const stationId of [...referencedStationIds].sort()) {
        const recipeSet = recipeSetsByName.get(stationId);
        const recipeSetDisplayName =
            parseNsLocText(recipeSet?.RecipeSetName) ?? parseNsLocText(recipeSet?.DisplayText);

        const linkedStaticId = pickLinkedStaticForStation(stationId);
        const sameNameCraft =
            recipesById.get(stationId)?.acquisition === 'craft' ? recipesById.get(stationId) : undefined;
        const linkedCraftId =
            sameNameCraft?.id ??
            lookupByStatic[stationId]?.[0] ??
            (linkedStaticId
                ? (recipesByIdCraft.get(linkedStaticId)?.id ?? lookupByStatic[linkedStaticId]?.[0] ?? undefined)
                : undefined) ??
            null;

        const craftRecipeId =
            linkedCraftId && recipesById.get(linkedCraftId)?.acquisition === 'craft' ? linkedCraftId : null;
        const craftEntry = craftRecipeId ? recipesById.get(craftRecipeId) : undefined;
        const craftStaticId = craftEntry?.staticItemName ?? linkedStaticId;
        const craftItem = craftStaticId ? items[craftStaticId] : undefined;
        const linkedDisplay = !craftItem && linkedStaticId ? resolveStaticDisplay(linkedStaticId) : null;

        const station: CatalogStation = {
            id: stationId,
            // Prefer deployable/item label ("Biofuel Bio-Cleaner") over recipe-set name ("Cleaning Device").
            displayName:
                craftItem?.displayName ??
                craftEntry?.displayName ??
                linkedDisplay?.displayName ??
                recipeSetDisplayName ??
                null,
            recipeSetDisplayName: recipeSetDisplayName ?? null,
            iconPath:
                craftItem?.iconPath ??
                craftEntry?.iconPath ??
                linkedDisplay?.iconPath ??
                toIconPath(recipeSet?.RecipeSetIcon ?? null),
            craftRecipeId,
        };
        stationsOut[stationId] = emitObject({ ...station });
    }

    const withStats = catalog.filter((item) => !item.flags.includes('no_granted_stats'));
    const purchasable = catalog.filter((item) => item.acquisition === 'shop' || item.acquisition === 'workshop');
    const craftRecipes = catalog.filter((item) => item.acquisition === 'craft');
    const gatherRecipes = catalog.filter((item) => item.acquisition === 'gather');
    const missionRecipes = catalog.filter((item) => item.acquisition === 'mission' || item.mission);
    const unknownTiers = catalog.filter(
        (item) => item.tier.value == null && item.tier.method !== 'purchase_only'
    );
    const reviewQueueCount = catalog.filter((item) => item.flags.some((flag) => REVIEW_FLAGS.has(flag))).length;

    const rawMaterialCount = Object.values(items).filter((item) => item.recipeIds.length === 0).length;
    const recipesOut = catalog.map((recipe) => emitRecipe(recipe, items));

    const output = {
        meta: {
            generatedAt: new Date().toISOString(),
            exportPath: path.resolve(exportArg),
            dataRoot,
            recipeCount: catalog.length,
            craftCount: craftRecipes.length,
            gatherCount: gatherRecipes.length,
            missionCount: missionRecipes.length,
            withGrantedStatsCount: withStats.length,
            purchasableCount: purchasable.length,
            shopCount: purchasable.filter((item) => item.acquisition === 'shop').length,
            workshopCount: purchasable.filter((item) => item.acquisition === 'workshop').length,
            itemCount: Object.keys(items).length,
            rawMaterialCount,
            gatherFirstCount,
            stationCount: Object.keys(stationsOut).length,
            unknownTierCount: unknownTiers.length,
            reviewQueueCount,
            flagSummary: Object.fromEntries([...flagSummary.entries()].sort((a, b) => b[1] - a[1])),
            notes: {
                usage: 'Load recipes (filter acquisition===craft) for the calculator. Resolve ingredient/output display via items[staticItemName] (or items[ingredientId]). Multi-output recipes set items[*].recipeIds for every Outputs entry and include recipes[].outputs with per-output counts (use that count when the tree targets a secondary product). ResourceInputs become ingredients with table "Resource" (e.g. Water). Resolve station labels via stations[id].displayName (Processing remaps RecipeSet→deployable when ids differ, e.g. Cleaning_Device→T3_Cleaning_Device). Use stations[id].craftRecipeId to craft the station. Walk trees with items[id].recipeIds; missing/empty recipeIds = raw; items with gatherFirst=true are world-gather primary (Ore/Wood/…) — treat as terminal even when recipeIds lists conversion recipes (Quarrite armor → ore, Pyritic crust, Frozen_Ore). First id is a reasonable default when multiple recipes share an output. Absent null/[] fields are defaults. Food Explore: recipes with instant Food/Water recovery (includes acquisition===gather for world edibles; acquisition===mission / mission:true for FactionMission.* items).',
                tier0: 'Tier 0 means available without a Blueprint_T* unlock (default / Character crafting).',
                stationDeduction: 'If a recipe has no Requirement, tier is the minimum tier among its RecipeSets stations.',
                acquisition:
                    "'craft' = normal recipe; 'gather' = world edible with Consumable but no craft/shop/workshop recipe; 'mission' = FactionMission-tagged edible with no craft recipe (often shares a display name with a craftable variant); 'shop' = bought in-world with currency (see purchase.shop); 'workshop' = orbital workshop item (see purchase.workshop). Purchase-only items have no tier/station. mission:true marks FactionMission.* items on any acquisition.",
                iconPath: 'Ready for `${gameAssetsUrl}/ItemIcons/${iconPath}.png`. Omitting iconPath means none / outside Item_Icons.',
                review: 'meta.reviewQueueCount / flagSummary. Filter recipes whose flags intersect REVIEW_FLAGS for a review list.',
            },
        },
        recipes: recipesOut,
        items: itemsOut,
        stations: stationsOut,
    };

    const prettyPath = path.resolve(outArg ?? path.join(process.cwd(), 'data', 'icarus-game', 'data-catalog.json'));
    const minPath = path.resolve(process.cwd(), 'public', 'icarus-game', 'Data', 'data-catalog.json');
    const prettyJson = JSON.stringify(output, null, 2);
    const minJson = JSON.stringify(output);

    await fs.mkdir(path.dirname(prettyPath), { recursive: true });
    await fs.mkdir(path.dirname(minPath), { recursive: true });
    await fs.writeFile(prettyPath, prettyJson, 'utf8');
    await fs.writeFile(minPath, minJson, 'utf8');

    // dataRoot is <export>/data or export itself — version.json lives on the export root
    const versionCandidates = [
        path.join(path.resolve(exportArg), 'version.json'),
        path.join(path.dirname(dataRoot), 'version.json'),
        path.join(dataRoot, 'version.json'),
    ];
    let versionSrc: string | undefined;
    for (const candidate of versionCandidates) {
        if (await exists(candidate)) {
            versionSrc = candidate;
            break;
        }
    }
    if (versionSrc) {
        const prettyVersionPath = path.join(path.dirname(prettyPath), 'version.json');
        const publicVersionPath = path.join(path.dirname(minPath), 'version.json');
        const versionJson = stampExtractedAt(await fs.readFile(versionSrc, 'utf8'));
        await fs.writeFile(prettyVersionPath, versionJson, 'utf8');
        await fs.writeFile(publicVersionPath, versionJson, 'utf8');
        console.log(`Game version: ${versionSrc} → ${prettyVersionPath}`);
    } else {
        console.warn('No version.json next to export (run export.bat to copy Icarus/Config/version.json)');
    }

    const formatBytes = (n: number) =>
        n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`;

    console.log(`Wrote ${catalog.length} recipes (compact emit)`);
    console.log(`  pretty:   ${prettyPath} (${formatBytes(Buffer.byteLength(prettyJson))})`);
    console.log(`  minified: ${minPath} (${formatBytes(Buffer.byteLength(minJson))})`);
    console.log(`Craft: ${craftRecipes.length}; gather: ${gatherRecipes.length}; mission: ${missionRecipes.length}; items: ${Object.keys(items).length} (raw: ${rawMaterialCount}, gatherFirst: ${gatherFirstCount}); stations: ${Object.keys(stationsOut).length}`);
    console.log(`With granted stats: ${withStats.length}`);
    console.log(`Purchasable: ${purchasable.length} (shop + workshop)`);
    console.log(`Unknown tier: ${unknownTiers.length}`);
    console.log(`Review queue (count only): ${reviewQueueCount}`);
    console.log('Flag summary:');
    for (const [flag, count] of [...flagSummary.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${flag}: ${count}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
