export const itemIgnoreMap = Object.freeze({
    Basic_Oxite_Dissolver: true, // unused?
    Charcoal: true, // shows "Spoiled Meat" as the only input, which is misleading
});

export const itemLabelMap = Object.freeze({
    // raw material that doesn't have a recipe definition with `Name` will need correcting
    Bauxite: 'Aluminum Ore',
    Copper_Ore: 'Copper Ore',
    Iron_Ore: 'Iron Ore',
    Gold_Ore: 'Gold Ore',
    Metal_Ore: 'Iron Ore',
    Coal_Ore: 'Coal Ore',
    Platinum_Ore: 'Platinum Ore',
    Titanium_Ore: 'Titanium Ore',
    /* Refined_Metal: 'Iron Ingot',
    Refined_Copper: 'Copper Ingot',
    Refined_Gold: 'Gold Ingot',
    Metal_Axe: 'Iron Axe',
    Metal_Bolt: 'Iron Bolt',
    Metal_Crate_Medium: 'Iron Crate Medium',
    Metal_Crate_Small: 'Iron Crate Small',
    Metal_Cupboard: 'Iron Cupboard',
    Metal_Knife: 'Iron Knife',
    Metal_Pickaxe: 'Iron Pickaxe',
    Metal_Spear: 'Iron Spear',
    Carpentry_Bench_T4: 'Electric Carpentry Bench',
    Masonry_Bench_T4: 'Electric Masonry Bench', */
    Stick_Talent: 'Stick (Talent)',
    Talent_Leather_Rope: 'Rope (Leather, Talent)',
    /* Armor_Bench: 'Textiles Bench', */
    Rope_Armor_Bench: 'Rope (Armor Bench)',
    Epoxy_2: 'Epoxy (Crushed Bone)',
    Raw_Meat: 'Raw Meat',
    /* Building_UpgradeTool: 'Building Upgrade Tool', */
    Composite_Paste: 'Composite Paste (Gold)',
    Composite_Paste_Plat: 'Composite Paste (Platinum)',
    /* Food_Cooked_Carrot: 'Barbecue Carrot',
    Food_Cooked_Corn: 'Charred Corn',
    Food_Corn_Soup: 'Corn Soup',
    Food_Creamed_Corn: 'Creamed Corn',
    Food_Cooked_Pumpkin: 'Grilled Pumpkin',
    Food_Cooked_Squash: 'Roasted Squash',
    Food_Meat_Stew: 'Meat Stew',
    Food_Fish_Dish: 'Fish Dish',
    Food_Fried_Soy_Beans: 'Fried Soy Beans',
    Food_Mushroom_Soup: 'Mushroom Soup',
    Food_Fruit_Salad: 'Fruit Salad',
    Food_Roasted_Vegetables: 'Roasted Vegetables',
    Food_Cooked_Mushroom: 'Seared Mushroom',
    Food_Wild_Salad: 'Field Salad',
    Paste_Food_Consumption: 'Food Paste',
    Glass_Bottle_Beer: 'Beer Bottle',
    Glass_Bottle_Wine: 'Wine Bottle',
    Glass_Jar_Jam: 'Berry Jam',
    Wood_Floor_CarpentryBench: 'Wood Floor (Carpentry Bench)',
    Wood_Frame_CarpentryBench: 'Wood Frame (Carpentry Bench)',
    Wood_Ramp_CarpentryBench: 'Wood Ramp (Carpentry Bench)',
    Wood_Wall_Angled_CarpentryBench: 'Wood Wall Angled (Carpentry Bench)',
    Wood_Wall_CarpentryBench: 'Wood Wall (Carpentry Bench)', */
    Steel_Bloom: 'Steel Bloom (Ore)',
    Steel_Bloom2: 'Steel Bloom (Ingot)',
    Spoiled_Meat: 'Spoiled Meat',
    Spoiled_Plants: 'Spoiled Plants',
    /* Jerrycan: 'Biofuel Can',
    Platinum_Weave: 'Platinum Weave',
    Platinum_Wave: 'Platinum Weave', */
    Biofuel1: 'Biofuel (Raw Meat)',
    Biofuel2: 'Biofuel (Fiber)',
    Biofuel3: 'Biofuel (Stick)',
    Biofuel4: 'Biofuel (Wood)',
    Biofuel5: 'Biofuel (Cooked Meat)',
    Ammo_Pistol_Round: 'Pistol Round',
    Ammo_Rifle_Round: 'Rifle Round',
    Ammo_Shell_Buckshot: 'Shotgun Buckshot Shell',
    Bulk_Rifle_Round: 'Rifle Round (Bulk, Talent)',
    Bulk_Pistol_Round: 'Pistol Round (Bulk, Talent)',
    Shotgun_Shell_Buckshot: 'Shotgun Buckshot Shell',
    Bulk_Shotgun_Shell_Buckshot: 'Shotgun Buckshot Shell (Bulk, Talent)',
    Sugar_Cane: 'Sugar (Cane)',
    Sugar_Honey: 'Sugar (Honey)',
    Sugar_Kumara: 'Sugar (Kumara)',
});

const cleanItemDefaultLabel = (itemId) => {
    // replace under scores with spaces
    return itemId.replace(/_/g, ' ');
};

const getItemLabel = (itemId, { displayName } = {}) => {
    const label = itemLabelMap[itemId];
    return label ? label : (displayName ?? cleanItemDefaultLabel(itemId));
};

const normalizeItemId = (value = '') => value.toLowerCase().split('_').filter(Boolean).sort().join('_');

const isSameItemVariant = (left, right) => {
    if (!left || !right) {
        return false;
    }
    return left === right || normalizeItemId(left) === normalizeItemId(right);
};

const postProcessByItem = Object.freeze({
    /* Stick(item, id, recipeData) {
        // TODO: add talent toggle to support this option
        item.sources.unshift('Character');
        item.preferredSource = item.sources[0];
    },
    Stick_Talent(item, id, recipeData) {
        delete recipeData[id];
    }, */
});

/* const cleanItemTableName = (itemName = '') => {
    return itemName.replace(/^Item_Kit_/, '').replace(/^Item_/, '');
}; */

const cleanItemTableDisplayName = (displayName = '') => {
    const matchIndex = 3;
    const stringMatches = displayName.replace(/\"/g, '').match(/NSLOCTEXT\((.*), (.*), (.*)\)/);
    return stringMatches?.[matchIndex];
};

const cleanItemTableIconPath = (path = '') => {
    return path.replace('/Game/Assets/2DArt/UI/Items/Item_Icons/', '');
};

export function processItemTemplateData(rows = []) {
    const itemTemplateData = {};

    rows.forEach((itemRecord) => {
        const itemId = itemRecord.Name;

        if (!itemTemplateData[itemId]) {
            itemTemplateData[itemId] = {
                id: itemId,
                itemStaticId: itemRecord.ItemStaticData?.RowName,
            };
        }
    });

    return itemTemplateData;
}

export function processItemStaticData(rows = []) {
    const itemStaticData = {};

    rows.forEach((itemRecord) => {
        const itemId = itemRecord.Name;
        if (!itemStaticData[itemId]) {
            itemStaticData[itemId] = {
                id: itemId,
                itemTableId: itemRecord.Itemable?.RowName,
            };
        }
    });

    return itemStaticData;
}

export function processItemTableData(rows = []) {
    const itemTableData = {};

    rows.forEach((itemRecord) => {
        const itemId = itemRecord.Name;

        if (!itemTableData[itemId]) {
            itemTableData[itemId] = {
                id: itemId,
                displayName: cleanItemTableDisplayName(itemRecord.DisplayName),
                //description: cleanDescription(itemRecord.Description),
                icon: cleanItemTableIconPath(itemRecord.Icon),
            };
        }
    });

    return itemTableData;
}

/**
 * Convert `data-catalog.json` into the shapes the crafting UI expects.
 * Craft recipes only; shop/workshop rows are ignored.
 */
export function processCatalogData(catalog = {}) {
    const items = catalog.items ?? {};
    const recipes = catalog.recipes ?? [];
    const stations = catalog.stations ?? {};

    const itemStaticData = {};
    const itemTableData = {};
    for (const [id, item] of Object.entries(items)) {
        itemStaticData[id] = { id, itemTableId: id };
        itemTableData[id] = {
            id,
            displayName: item.displayName ?? null,
            icon: item.iconPath ?? '',
        };
    }

    // Station labels for fallbacks (Character, recipe-set-only stations).
    for (const [id, station] of Object.entries(stations)) {
        if (!itemTableData[id]) {
            itemTableData[id] = {
                id,
                displayName: station.displayName ?? station.recipeSetDisplayName ?? null,
                icon: station.iconPath ?? '',
            };
        }
        if (!itemStaticData[id]) {
            itemStaticData[id] = { id, itemTableId: id };
        }
    }

    const recipeData = {};
    for (const recipe of recipes) {
        if (recipe.acquisition !== 'craft') continue;
        if (itemIgnoreMap[recipe.id]) continue;

        const item = recipe.staticItemName ? items[recipe.staticItemName] : null;
        const displayName = recipe.displayName ?? item?.displayName ?? null;
        const iconPath = recipe.iconPath ?? item?.iconPath ?? '';
        const sources = recipe.stations ?? [];
        const outputs =
            Array.isArray(recipe.outputs) && recipe.outputs.length > 0
                ? recipe.outputs.map((out) => ({
                      id: out.id,
                      templateName: out.templateName ?? null,
                      count: out.count ?? 1,
                  }))
                : recipe.staticItemName
                  ? [{ id: recipe.staticItemName, templateName: recipe.templateName ?? null, count: recipe.outputCount ?? 1 }]
                  : [];

        recipeData[recipe.id] = {
            id: recipe.id,
            label: getItemLabel(recipe.id, { displayName }),
            iconPath: iconPath || '',
            outputItemId: recipe.templateName ?? null,
            itemStaticId: recipe.staticItemName ?? null,
            inputs: (recipe.ingredients ?? []).map((ing) => ({
                id: ing.id,
                quantity: ing.count,
            })),
            outputs,
            sources,
            preferredSource: sources[0] ?? null,
            outputQuantity: recipe.outputCount ?? 1,
        };
    }

    // Alias static item ids → primary craft recipe (tree recursion by ingredient id).
    // Skip "selfish" conversion recipes (input id === recipe id), e.g. Frozen_Wood → Wood,
    // Pyritic_Crust_Sulfur → Sulfur — those are optional processing paths, not the gather default.
    // Skip gatherFirst items (Item.Resource.Ore* / similar): conversion recipes stay listed on
    // recipeIds but the tree treats the static id as a terminal gather node.
    const isSelfishRecipe = (recipe) => (recipe.inputs || []).some((input) => input.id === recipe.id);

    const outputCountForStatic = (recipe, staticId) => {
        const match = (recipe.outputs || []).find((out) => out.id === staticId);
        return match?.count ?? recipe.outputQuantity ?? 1;
    };

    for (const [staticId, item] of Object.entries(items)) {
        if (item.gatherFirst) continue;
        const recipeIds = item.recipeIds ?? [];
        if (recipeIds.length === 0) continue;
        const primary = recipeIds.map((id) => recipeData[id]).find((recipe) => recipe && !isSelfishRecipe(recipe));
        if (!primary || recipeData[staticId]) continue;

        const outputQuantity = outputCountForStatic(primary, staticId);
        // Secondary multi-outputs need their own yield + searchable id (e.g. Uranium → 10 Uranium_Inert).
        if (
            outputQuantity !== primary.outputQuantity ||
            (primary.itemStaticId && primary.itemStaticId !== staticId)
        ) {
            const displayName = item.displayName ?? null;
            recipeData[staticId] = {
                ...primary,
                id: staticId,
                label: getItemLabel(staticId, { displayName }),
                iconPath: item.iconPath || primary.iconPath || '',
                outputItemId: staticId,
                itemStaticId: staticId,
                outputQuantity,
            };
        } else {
            recipeData[staticId] = primary;
        }
    }

    return {
        recipeData: postProcessData(recipeData),
        itemStaticData,
        itemTableData,
        stations,
    };
}

/** Resolve a RecipeSet / station id to a player-facing label. */
export function getStationLabel(stationId, { stations = {}, recipeData = {}, itemTableData = {} } = {}) {
    if (!stationId) return stationId;
    const station = stations[stationId];
    const craftRecipeId = station?.craftRecipeId ?? null;
    return (
        station?.displayName ??
        station?.recipeSetDisplayName ??
        recipeData[stationId]?.label ??
        (craftRecipeId ? recipeData[craftRecipeId]?.label : null) ??
        itemTableData[stationId]?.displayName ??
        itemLabelMap[stationId] ??
        stationId
    );
}

/** Recipe id used to craft the station deployable (may differ from RecipeSet id). */
export function getStationCraftRecipeId(stationId, { stations = {}, recipeData = {} } = {}) {
    if (!stationId) return null;
    const craftRecipeId = stations[stationId]?.craftRecipeId ?? null;
    if (craftRecipeId && recipeData[craftRecipeId]) return craftRecipeId;
    if (recipeData[stationId]) return stationId;
    return null;
}

export function processRecipeData(rows = [], { itemTemplateData = {}, itemStaticData = {}, itemTableData = {} } = {}) {
    const recipeDataByName = {};

    // map Array to Object so we can cross reference as needed
    rows.forEach((recipe) => {
        recipeDataByName[recipe.Name] = recipe;
    });

    // case-insensitive fallback map for itemStaticData (game data exports have inconsistent casing)
    const itemStaticDataNorm = Object.fromEntries(Object.entries(itemStaticData).map(([k, v]) => [k.toLowerCase(), v]));

    const recipeData = {};

    rows.forEach((recipe) => {
        //const maxFilePathLength = 100;
        const id = recipe.Name;

        if (itemIgnoreMap[id]) {
            return;
        }

        // TODO: setup custom data merge for known duplicates (e.g. Rope, Talent_Leather_Rope)

        const itemTemplateId = id;
        const outputFallbackId = () => {
            /* if (id === 'Ammo_EDS_MissionModified') {
                debugger;
            } */
            const outputName = recipe.Outputs[0]?.Element.RowName;
            if (
                recipe.Outputs.length === 1 &&
                outputName &&
                (isSameItemVariant(outputName, itemTemplateId) || recipe.Requirement || recipe.SessionRequirement || !recipeDataByName[outputName])
            ) {
                return outputName;
            }
            return null;
        };
        const inputFallbackId = recipe.Inputs[0]?.Element.RowName;
        const itemTemplateRecord =
            itemTemplateData[itemTemplateId] ?? itemTemplateData[recipe.Requirement?.RowName] ?? itemTemplateData[outputFallbackId()];
        const itemStaticRecord =
            itemStaticData[itemTemplateRecord?.itemStaticId] ??
            itemStaticDataNorm[itemTemplateRecord?.itemStaticId?.toLowerCase()] ??
            itemStaticData[id];

        if (!itemStaticRecord) {
            /* console.warn('Missing itemStaticRecord for', {
                id,
                inputFallbackId,
                itemTemplateId,
                itemTemplateRecord,
                itemStaticRecord,
                recipe,
                recipeDataByName,
            }); */
        }

        const iconPath = recipe.ResourceOutputs?.length > 0 ? '' : (itemTableData[itemStaticRecord?.itemTableId]?.icon ?? '');

        // since the PNG files are now deduplicated, but the code references are not
        // we can just take the first part of the file name, e.g. `"Weapons/Guns/T_ITEM_Pistol_T4.T_ITEM_Pistol_T4"` => `"Weapons/Guns/T_ITEM_Pistol_T4"`
        const iconPathDedupe = iconPath?.length > 0 && iconPath.includes('.') ? iconPath.split('.')[0] : '';
        const outputItemId = recipe.Outputs?.length === 1 ? recipe.Outputs[0]?.Element?.RowName : null;

        recipeData[id] = {
            id: id,
            label: getItemLabel(id, { displayName: itemTableData[itemStaticRecord?.itemTableId]?.displayName }),
            iconPath: iconPathDedupe ?? iconPath ?? '',
            outputItemId,
            itemStaticId: itemStaticRecord?.id,

            inputs: [],
            sources: [],
            preferredSource: null,
            outputQuantity: 1,
        };

        // build list of input item objects
        (recipe.Inputs || []).forEach((input) => {
            recipeData[id].inputs.push({
                id: input.Element.RowName,
                quantity: input.Count,
            });
        });

        // build list of source (crafting source/bench) item names
        (recipe.RecipeSets || []).forEach((source) => {
            recipeData[id].sources.push(source.RowName);
        });

        // TODO: set preferred source from localStorage
        // for now just default to the first source if it exists
        recipeData[id].preferredSource = recipeData[id].sources[0];

        // determine output quantity
        (recipe.Outputs || []).forEach((output) => {
            if (isSameItemVariant(id, output.Element.RowName)) {
                recipeData[id].outputQuantity = output.Count;
            }
        });

        /* // Some recipes use a different recipe name than the produced item id
        // (e.g. Refined_Wood -> Wood_Refined). For single-output recipes,
        // use the output count directly so quantity math remains accurate.
        if (recipeData[id].outputQuantity === 1 && recipe.Outputs?.length === 1) {
            recipeData[id].outputQuantity = recipe.Outputs[0].Count ?? 1;
        }

        // When recipe.Name differs from the actual output item ID (e.g. Refined_Wood -> Wood_Refined),
        // register an alias key for lookup-by-input without changing the canonical recipe object's id.
        // Mutating recipeData[id].id causes incorrect identity in sub-component calculations.
        const outputItemId = recipe.Outputs.length === 1 ? recipe.Outputs[0]?.Element.RowName : null;
        if (outputItemId && outputItemId !== id && isSameItemVariant(id, outputItemId) && !recipeData[outputItemId]) {
            recipeData[outputItemId] = recipeData[id]; // alias; same object reference
        }

        // When D_ItemsStatic RowName differs from recipe name due data typo
        // (e.g. Platinum_Shealth vs Platinum_Sheath), alias the static id lookup.
        // Only do this when the recipe's produced item is still the same canonical item,
        // otherwise alternate conversion recipes can overwrite canonical raw item labels.
        const staticAliasOutputItemId = recipe.Outputs?.length === 1 ? recipe.Outputs[0]?.Element?.RowName : null;
        const outputsSameItem = !staticAliasOutputItemId || isSameItemVariant(staticAliasOutputItemId, id);
        if (outputsSameItem && itemStaticRecord && itemStaticRecord.id !== id && !recipeData[itemStaticRecord.id]) {
            recipeData[itemStaticRecord.id] = recipeData[id]; // alias; same object reference
        } */
    });

    return { recipeData: postProcessData(recipeData) };
}

/**
 * Format Icarus Config/version.json into short display label e.g. v3.0.18
 * @param {{ Version?: { Major?: number, Minor?: number, Patch?: number } }} doc
 */
export function formatGameVersionShort(doc) {
    const v = doc?.Version;
    if (!v || v.Major == null || v.Minor == null || v.Patch == null) {
        return '';
    }
    return `v${v.Major}.${v.Minor}.${v.Patch}`;
}

/**
 * Format Icarus Config/version.json into the patch-notes style label
 * e.g. v3.0.18.154111-rel-DangerousHorizons
 * @param {{ Version?: { Major?: number, Minor?: number, Patch?: number, Changelist?: number, BuildType?: string, FeatureLevel?: string } }} doc
 */
export function formatGameVersionLabel(doc) {
    const v = doc?.Version;
    if (!v || v.Major == null || v.Minor == null || v.Patch == null || v.Changelist == null) {
        return '';
    }
    const channel = v.BuildType === 'Shipping' || !v.BuildType ? 'rel' : String(v.BuildType).toLowerCase();
    const feature = v.FeatureLevel || 'Unknown';
    return `v${v.Major}.${v.Minor}.${v.Patch}.${v.Changelist}-${channel}-${feature}`;
}

/** YYYY-MM-DD stamped when export.bat / sync wrote the file */
export function formatGameVersionExtractedAt(doc) {
    const raw = doc?.extractedAt;
    if (typeof raw !== 'string' || !raw) {
        return '';
    }
    return raw.slice(0, 10);
}

export function generateHighlightedText(inputText, regions = []) {
    let content = '';
    let nextNonHighlightedRegionStartingIndex = 0;

    regions.forEach((region) => {
        const lastRegionNextIndex = region[1] + 1;
        const nonHighlightedRegion = inputText.substring(nextNonHighlightedRegionStartingIndex, region[0]);
        const highlightedRegion = inputText.substring(region[0], lastRegionNextIndex);
        content += `${nonHighlightedRegion}<span class="highlight-result">${highlightedRegion}</span>`;

        nextNonHighlightedRegionStartingIndex = lastRegionNextIndex;
    });

    content += inputText.substring(nextNonHighlightedRegionStartingIndex);

    return content;
}

function postProcessData(recipeData = {}) {
    if (Object.keys(postProcessByItem).length > 0) {
        // apply any custom post processing defined for specific items
        Object.keys(recipeData).forEach((id) => {
            const item = recipeData[id];
            postProcessByItem[id]?.(item, id, recipeData);
        });
    }
    return recipeData;
}

const FOOD_WATER_STAT_RE = /FoodRecovery|WaterRecovery/;

const getStatValue = (stats = [], key) => stats.find((stat) => stat.key === key)?.value ?? null;

/**
 * Edible food/drink rows from the catalog (instant Food or Water recovery).
 * Includes craft, gather, shop, and workshop sources.
 */
export function buildFoodConsumables(catalog = {}) {
    const items = catalog.items ?? {};
    const stations = catalog.stations ?? {};
    const foods = [];

    for (const recipe of catalog.recipes ?? []) {
        const instantStats = recipe.instantStats ?? [];
        if (!instantStats.some((stat) => FOOD_WATER_STAT_RE.test(stat.key))) {
            continue;
        }

        const item = recipe.staticItemName ? items[recipe.staticItemName] : null;
        const grantedStats = recipe.modifier?.grantedStats ?? [];
        const allStats = [...instantStats, ...grantedStats];
        const foodRecovery = getStatValue(instantStats, 'BaseFoodRecovery_+') ?? 0;
        const waterRecovery = getStatValue(instantStats, 'BaseWaterRecovery_+') ?? 0;
        const lifetimeSeconds = recipe.modifier?.lifetimeSeconds ?? null;
        const stationLabels = (recipe.stations ?? []).map((id) => stations[id]?.displayName ?? stations[id]?.recipeSetDisplayName ?? id);

        foods.push({
            id: recipe.id,
            staticItemName: recipe.staticItemName ?? null,
            label: getItemLabel(recipe.id, { displayName: recipe.displayName ?? item?.displayName }),
            description: recipe.description ?? item?.description ?? null,
            iconPath: recipe.iconPath ?? item?.iconPath ?? '',
            acquisition: recipe.acquisition ?? 'craft',
            mission: Boolean(recipe.mission || item?.mission || recipe.acquisition === 'mission'),
            tier: recipe.tier?.value ?? null,
            stations: recipe.stations ?? [],
            stationLabels,
            instantStats,
            grantedStats,
            allStats,
            foodRecovery,
            waterRecovery,
            hasBuff: grantedStats.length > 0,
            hasNegativeStat: allStats.some((stat) => typeof stat.value === 'number' && stat.value < 0),
            hasPositiveBuff: grantedStats.some((stat) => typeof stat.value === 'number' && stat.value > 0 && stat.key !== 'BaseFoodStomachSlots_+'),
            lifetimeSeconds,
            lifetimeMinutes: lifetimeSeconds != null ? Math.round(lifetimeSeconds / 60) : null,
            modifierName: recipe.modifier?.displayName ?? recipe.modifier?.name ?? null,
            modifierDescription: recipe.modifier?.description ?? null,
            grantedStatKeys: grantedStats.map((stat) => stat.key),
        });
    }

    foods.sort((a, b) => a.label.localeCompare(b.label));
    return foods;
}
