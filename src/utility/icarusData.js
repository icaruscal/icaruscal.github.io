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

/** Normalize catalog locks; empty → null. */
export function normalizeLocks(locks) {
    if (!locks) return null;
    const dlc = Array.isArray(locks.dlc) ? locks.dlc.filter((entry) => entry?.id) : [];
    const missions = Array.isArray(locks.missions) ? locks.missions.filter((entry) => entry?.id) : [];
    if (dlc.length === 0 && missions.length === 0) return null;
    return { dlc, missions };
}

export function hasItemLocks(locks) {
    return Boolean(normalizeLocks(locks));
}

/** Merge multiple lock objects, deduping by id within dlc / missions. */
export function mergeItemLocks(...parts) {
    const dlc = [];
    const missions = [];
    const seenDlc = new Set();
    const seenMissions = new Set();
    for (const part of parts) {
        const normalized = normalizeLocks(part);
        if (!normalized) continue;
        for (const entry of normalized.dlc) {
            if (seenDlc.has(entry.id)) continue;
            seenDlc.add(entry.id);
            dlc.push(entry);
        }
        for (const entry of normalized.missions) {
            if (seenMissions.has(entry.id)) continue;
            seenMissions.add(entry.id);
            missions.push(entry);
        }
    }
    return dlc.length || missions.length ? { dlc, missions } : null;
}

/** Tooltip lines for DLC / mission gates. */
export function formatLocksTooltipLines(locks) {
    const normalized = normalizeLocks(locks);
    if (!normalized) return [];
    const lines = [];
    for (const entry of normalized.dlc) {
        lines.push(`Requires DLC: ${entry.displayName || entry.id}`);
    }
    for (const entry of normalized.missions) {
        lines.push(`Requires mission: ${entry.displayName || entry.id}`);
    }
    return lines;
}

/**
 * Resolve locks for a recipe and/or static item.
 * Prefer a specific recipe's locks when present (DLC alternate crafts); otherwise use
 * item-level locks (gates shared by every acquisition path).
 */
export function resolveLocksForItem(
    { recipeId = null, staticItemId = null } = {},
    { catalog = null, recipeData = {}, itemStaticData = {} } = {}
) {
    const recipeLocks = normalizeLocks(recipeId ? recipeData?.[recipeId]?.locks : null);
    if (recipeLocks) return recipeLocks;
    return mergeItemLocks(
        staticItemId ? catalog?.items?.[staticItemId]?.locks : null,
        staticItemId ? itemStaticData?.[staticItemId]?.locks : null
    );
}

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
        itemStaticData[id] = {
            id,
            itemTableId: id,
            recipeIds: item.recipeIds ?? [],
            gatherFirst: Boolean(item.gatherFirst),
            locks: normalizeLocks(item.locks),
        };
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
            itemStaticData[id] = {
                id,
                itemTableId: id,
                recipeIds: [],
                gatherFirst: false,
            };
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
            instantStats: recipe.instantStats ?? [],
            equipGrantedStats: recipe.equipGrantedStats ?? [],
            modifier: recipe.modifier ?? null,
            // Recipe-only — item-level locks (shared across all craft paths) live on items / itemStaticData.
            locks: normalizeLocks(recipe.locks),
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

const isSelfishRecipe = (recipe) => (recipe?.inputs || []).some((input) => input.id === recipe.id);

/** Whether a craft recipe produces the given static item id. */
export function recipeProducesStaticItem(recipe, staticId) {
    if (!recipe || !staticId) return false;
    if (recipe.itemStaticId === staticId) return true;
    if ((recipe.outputs || []).some((out) => out.id === staticId)) return true;
    return false;
}

/**
 * Craft recipe ids that can produce `itemId` (static item or a specific recipe id).
 * Skips gather-first terminals and selfish conversion recipes.
 */
export function getCraftRecipeIdsForItem(itemId, { recipeData = {}, itemStaticData = {} } = {}) {
    if (!itemId) return [];

    const meta = itemStaticData[itemId];
    if (meta?.gatherFirst) return [];

    const filterIds = (ids, staticId) =>
        [...new Set(ids)].filter((recipeId) => {
            const recipe = recipeData[recipeId];
            if (!recipe || isSelfishRecipe(recipe)) return false;
            if (staticId) return recipeProducesStaticItem(recipe, staticId);
            return true;
        });

    if (meta?.recipeIds?.length) {
        return filterIds(meta.recipeIds, itemId);
    }

    const direct = recipeData[itemId];
    if (!direct || isSelfishRecipe(direct)) return [];

    const staticId = direct.itemStaticId;
    if (staticId && itemStaticData[staticId]?.recipeIds?.length) {
        if (itemStaticData[staticId].gatherFirst) return [];
        const siblings = filterIds(itemStaticData[staticId].recipeIds, staticId);
        if (siblings.length > 0) return siblings;
    }

    return [direct.id];
}

/** Output count of `recipe` toward static / recipe `itemId`. */
export function getRecipeOutputCountForItem(recipe, itemId) {
    if (!recipe) return 1;
    const match = (recipe.outputs || []).find((out) => out.id === itemId);
    if (match) return match.count ?? 1;
    if (recipe.itemStaticId === itemId || recipe.id === itemId) {
        return recipe.outputQuantity || 1;
    }
    return recipe.outputQuantity || 1;
}

/**
 * Resolve which craft recipe to use for an item in the tree.
 * Pass `preferredRecipeId` for a path-/instance-specific choice.
 */
export function resolveItemRecipe(itemId, { recipeData = {}, itemStaticData = {} } = {}, { preferredRecipeId = null, forcedRecipeId = null } = {}) {
    if (forcedRecipeId && recipeData[forcedRecipeId]) {
        return recipeData[forcedRecipeId];
    }

    const recipeIds = getCraftRecipeIdsForItem(itemId, { recipeData, itemStaticData });
    if (recipeIds.length === 0) {
        return null;
    }

    const chosen =
        (preferredRecipeId && recipeIds.includes(preferredRecipeId) && preferredRecipeId) ||
        (recipeIds.includes(itemId) && itemId) ||
        recipeIds[0];

    return recipeData[chosen] ?? null;
}

/** Short label summarizing a recipe’s inputs for variant pickers. */
export function formatRecipeVariantLabel(recipe, { itemTableData = {}, recipeData = {}, itemStaticData = {} } = {}) {
    if (!recipe) return '';
    const parts = (recipe.inputs || []).map((input) => {
        const label =
            recipeData[input.id]?.label ??
            itemTableData[itemStaticData[input.id]?.itemTableId]?.displayName ??
            itemTableData[input.id]?.displayName ??
            input.id.replace(/_/g, ' ');
        return input.quantity > 1 ? `${input.quantity}× ${label}` : label;
    });
    const outputCount = recipe.outputQuantity || 1;
    const body = parts.length > 0 ? parts.join(' + ') : recipe.label || recipe.id;
    return outputCount > 1 ? `${body} → ${outputCount}` : body;
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

const isFoodOrDrink = (instantStats = []) => instantStats.some((stat) => FOOD_WATER_STAT_RE.test(stat.key));

/**
 * Whether a catalog recipe is a useful consumable for the Explore page:
 * food/drink recovery, other instant recovery, granted buffs, or a consumable modifier
 * (including pills/vaccines whose modifier has description but empty grantedStats).
 */
const isExploreConsumable = (recipe = {}) => {
    const instantStats = recipe.instantStats ?? [];
    const grantedStats = recipe.modifier?.grantedStats ?? [];
    if (instantStats.length > 0 || grantedStats.length > 0) {
        return true;
    }
    return Boolean(recipe.consumableName && recipe.modifier);
};

/**
 * Prefer the primary craft recipe when multiple recipes produce the same static item
 * (e.g. Crispy_Bacon vs Crispy_Bacon_Butter).
 */
const preferExploreRecipe = (candidate, existing, item = null) => {
    const recipeIds = item?.recipeIds ?? [];
    const primaryId = recipeIds[0];
    if (primaryId) {
        if (candidate.id === primaryId) return true;
        if (existing.id === primaryId) return false;
    }
    if (candidate.staticItemName && candidate.id === candidate.staticItemName) return true;
    if (existing.staticItemName && existing.id === existing.staticItemName) return false;
    if (candidate.acquisition === 'craft' && existing.acquisition !== 'craft') return true;
    if (existing.acquisition === 'craft' && candidate.acquisition !== 'craft') return false;
    return false;
};

/**
 * Consumable rows from the catalog for Food/Medicine Explore.
 * Includes craft, gather, shop, workshop, and mission sources.
 * One row per static item (alternate recipes for the same output are collapsed).
 */
export function buildFoodConsumables(catalog = {}) {
    const items = catalog.items ?? {};
    const stations = catalog.stations ?? {};
    const foodsByKey = new Map();

    for (const recipe of catalog.recipes ?? []) {
        if (!isExploreConsumable(recipe)) {
            continue;
        }

        const instantStats = recipe.instantStats ?? [];
        const item = recipe.staticItemName ? items[recipe.staticItemName] : null;
        const grantedStats = recipe.modifier?.grantedStats ?? [];
        const allStats = [...instantStats, ...grantedStats];
        const foodRecovery = getStatValue(instantStats, 'BaseFoodRecovery_+') ?? 0;
        const waterRecovery = getStatValue(instantStats, 'BaseWaterRecovery_+') ?? 0;
        const healthRecovery = getStatValue(instantStats, 'BaseHealthRecovery_+') ?? 0;
        const staminaRecovery = getStatValue(instantStats, 'BaseStaminaRecovery_+') ?? 0;
        const oxygenRecovery = getStatValue(instantStats, 'BaseOxygenRecovery_+') ?? 0;
        const lifetimeSeconds = recipe.modifier?.lifetimeSeconds ?? null;
        const stationLabels = (recipe.stations ?? []).map((id) => stations[id]?.displayName ?? stations[id]?.recipeSetDisplayName ?? id);
        const isFood = isFoodOrDrink(instantStats);

        const row = {
            id: recipe.id,
            staticItemName: recipe.staticItemName ?? null,
            label: getItemLabel(recipe.id, { displayName: recipe.displayName ?? item?.displayName }),
            description: recipe.description ?? item?.description ?? null,
            iconPath: recipe.iconPath ?? item?.iconPath ?? '',
            acquisition: recipe.acquisition ?? 'craft',
            mission: Boolean(recipe.mission || item?.mission || recipe.acquisition === 'mission'),
            locks: mergeItemLocks(recipe.locks, item?.locks),
            foodAudience: item?.foodAudience ?? null,
            category: isFood ? 'food' : 'medicine',
            isFood,
            tier: recipe.tier?.value ?? null,
            stations: recipe.stations ?? [],
            stationLabels,
            instantStats,
            grantedStats,
            allStats,
            foodRecovery,
            waterRecovery,
            healthRecovery,
            staminaRecovery,
            oxygenRecovery,
            hasBuff: grantedStats.length > 0 || Boolean(recipe.modifier),
            hasNegativeStat: allStats.some((stat) => typeof stat.value === 'number' && stat.value < 0),
            hasPositiveBuff: grantedStats.some((stat) => typeof stat.value === 'number' && stat.value > 0 && stat.key !== 'BaseFoodStomachSlots_+'),
            lifetimeSeconds,
            lifetimeMinutes: lifetimeSeconds != null ? Math.round(lifetimeSeconds / 60) : null,
            modifierName: recipe.modifier?.displayName ?? recipe.modifier?.name ?? null,
            modifierDescription: recipe.modifier?.description ?? null,
            grantedStatKeys: grantedStats.map((stat) => stat.key),
        };

        const key = row.staticItemName || row.id;
        const existing = foodsByKey.get(key);
        if (!existing || preferExploreRecipe(row, existing, item)) {
            foodsByKey.set(key, row);
        }
    }

    return [...foodsByKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** D_ToolDamage fields that mark an item as a gathering tool rather than a pure melee weapon. */
const GEAR_TOOL_FIELDS = [
    'fellingDamage',
    'fellingEfficiency',
    'miningRadius',
    'miningEfficiency',
    'skinningEfficiency',
    'reapingEfficiency',
    'shatteringDamage',
    'shatteringEfficiency',
];

/**
 * Classify a static item into a Gear Explore category, or null when it is not gear.
 * Furniture / coziness rows only carry `combat.additionalStats`, so "has combat" alone
 * is not enough — require armour, a real combat block, or equip-granted stats.
 */
const classifyGearCategory = (item, recipes = []) => {
    const combat = item?.combat ?? null;
    if (item?.armour) return 'armor';
    if (combat?.firearm) return 'weapon';
    if (combat?.ballistic || combat?.ammo) return 'ammo';
    if (combat?.attachment) return 'attachment';
    if (combat?.toolDamage) {
        const toolDamage = combat.toolDamage;
        return GEAR_TOOL_FIELDS.some((field) => toolDamage[field] != null) ? 'tool' : 'weapon';
    }
    if (recipes.some((recipe) => (recipe.equipGrantedStats ?? []).length > 0)) return 'module';
    return null;
};

/**
 * Gear rows from the catalog for the Gear Explore page: armor, weapons, tools,
 * ammo, attachments, and equippable modules. One row per static item; recipe
 * data (tier / stations / acquisition / locks) comes from the preferred recipe.
 */
export function buildGearItems(catalog = {}) {
    const items = catalog.items ?? {};
    const stations = catalog.stations ?? {};

    const recipesByStatic = new Map();
    for (const recipe of catalog.recipes ?? []) {
        const key = recipe.staticItemName;
        if (!key) continue;
        if (!recipesByStatic.has(key)) recipesByStatic.set(key, []);
        recipesByStatic.get(key).push(recipe);
    }

    const rows = [];
    for (const [staticId, item] of Object.entries(items)) {
        const recipes = recipesByStatic.get(staticId) ?? [];
        const category = classifyGearCategory(item, recipes);
        if (!category) continue;

        let preferred = null;
        for (const recipe of recipes) {
            if (!preferred) {
                preferred = recipe;
                continue;
            }
            const candidate = { id: recipe.id, staticItemName: staticId, acquisition: recipe.acquisition ?? 'craft' };
            const existing = { id: preferred.id, staticItemName: staticId, acquisition: preferred.acquisition ?? 'craft' };
            if (preferExploreRecipe(candidate, existing, item)) {
                preferred = recipe;
            }
        }

        const combat = item.combat ?? null;
        const armour = item.armour ?? null;
        const armourStats = armour?.stats ?? [];
        const equipGrantedStats =
            recipes.find((recipe) => (recipe.equipGrantedStats ?? []).length > 0)?.equipGrantedStats ?? [];
        const gearStats = [
            ...armourStats,
            ...equipGrantedStats,
            ...(combat?.additionalStats ?? []),
            ...(combat?.attachment?.stats ?? []),
            ...(combat?.ammo?.stats ?? []),
        ];
        const combatRows = buildCombatDisplayRows(combat);

        const craftRecipes = recipes.filter((recipe) => recipe.acquisition === 'craft');
        const craftTiers = craftRecipes.map((recipe) => recipe.tier?.value).filter((value) => value != null);
        const tier = craftTiers.length > 0 ? Math.min(...craftTiers) : preferred?.tier?.value ?? null;

        const acquisition = preferred?.acquisition ?? 'gather';
        const stationIds = preferred?.stations ?? [];
        const stationLabels = stationIds.map(
            (id) => stations[id]?.displayName ?? stations[id]?.recipeSetDisplayName ?? id
        );

        rows.push({
            id: staticId,
            staticItemName: staticId,
            recipeId: preferred?.id ?? null,
            craftRecipeId: craftRecipes[0]?.id ?? null,
            label: getItemLabel(staticId, { displayName: item.displayName ?? preferred?.displayName }),
            description: item.description ?? preferred?.description ?? null,
            iconPath: item.iconPath ?? preferred?.iconPath ?? '',
            category,
            acquisition,
            mission: Boolean(item.mission || preferred?.mission || acquisition === 'mission'),
            locks: mergeItemLocks(preferred?.locks, item.locks),
            tier,
            stations: stationIds,
            stationLabels,
            armourType: armour?.armourType ?? null,
            setId: armour?.setId ?? null,
            setLabel: armour?.setId ? String(armour.setId).replace(/_/g, ' ') : null,
            armourStats,
            setBonus: armour?.setBonus ?? null,
            combat,
            combatRows,
            equipGrantedStats,
            gearStats,
            gearStatKeys: gearStats.map((stat) => stat.key),
            physicalResist: getStatValue(armourStats, 'BasePhysicalDamageResistance_%') ?? 0,
            meleeDamage: combat?.toolDamage?.meleeDamage ?? 0,
            damageMultiplier: combat?.firearm?.damageMultiplier ?? 0,
            projectileDamage: combat?.ballistic?.damage ?? combat?.ammo?.projectileDamage ?? 0,
        });
    }

    return rows.sort((a, b) => a.label.localeCompare(b.label));
}

/** Whether a recipe has consumable / equip effects worth showing in a hover tooltip. */
export function recipeHasModifierTooltip(recipe = {}) {
    if (!recipe) return false;
    if ((recipe.instantStats ?? []).length > 0) return true;
    if ((recipe.equipGrantedStats ?? []).length > 0) return true;
    const modifier = recipe.modifier;
    if (!modifier) return false;
    return Boolean(modifier.description) || (modifier.grantedStats ?? []).length > 0 || modifier.lifetimeSeconds != null;
}

/** Minutes label for a modifier lifetime, or null when unset. */
export function formatModifierLifetimeMinutes(lifetimeSeconds) {
    if (lifetimeSeconds == null || Number.isNaN(Number(lifetimeSeconds))) return null;
    return Math.round(Number(lifetimeSeconds) / 60);
}

/** Trim Unreal float noise (3.5999999 → "3.6", 1.25 → "1.25", 300 → "300"). */
function formatCombatNumber(value, maxDecimals = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value ?? '');
    const rounded = Number(n.toFixed(maxDecimals));
    return String(rounded);
}

/** Flat display rows for items[*].combat (tool / firearm / ammo / attachment). */
export function buildCombatDisplayRows(combat) {
    if (!combat) return [];
    const rows = [];
    const push = (key, display) => {
        if (display) rows.push({ key, display });
    };
    const td = combat.toolDamage;
    if (td) {
        push('meleeDamage', `${formatCombatNumber(td.meleeDamage)} Melee Damage`);
        if (td.damageVariationPercent)
            push('damageVariation', `±${formatCombatNumber(td.damageVariationPercent)}% Damage Variation`);
        if (td.fellingDamage != null) push('fellingDamage', `${formatCombatNumber(td.fellingDamage)} Felling Damage`);
        if (td.fellingEfficiency != null)
            push('fellingEfficiency', `${formatCombatNumber(td.fellingEfficiency)}× Felling Efficiency`);
        if (td.miningRadius != null) push('miningRadius', `${formatCombatNumber(td.miningRadius)} Mining Radius`);
        if (td.miningEfficiency != null)
            push('miningEfficiency', `${formatCombatNumber(td.miningEfficiency)}× Mining Efficiency`);
        if (td.skinningEfficiency != null)
            push('skinningEfficiency', `${formatCombatNumber(td.skinningEfficiency)}× Skinning Efficiency`);
        if (td.reapingEfficiency != null)
            push('reapingEfficiency', `${formatCombatNumber(td.reapingEfficiency)}× Reaping Efficiency`);
        if (td.shatteringDamage != null)
            push('shatteringDamage', `${formatCombatNumber(td.shatteringDamage)} Shattering Damage`);
        if (td.shatteringEfficiency != null)
            push('shatteringEfficiency', `${formatCombatNumber(td.shatteringEfficiency)}× Shattering Efficiency`);
    }
    const firearm = combat.firearm;
    if (firearm) {
        push(
            'damageMultiplier',
            `${formatCombatNumber(firearm.damageMultiplier)}× Projectile Damage Multiplier`
        );
        if (firearm.roundsPerMinute != null)
            push('rpm', `${formatCombatNumber(firearm.roundsPerMinute)} RPM`);
        if (firearm.reloadTime != null)
            push('reloadTime', `${formatCombatNumber(firearm.reloadTime)}s Reload`);
        if (firearm.ammoCapacity != null)
            push('ammoCapacity', `${formatCombatNumber(firearm.ammoCapacity)} Ammo Capacity`);
        if (firearm.validAmmoTypes) push('validAmmo', `Ammo: ${firearm.validAmmoTypes.replace(/_/g, ' ')}`);
    }
    const ballistic = combat.ballistic;
    if (ballistic) {
        push('ballisticDamage', `${formatCombatNumber(ballistic.damage)} Projectile Damage`);
        if (ballistic.damageVariationPercent)
            push(
                'ballisticVariation',
                `±${formatCombatNumber(ballistic.damageVariationPercent)}% Damage Variation`
            );
    }
    const ammo = combat.ammo;
    if (ammo) {
        const count = ammo.projectileCount > 1 ? ` ×${formatCombatNumber(ammo.projectileCount)}` : '';
        push(
            'ammoDamage',
            `${formatCombatNumber(ammo.projectileDamage)} Projectile Damage${count}`
        );
        for (const stat of ammo.stats ?? []) {
            push(`ammo-${stat.key}`, stat.display || `${stat.key}: ${stat.value}`);
        }
    }
    for (const stat of combat.additionalStats ?? []) {
        push(`add-${stat.key}`, stat.display || `${stat.key}: ${stat.value}`);
    }
    if (combat.attachment) {
        const name = combat.attachment.displayName || combat.attachment.id;
        if (name) push('attachmentName', name);
        for (const stat of combat.attachment.stats ?? []) {
            push(`att-${stat.key}`, stat.display || `${stat.key}: ${stat.value}`);
        }
    }
    return rows;
}

const formatCostList = (costs = []) =>
    costs
        .map((cost) => `${cost.amount} ${cost.currencyDisplay || cost.currency}`)
        .filter(Boolean)
        .join(', ');

const humanizeId = (value) => (value ? String(value).replace(/_/g, ' ') : null);

const DEPLOYABLE_RESOURCE_META = {
    electricity: {
        label: 'Electricity',
        accent: '#f0c14b',
        iconPath: 'Tools/ITEM_SplineTool_Electricity',
        vicon: 'Bolt',
    },
    water: {
        label: 'Water',
        accent: '#5eb8f7',
        iconPath: 'Deployables/ITEM_SplineTool_Water',
        vicon: 'Tint',
    },
    biofuel: {
        label: 'Biofuel',
        accent: '#f07c3a',
        iconPath: 'Deployables/T_ITEM_Kit_Generator',
        vicon: 'Fire',
    },
    oxygen: {
        label: 'Oxygen',
        accent: '#8fd4ff',
        iconPath: 'Voxels/ITEM_Ore_Oxite',
        vicon: 'Wind',
    },
    crudeOil: {
        label: 'Crude oil',
        accent: '#a8843a',
        iconPath: 'Tools/T_ITEM_SplineTool_Crude_Oil',
        vicon: 'Industry',
    },
    refinedOil: {
        label: 'Refined oil',
        accent: '#d4ad3a',
        iconPath: 'Tools/T_ITEM_SplineTool_Crude_Oil',
        vicon: 'Industry',
    },
    shelter: {
        label: 'Shelter',
        accent: '#c4b59a',
        iconPath: null,
        vicon: 'Home',
    },
    generator: {
        label: 'Internal fuel',
        accent: '#f07c3a',
        iconPath: 'Deployables/T_ITEM_Kit_Generator',
        vicon: 'Fire',
    },
};

function deployableResourceMeta(resource) {
    return (
        DEPLOYABLE_RESOURCE_META[resource] ?? {
            label: humanizeId(resource) || resource,
            accent: '#a8b0bc',
            iconPath: null,
            vicon: 'Box',
        }
    );
}

/** Structured badges for deployable pipe / power UI (item detail header). */
export function buildDeployableRuntimeBadges(deployable, items = {}) {
    if (!deployable) return [];
    const badges = [];
    const powerMw = deployable.powerDrawMw;

    for (const conn of deployable.connections ?? []) {
        const meta = deployableResourceMeta(conn.resource);
        let status;
        let shortLabel = null;
        let unit = null;
        let hint = null;

        if (conn.role === 'produce') {
            status = 'produces';
            if (conn.flowRate > 0) {
                shortLabel = String(conn.flowRate);
                unit = '/s';
            }
            badges.push({
                key: `conn-${conn.resource}-${conn.role}`,
                resource: conn.resource,
                status,
                shortLabel,
                unit,
                hint,
                label: meta.label,
                accent: meta.accent,
                iconPath: meta.iconPath,
                vicon: 'ArrowUp',
            });
            continue;
        }
        if (conn.role === 'store') {
            badges.push({
                key: `conn-${conn.resource}-${conn.role}`,
                resource: conn.resource,
                status: 'storage',
                shortLabel: null,
                unit: null,
                hint: null,
                label: meta.label,
                accent: meta.accent,
                iconPath: meta.iconPath,
                vicon: meta.vicon,
            });
            continue;
        }

        status = conn.required ? 'required' : 'optional';
        if (conn.resource === 'electricity') {
            const rate = conn.flowRate > 0 ? conn.flowRate : powerMw;
            if (rate > 0) {
                shortLabel = String(rate);
                unit = 'mW';
            }
        } else if (conn.flowRate > 0) {
            shortLabel = String(conn.flowRate);
            unit = '/s';
        }
        if (conn.optionalHint) hint = conn.optionalHint;

        badges.push({
            key: `conn-${conn.resource}-${conn.role}`,
            resource: conn.resource,
            status,
            shortLabel,
            unit,
            hint,
            label: meta.label,
            accent: meta.accent,
            iconPath: meta.iconPath,
            vicon: meta.vicon,
        });
    }

    if (deployable.generator) {
        const gen = deployable.generator;
        const fuelNames = gen.fuels?.length ? gen.fuels : gen.resource ? [gen.resource] : [];
        const primaryFuel = fuelNames[0];
        const fuelMeta =
            primaryFuel && DEPLOYABLE_RESOURCE_META[String(primaryFuel).toLowerCase()]
                ? deployableResourceMeta(String(primaryFuel).toLowerCase())
                : DEPLOYABLE_RESOURCE_META.generator;
        const rate = gen.generationRate > 0 ? gen.generationRate : null;
        const fuelItems = fuelNames.map((fuelId) => {
            const fuelItem = items?.[fuelId] ?? null;
            return {
                id: fuelId,
                displayName: fuelItem?.displayName ?? humanizeId(fuelId) ?? fuelId,
                iconPath: fuelItem?.iconPath ?? null,
            };
        });
        badges.push({
            key: `generator-${primaryFuel || 'fuel'}`,
            resource: 'generator',
            status: 'internal',
            shortLabel: rate ? String(rate) : null,
            unit: rate ? '/s' : null,
            hint: null,
            label: fuelMeta.label === 'Internal fuel' ? 'Internal fuel' : `${fuelMeta.label} (internal)`,
            accent: fuelMeta.accent,
            iconPath: fuelMeta.iconPath ?? DEPLOYABLE_RESOURCE_META.generator.iconPath,
            vicon: fuelMeta.vicon ?? DEPLOYABLE_RESOURCE_META.generator.vicon,
            fuelItems,
        });
    }

    if (deployable.requiresShelter) {
        const meta = DEPLOYABLE_RESOURCE_META.shelter;
        badges.push({
            key: 'shelter',
            resource: 'shelter',
            status: 'required',
            shortLabel: null,
            unit: null,
            hint: null,
            label: meta.label,
            accent: meta.accent,
            iconPath: meta.iconPath,
            vicon: meta.vicon,
        });
    }

    return badges;
}

/** Plain-text summary lines (tests / fallbacks). */
export function formatDeployableRuntimeLines(deployable, items = {}) {
    return buildDeployableRuntimeBadges(deployable, items).map((badge) => {
        const parts = [badge.label, STATUS_TEXT_FALLBACK[badge.status] ?? badge.status].filter(Boolean);
        if (badge.shortLabel) parts.push(badge.unit ? `${badge.shortLabel}${badge.unit}` : badge.shortLabel);
        if (badge.hint) parts.push(badge.hint);
        if (badge.fuelItems?.length) {
            parts.push(badge.fuelItems.map((f) => f.displayName).join(', '));
        }
        return parts.join(' · ');
    });
}

const STATUS_TEXT_FALLBACK = {
    required: 'Required',
    optional: 'Optional',
    produces: 'Produces',
    storage: 'Storage',
    internal: 'Internal',
};

const stationLabel = (stations, stationId) =>
    stations?.[stationId]?.displayName || stations?.[stationId]?.recipeSetDisplayName || humanizeId(stationId) || stationId;

const formatTierLabel = (value) => {
    if (value == null) return null;
    if (value === 0) return 'Tier 0 (default / hand craft)';
    return `Tier ${value}`;
};

/** Clickable ref for an item / station / talent-linked craftable. */
const resolveEntityRef = (rawId, { stations = {}, items = {}, recipesById = new Map() } = {}, extras = {}) => {
    if (!rawId || rawId === 'None' || rawId === 'Character') {
        return {
            id: rawId || null,
            label: rawId === 'Character' ? 'Hand crafting' : humanizeId(rawId),
            iconPath: '',
            detailId: null,
            clickable: false,
            ...extras,
        };
    }

    const station = stations[rawId];
    const craftRecipeId = station?.craftRecipeId ?? null;
    const craftRecipe = craftRecipeId ? recipesById.get(craftRecipeId) : recipesById.get(rawId);
    const staticId = craftRecipe?.staticItemName || (items[rawId] ? rawId : null);
    const item = staticId ? items[staticId] : items[rawId];
    const detailId = staticId || craftRecipeId || (items[rawId] ? rawId : null);

    // Prefer real catalog labels only — never humanize an unknown id as a "station"
    // name before fallbackLabel (talent display names were getting clobbered, e.g.
    // Clay_Brick_Basic → "Clay Brick Basic" instead of "Clay Brick Building Base Set").
    const knownStationLabel = station?.displayName || station?.recipeSetDisplayName || null;
    let label;
    if (extras.kind === 'talent' && extras.fallbackLabel) {
        label = extras.fallbackLabel;
    } else {
        label =
            knownStationLabel ||
            item?.displayName ||
            craftRecipe?.displayName ||
            extras.fallbackLabel ||
            humanizeId(rawId);
    }

    return {
        ...extras,
        id: rawId,
        label,
        iconPath: station?.iconPath || item?.iconPath || craftRecipe?.iconPath || '',
        detailId: extras.kind === 'talent' ? null : detailId,
        clickable: extras.kind === 'talent' ? false : Boolean(detailId),
    };
};

const methodLabelFor = (method) => {
    switch (method) {
        case 'recipe_requirement':
            return 'Tech tree unlock';
        case 'station_deduced':
            return 'Unlocked by station';
        case 'default_unlocked':
            return 'Default unlock';
        case 'purchase_only':
            return 'Purchase only';
        default:
            return 'Unlock unknown';
    }
};

const buildAvailability = (tier, ctx) => {
    const method = tier?.method ?? null;
    const tierValue = tier?.value ?? null;
    const unlockRefs = [];
    let summary = null;

    if (!tier) {
        return {
            tier: null,
            tierLabel: null,
            method: null,
            methodLabel: methodLabelFor(null),
            unlockRefs: [],
            summary: 'Unlock path unknown.',
        };
    }

    if (method === 'recipe_requirement') {
        const talentId = tier.talentName;
        const talentLabel = tier.talentDisplayName || humanizeId(talentId);
        if (talentId) {
            unlockRefs.push(
                resolveEntityRef(
                    talentId,
                    ctx,
                    { fallbackLabel: talentLabel, kind: 'talent' }
                )
            );
        }
        summary = null;
    } else if (method === 'station_deduced') {
        const sources = [...(tier.stationSources ?? [])].sort((a, b) => {
            if (a.tier == null) return 1;
            if (b.tier == null) return -1;
            return a.tier - b.tier;
        });
        for (const source of sources) {
            if (!source?.station || source.station === 'Character') continue;
            unlockRefs.push(
                resolveEntityRef(source.station, ctx, {
                    tier: source.tier ?? null,
                    kind: 'station',
                })
            );
        }
        if (unlockRefs.length === 0 && tier.talentName) {
            unlockRefs.push(
                resolveEntityRef(tier.talentName, ctx, {
                    fallbackLabel: tier.talentDisplayName || humanizeId(tier.talentName),
                    kind: 'talent',
                })
            );
        }
    } else if (method === 'default_unlocked') {
        summary = 'No blueprint unlock required.';
    } else if (method === 'purchase_only') {
        summary = 'Not on the tech tree — buy from a shop or the orbital workshop.';
    } else {
        summary = 'Unlock path unknown.';
    }

    // Dedupe by detailId/id
    const seen = new Set();
    const uniqueRefs = unlockRefs.filter((ref) => {
        const key = ref.detailId || ref.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        tier: tierValue,
        tierLabel: formatTierLabel(tierValue),
        method,
        methodLabel: methodLabelFor(method),
        unlockRefs: uniqueRefs,
        summary,
    };
};

const recipeProducesStatic = (recipe, staticId) => {
    if (!recipe || !staticId) return false;
    if (recipe.staticItemName === staticId) return true;
    return (recipe.outputs ?? []).some((out) => out.id === staticId);
};

const pickEffectsRecipe = (recipes) => {
    let best = null;
    let bestScore = -1;
    for (const recipe of recipes) {
        const instant = recipe.instantStats?.length ?? 0;
        const granted = recipe.modifier?.grantedStats?.length ?? 0;
        const equip = recipe.equipGrantedStats?.length ?? 0;
        const hasModifierMeta = recipe.modifier ? 1 : 0;
        const score = instant * 4 + granted * 3 + equip * 3 + hasModifierMeta;
        if (score > bestScore) {
            best = recipe;
            bestScore = score;
        }
    }
    return best;
};

const pickPrimaryCraftRecipe = (recipes) => {
    const craft = recipes.filter((r) => r.acquisition === 'craft');
    if (craft.length === 0) return null;
    return [...craft].sort((a, b) => {
        const at = a.tier?.value;
        const bt = b.tier?.value;
        if (at == null && bt == null) return 0;
        if (at == null) return 1;
        if (bt == null) return -1;
        return at - bt;
    })[0];
};

/**
 * Resolve a static item id from either a D_ItemsStatic id or a recipe id.
 */
export function resolveCatalogStaticItemId(catalog = {}, itemOrRecipeId) {
    if (!itemOrRecipeId) return null;
    const items = catalog.items ?? {};
    if (items[itemOrRecipeId]) return itemOrRecipeId;

    const recipe = (catalog.recipes ?? []).find((row) => row.id === itemOrRecipeId);
    if (recipe?.staticItemName && items[recipe.staticItemName]) {
        return recipe.staticItemName;
    }
    if (recipe?.staticItemName) return recipe.staticItemName;
    return itemOrRecipeId;
}

/**
 * Shape a catalog / craft recipe for ItemModifierTooltip (instant + buff + equip).
 * Prefers craft `recipeData` when it has tooltip content; otherwise falls back to
 * any catalog recipe (gather/shop/workshop) that carries consumable or equip effects.
 */
export function resolveModifierTooltipRecipe(itemOrRecipeId, { catalog = {}, recipeData = {} } = {}) {
    if (!itemOrRecipeId) return null;

    const craft = recipeData[itemOrRecipeId] ?? null;
    if (craft && recipeHasModifierTooltip(craft)) return craft;

    const recipes = catalog.recipes ?? [];
    const byId = recipes.find((row) => row.id === itemOrRecipeId);
    if (byId && recipeHasModifierTooltip(byId)) {
        return {
            instantStats: byId.instantStats ?? [],
            equipGrantedStats: byId.equipGrantedStats ?? [],
            modifier: byId.modifier ?? null,
        };
    }

    const staticId = resolveCatalogStaticItemId(catalog, itemOrRecipeId);
    if (!staticId) return craft;

    const producing = recipes.filter((row) => recipeProducesStatic(row, staticId));
    const best = pickEffectsRecipe(producing);
    if (!best || !recipeHasModifierTooltip(best)) return craft;

    return {
        instantStats: best.instantStats ?? [],
        equipGrantedStats: best.equipGrantedStats ?? [],
        modifier: best.modifier ?? null,
    };
}

/**
 * Build a plain item-detail view model from the full data catalog.
 * Accepts a static item id or any recipe id that produces the item.
 */
export function buildItemDetail(catalog = {}, itemOrRecipeId) {
    const items = catalog.items ?? {};
    const stations = catalog.stations ?? {};
    const allRecipes = catalog.recipes ?? [];
    const recipesById = new Map(allRecipes.map((recipe) => [recipe.id, recipe]));
    const entityCtx = { stations, items, recipesById };
    const staticId = resolveCatalogStaticItemId(catalog, itemOrRecipeId);
    if (!staticId) return null;

    const item = items[staticId] ?? null;
    const producing = allRecipes.filter((recipe) => recipeProducesStatic(recipe, staticId));
    const recipeIdSet = new Set([...(item?.recipeIds ?? []), ...producing.map((r) => r.id)]);
    const relatedRecipes = allRecipes.filter((recipe) => recipeIdSet.has(recipe.id) || recipeProducesStatic(recipe, staticId));

    // Prefer recipe rows that produce this static id; fall back to recipeIds matches.
    const sourceRecipes = producing.length > 0 ? producing : relatedRecipes;
    const craftRecipes = sourceRecipes.filter((r) => r.acquisition === 'craft');
    const effectsRecipe = pickEffectsRecipe(sourceRecipes);
    const primaryCraft = pickPrimaryCraftRecipe(craftRecipes);

    const displayName =
        item?.displayName ??
        sourceRecipes.find((r) => r.displayName)?.displayName ??
        humanizeId(staticId);
    const description = item?.description ?? sourceRecipes.find((r) => r.description)?.description ?? null;
    const flavorText = item?.flavorText ?? null;
    const iconPath = item?.iconPath ?? sourceRecipes.find((r) => r.iconPath)?.iconPath ?? '';

    const craftTiers = craftRecipes.map((r) => r.tier?.value).filter((v) => v != null);
    const earliestTier = craftTiers.length > 0 ? Math.min(...craftTiers) : null;
    const unlockRecipe =
        primaryCraft ??
        sourceRecipes.find((r) => r.tier?.method && r.tier.method !== 'purchase_only') ??
        sourceRecipes[0] ??
        null;

    const mapStations = (stationIds = []) =>
        stationIds.map((id) => resolveEntityRef(id, entityCtx, { kind: 'station' }));

    const acquisitions = [];
    for (const recipe of sourceRecipes) {
        if (recipe.acquisition === 'craft') {
            acquisitions.push({
                type: 'craft',
                recipeId: recipe.id,
                label: 'Craft',
                stations: mapStations(recipe.stations ?? []),
                outputCount: recipe.outputCount ?? 1,
                tier: recipe.tier?.value ?? null,
            });
        }
        if (recipe.purchase?.shop) {
            const shopStationId = recipe.purchase.shop.station;
            acquisitions.push({
                type: 'shop',
                recipeId: recipe.id,
                label: 'In-world shop',
                station: shopStationId,
                stationRef: resolveEntityRef(shopStationId, entityCtx, { kind: 'station' }),
                stationLabel: stationLabel(stations, shopStationId),
                costsLabel: formatCostList(recipe.purchase.shop.costs),
            });
        }
        if (recipe.purchase?.workshop) {
            const workshop = recipe.purchase.workshop;
            acquisitions.push({
                type: 'workshop',
                recipeId: recipe.id,
                label: 'Orbital workshop',
                researchLabel: formatCostList(workshop.researchCost),
                replicationLabel: formatCostList(workshop.replicationCost),
                requiredMission: workshop.requiredMission ?? null,
            });
        }
        if (recipe.acquisition === 'gather') {
            acquisitions.push({ type: 'gather', recipeId: recipe.id, label: 'Gathered / world' });
        }
        if (recipe.acquisition === 'mission') {
            acquisitions.push({ type: 'mission', recipeId: recipe.id, label: 'Mission / faction' });
        }
    }

    if (acquisitions.length === 0) {
        if (item?.gatherFirst) {
            acquisitions.push({ type: 'gather', recipeId: null, label: 'Gathered (world resource)' });
        } else if (!(item?.recipeIds?.length > 0)) {
            acquisitions.push({ type: 'gather', recipeId: null, label: 'Raw material / no craft recipe' });
        }
    }

    // Dedupe acquisitions by what the player sees (type / tier / stations / costs),
    // not recipe id — alternate recipes often share the same stations.
    const seenAcquisition = new Set();
    const uniqueAcquisitions = acquisitions.filter((entry) => {
        const stationKey = (entry.stations || [])
            .map((s) => s.id)
            .filter(Boolean)
            .sort()
            .join(',');
        const key = [
            entry.type,
            entry.tier ?? '',
            entry.outputCount ?? '',
            stationKey,
            entry.station ?? '',
            entry.costsLabel ?? '',
            entry.researchLabel ?? '',
            entry.replicationLabel ?? '',
            entry.requiredMission ?? '',
            entry.type === 'gather' || entry.type === 'mission' ? entry.label ?? '' : '',
        ].join('|');
        if (seenAcquisition.has(key)) return false;
        seenAcquisition.add(key);
        return true;
    });

    const recipes = craftRecipes.map((recipe) => ({
        id: recipe.id,
        outputCount: recipe.outputCount ?? 1,
        stations: mapStations(recipe.stations ?? []),
        locks: normalizeLocks(recipe.locks),
        ingredients: (recipe.ingredients ?? []).map((ing) => {
            const ingItem = items[ing.id];
            return {
                id: ing.id,
                count: ing.count,
                label: getItemLabel(ing.id, { displayName: ingItem?.displayName }),
                iconPath: ingItem?.iconPath ?? '',
            };
        }),
    }));

    const usedInMap = new Map();
    for (const recipe of allRecipes) {
        if (recipe.acquisition !== 'craft') continue;
        const match = (recipe.ingredients ?? []).find((ing) => ing.id === staticId);
        if (!match) continue;
        if (usedInMap.has(recipe.id)) continue;
        const outItem = recipe.staticItemName ? items[recipe.staticItemName] : null;
        usedInMap.set(recipe.id, {
            recipeId: recipe.id,
            staticItemName: recipe.staticItemName ?? null,
            label: getItemLabel(recipe.id, {
                displayName: recipe.displayName ?? outItem?.displayName,
            }),
            iconPath: recipe.iconPath ?? outItem?.iconPath ?? '',
            count: match.count,
        });
    }
    const usedIn = [...usedInMap.values()].sort((a, b) => a.label.localeCompare(b.label));

    const instantStats = effectsRecipe?.instantStats ?? [];
    const equipGrantedStats = effectsRecipe?.equipGrantedStats ?? [];
    const modifier = effectsRecipe?.modifier ?? null;

    const availability = buildAvailability(unlockRecipe?.tier, entityCtx);
    if (earliestTier != null) {
        availability.tier = earliestTier;
        availability.tierLabel = formatTierLabel(earliestTier);
    }

    const deployable =
        item?.deployable ?? stations[staticId]?.deployable ?? null;
    const deployableBadges = buildDeployableRuntimeBadges(deployable, items);
    const combat = item?.combat ?? null;
    const combatRows = buildCombatDisplayRows(combat);
    const armour = item?.armour ?? null;

    return {
        id: staticId,
        displayName: getItemLabel(staticId, { displayName }),
        description,
        flavorText,
        iconPath,
        gatherFirst: Boolean(item?.gatherFirst),
        mission: Boolean(item?.mission || sourceRecipes.some((r) => r.mission || r.acquisition === 'mission')),
        foodAudience: item?.foodAudience ?? null,
        locks: normalizeLocks(item?.locks),
        deployableBadges,
        combat,
        combatRows,
        armour,
        availability,
        effects: {
            instantStats,
            modifier: modifier
                ? {
                      displayName: modifier.displayName ?? modifier.name ?? null,
                      description: modifier.description ?? null,
                      lifetimeMinutes: formatModifierLifetimeMinutes(modifier.lifetimeSeconds),
                      grantedStats: modifier.grantedStats ?? [],
                  }
                : null,
            equipGrantedStats,
        },
        acquisitions: uniqueAcquisitions,
        recipes,
        usedIn,
    };
}
