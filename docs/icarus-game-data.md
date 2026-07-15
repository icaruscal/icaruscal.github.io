# Icarus Game Data Reference

Reference notes on how Icarus (the survival game) stores its gameplay data, how we extract it, and how the
`scripts/build-data-catalog.ts` script joins it into `data-catalog.json`.
Written to assist future AI/dev sessions — read this before spelunking the raw exports.

**Raw export path:** set `ICARUS_EXTRACTED_GAME_FILES_FOLDER` in `.env.development` (see
`.env.development.example`). That directory is the Ue4Export output root (e.g. WSL `/mnt/d/IC_Export`
for Windows `D:\IC_Export`). Data tables live under
`<ICARUS_EXTRACTED_GAME_FILES_FOLDER>/data/<Category>/D_*.json`. Do not assume a hardcoded path.

## 1. Extracting game data

- Tool: [Ue4Export](https://github.com/CrystalFerrai/Ue4Export/releases) (needs .NET 8). Icarus is **UE4.27**.
- Run on Windows against the game install (e.g. `D:\SteamLibrary\steamapps\common\Icarus\`):
  - `Icarus\Content\Paks` → texture/asset exports (`scripts/Ue4ExportFiles/assetlist.txt`)
  - `Icarus\Content\Data` → JSON data tables (`scripts/Ue4ExportFiles/assetlist_data.txt`)
- See `scripts/Ue4ExportFiles/export.bat` and the README. Point
  `ICARUS_EXTRACTED_GAME_FILES_FOLDER` at the export root you produce, then use that path for
  `yarn build-data-catalog` and when inspecting raw `D_*.json` tables.
- Game build version is **not** inside the DataTables. `export.bat` copies
  `<IcarusInstall>/Icarus/Config/version.json` to the export root. That file is synced into
  `data/icarus-game/version.json` and shown in the site header as `v{Major}.{Minor}.{Patch}`
  (hover tooltip: full `v…-rel-{FeatureLevel}` build string + `extractedAt` date from export).
  `yarn build-data-catalog` / `yarn prepare-data-catalog` also set `catalogHash` on that file
  (content hash of the minified catalog) for client cache-busting.

### Data table format

Every `D_*.json` file is an Unreal DataTable dump:

```json
{
    "RowStruct": "/Script/Icarus.SomeRowType",
    "Defaults": { ...default values applied to every row... },
    "Rows": [ { "Name": "Row_Key", ...overrides... } ]
}
```

- Rows reference each other with `{ "RowName": "...", "DataTableName": "D_Other" }` pairs.
- `"None"` means unset. Defaults matter: a missing field on a row means "use the value in `Defaults`".
- Localized strings look like `NSLOCTEXT("D_Table", "Key", "Actual Text")` or `INVTEXT("[DNT] internal text")`
  (`DNT` = do-not-translate, usually internal/unfinished content).
- Stat map keys are serialized oddly: `"(Value=\"BaseFoodRecovery_+\")": 150` — parse the inner name out.

## 2. Item data model (join chain)

To get from a craftable recipe to display info and stats:

```text
D_ProcessorRecipes (Crafting/)        recipe: stations, inputs, outputs
  └─ Outputs[].Element.RowName ──► D_ItemTemplate (Items/)
        └─ ItemStaticData.RowName ──► D_ItemsStatic (Items/)
              ├─ Itemable.RowName   ──► D_Itemable (Traits/)      name, description, icon
              ├─ Consumable.RowName ──► D_Consumable (Traits/)    instant stats + modifier ref
              │     └─ Modifier.Modifier.RowName ──► D_ModifierStates (Modifiers/)  buff stats
              └─ Equippable.RowName ──► D_Equippable (Traits/)    armor/tool granted stats
```

Key tables:

| Table | Path | Holds |
|---|---|---|
| `D_ProcessorRecipes` | `Crafting/` | All craft recipes: `RecipeSets` (stations), `Inputs`, `Outputs`, optional `Requirement` (talent) |
| `D_RecipeSets` | `Crafting/` | Station / recipe-set ids + `RecipeSetName` / icon (e.g. `Kitchen_Stove` → "Kitchen Stove"; deployable item label may differ, e.g. "Biofuel Stove") |
| `D_Processing` | `Traits/` | Deployable Processing → `DefaultRecipeSet` when ids differ (e.g. `T3_Cleaning_Device` → `Cleaning_Device`) |
| `D_ItemTemplate` | `Items/` | Thin wrapper: template name → static item row |
| `D_ItemsStatic` | `Items/` | The item hub: links to all trait tables + gameplay tags |
| `D_Itemable` | `Traits/` | DisplayName, Description, FlavorText, Icon |
| `D_Consumable` | `Traits/` | Instant `Stats` on consumption (e.g. `BaseFoodRecovery_+`), `Modifier` ref + `ModifierLifetime` (seconds) |
| `D_ModifierStates` | `Modifiers/` | Buff (`GrantedStats`), display name/description, merge behavior |
| `D_Equippable` | `Traits/` | `GrantedStats` / `GlobalStat_GrantedStats` for equipment |
| `D_Stats` | `Stats/` | Stat key → UI text templates (`PositiveDescription`/`NegativeDescription`, `{0}` = abs value) |

### Stats example (Fruit Pie)

- `D_Consumable[Fruit_Pie].Stats` → `BaseFoodRecovery_+: 150` → "+150 Food when Consumed" (instant)
- `D_Consumable[Fruit_Pie].Modifier` → modifier `Fruit_Pie`, lifetime 1200s
- `D_ModifierStates[Fruit_Pie].GrantedStats` → `+75 Max Health, +150 Max Stamina, -15% Oxygen/Water Consumption, +10% XP, 1 stomach slot`
- Stat key suffix conventions: `_+` = flat amount, `_+%` = percentage. Negative values use `NegativeDescription`.

## 3. Tech tier / unlock deduction

**There is no tier field on items or recipes.** Tier comes from the blueprint talent tree:

- `D_Talents` (Talents/): each blueprint talent has `TalentTree.RowName` like `Blueprint_T3_Machine`.
  Parse the tier from the tree name: `Blueprint_T(\d)_...` → tiers 1–5
  (`T1_Player`, `T2_Crafting`, `T3_Machine`, `T4_Fabricator`, `T5_Manufacturer`, in `D_TalentTrees`).
- Talents also carry `RequiredTalents` (prereq graph), `RequiredLevel`, `bDefaultUnlocked`.
- `D_BlueprintUnlocks.json` is **empty** in current exports — talents ARE the blueprint system.

Resolution order used by the catalog script:

1. If the recipe has `Requirement.RowName` (a talent) → tier from that talent's tree.
2. Else, if the only station is `Character` → tier 0 (hand-craftable by default).
3. Else, resolve each station in `RecipeSets`:
   - find a talent with the station's name (case-insensitive: data has mismatches like `Firepit` vs `FirePit`),
   - or find the station's own craft recipe and use its `Requirement` talent.
   - **Item tier = minimum tier across its stations** (earliest availability).

Example: Fruit Pie has no Requirement; stations are `Kitchen_Stove` (Biofuel Stove, talent in
`Blueprint_T3_Machine` → T3) and `Electric_Stove` (T4) → **unlocks at Tier 3**.

Known gaps:

- `T4_Smoker` ("Advanced Smoker", `Item_Smoker_T4`) exists as an item/deployable + recipe set but has **no talent
  and no craft recipe** in the export — its recipes get `partial_station_tier_gaps`. RecipeSet name is
  `[DNT] Electic Smoker`, likely unfinished content. Tier still resolves via the other stations (e.g. Drying Rack T1).
- Mission/faction recipes (`Mission_*`, `ResearchEquipment_*`) reference non-blueprint talent trees.

## 4. Purchasable items (two systems)

### A. Orbital Workshop (`Meta_*` items)

- Table: `MetaWorkshop/D_WorkshopItems.json`. Row → `Item.RowName` (a `D_ItemTemplate` row).
- Two costs, each a list of `{ Meta: {RowName → D_MetaCurrency}, Amount }`:
  - `ResearchCost` — one-time unlock
  - `ReplicationCost` — per copy purchased
- Optional `RequiredMission`.
- `Currency/D_MetaCurrency.json`: `Credits` displays as **"Ren"**; others: `Exotic1` (Exotics), `Exotic_Red`,
  `Biomass` (Legendary Biomass), `Licence`, `Exotic_Uranium`, `Biomass_Converter` (Flux).
- Examples: `Meta_Ration` (MicroMeal) research 25 / replicate 10 Ren; `Meta_Oxygen_Gel` (Oxygel) 25 / 10 Ren;
  `Meta_Super_Ration` (UltraMeal) 50 / 25 Ren.

### B. In-world shops (recipes paid with currency items)

- Still in `D_ProcessorRecipes`, but the station is a `*_Shop` recipe set (e.g. `Food_Shop`) and the `Inputs`
  are currency **items** from `D_ItemsStatic` (`Ren`, `Biomass`, `MetaResource`, `Exotic_Red`, `Uranium_Rod`, `Licence`).
- Price = the input count. Example: `Food_Gruel` = 1 Ren at `Food_Shop` (Dangerous Horizons feature).
- Currency items map back to `D_MetaCurrency` rows via `ItemStaticData.RowName`.
- Some items exist in BOTH systems (Oxygel/MicroMeal have a Food_Shop recipe and a workshop entry).

## 5. The data catalog script

`scripts/build-data-catalog.ts`, run with `yarn build-data-catalog <exportPath> [prettyOutFile]`
(`tsx` runner; exportPath can be the export root or its `data/` dir).

| Artifact | Path | When |
|---|---|---|
| Pretty (dev / git) | `data/icarus-game/data-catalog.json` | `yarn build-data-catalog` (always) |
| Minified (app / deploy) | `public/icarus-game/Data/data-catalog.json` | same command, or `yarn prepare-data-catalog` / `yarn build` |
| Game + catalog cache key | `data/icarus-game/version.json` (+ public copy) | same; `catalogHash` = first 12 hex of SHA-256(minified catalog) |

Minified files under `public/...` are gitignored; Vite’s `dataCatalogPlugin` regenerates them on build and serves the pretty file during `yarn dev` at `/icarus-game/Data/data-catalog.json`. GitHub Pages gzip-compresses the minified `.json` on the fly.

`meta` omits per-build / machine-local fields (`generatedAt`, `exportPath`, `dataRoot`) so `catalogHash` stays stable when gameplay content is unchanged. The app loads `version.json` with `cache: 'no-store'`, then fetches `data-catalog.json?v=${catalogHash}`.

**Purpose:** one pre-joined JSON for the crafting calculator (and item browsing). The app can stop
fetching / client-joining `D_ProcessorRecipes`, `D_ItemTemplate`, `D_ItemsStatic`, `D_Itemable`
(and related trait tables) once it loads this file.

### Source tables read by the script

| Relative path | Used for |
|---|---|
| `Crafting/D_ProcessorRecipes.json` | Recipes, inputs, outputs, stations, shop detection |
| `Crafting/D_RecipeSets.json` | Station display names / icons (optional if missing) |
| `Traits/D_Processing.json` | RecipeSet → deployable remap when ids differ (optional) |
| `Items/D_ItemTemplate.json` | Output template → static item |
| `Items/D_ItemsStatic.json` | Trait links; ingredient/raw material ids |
| `Traits/D_Itemable.json` | DisplayName, Description, Icon |
| `Traits/D_Consumable.json` / `D_Equippable.json` | Instant / equip stats |
| `Modifiers/D_ModifierStates.json` | Buff granted stats |
| `Stats/D_Stats.json` | Human-readable stat templates |
| `Talents/D_Talents.json` | Tier deduction |
| `MetaWorkshop/D_WorkshopItems.json` | Orbital workshop purchases |
| `Currency/D_MetaCurrency.json` | Ren / Exotics display names |

### Output shape

Top-level keys: `meta`, `recipes`, `items`, `stations`.

**Compact emit (same key names):** null / `[]` fields are omitted (treat missing as the default). Display
(`displayName` / `description` / `iconPath`) lives on `items` / `stations`; recipes only carry those when
there is no `staticItemName` (or values differ). Raw Unreal `icon`, `lookup`, and `reviewQueue` are not shipped
(`items[*].recipeIds` + `meta.reviewQueueCount` / `flagSummary` cover the same info).

```jsonc
{
  "meta": {
    "recipeCount": 2538,
    "craftCount": 2164,
    "itemCount": 2504,
    "rawMaterialCount": 626,   // items with no / empty recipeIds
    "gatherFirstCount": 27,    // Item.Resource.Ore* / Wood / Fiber / … — terminal even with recipeIds
    "stationCount": 68,
    "shopCount": 40,
    "workshopCount": 334,
    "reviewQueueCount": 199,
    "flagSummary": { /* ... */ },
    "notes": { /* usage hints written by the script */ }
  },
  "recipes": [
    {
      "id": "Fruit_Pie",                 // D_ProcessorRecipes.Name (or D_WorkshopItems.Name)
      "acquisition": "craft",            // craft | shop | workshop
      // purchase omitted unless shop/workshop
      "templateName": "Fruit_Pie",
      "staticItemName": "Food_Fruit_Pie", // → items[staticItemName] for label / icon
      "stations": ["Kitchen_Stove", "Electric_Stove"],
      "ingredients": [{ "id": "Pastry", "count": 1, "table": "D_ItemsStatic" }],
      "outputCount": 1,
      // Multi-output only: recipes[].outputs[{ id, templateName, count }]; each output gets items[id].recipeIds
      // ResourceInputs (Water/Biofuel/…) become ingredients with table "Resource"
      "consumableName": "Fruit_Pie",
      "instantStats": [{ "key": "BaseFoodRecovery_+", "value": 150, "display": "+150 Food when Consumed" }],
      "modifier": {
        "name": "Fruit_Pie",
        "displayName": "Fruit Pie",
        "description": "...",
        "lifetimeSeconds": 1200,
        "grantedStats": [ /* same {key,value,display} shape */ ]
      },
      "tier": {
        "value": 3,
        "method": "station_deduced",
        "talentName": "Kitchen_Stove",
        "talentTree": "Blueprint_T3_Machine",
        "stationSources": [
          { "station": "Kitchen_Stove", "tier": 3, "talentName": "Kitchen_Stove" },
          { "station": "Electric_Stove", "tier": 4, "talentName": "Electric_Stove" }
        ]
      },
      "flags": ["multi_station_tiers"]
    }
  ],
  "items": {
    // Every referenced D_ItemsStatic id (recipe outputs + all ingredients), including raw mats
    "Berry": {
      "id": "Berry",
      "displayName": "Wild Berry",
      "description": "...",
      "iconPath": "Consumeables/ITEM_Berries"
      // no recipeIds → gather / raw
    },
    "Oxite": {
      "id": "Oxite",
      "displayName": "Oxite",
      "iconPath": "Voxels/ITEM_Ore_Oxite",
      "recipeIds": ["Pyritic_Crust_Oxite", "Rock_Golem_Armor_Fragment_Oxite"],
      "gatherFirst": true   // Item.Resource.Ore* — tree stops; conversions are optional
    },
    "Wood_Refined": {
      "id": "Wood_Refined",
      "displayName": "Refined Wood",
      "iconPath": "Resources/ITEM_Wood_Refined",
      "recipeIds": ["Refined_Wood"]       // recipe id ≠ static id — use this for tree recursion
    },
    "Pastry": {
      "id": "Pastry",
      "displayName": "Pastry",
      "iconPath": "Consumeables/ITEM_Pastry",
      "recipeIds": ["Pastry", "Pastry_Butter"]  // alternate recipes for the same output
    }
  },
  "stations": {
    "Kitchen_Stove": {
      "id": "Kitchen_Stove",
      "displayName": "Biofuel Stove",     // prefers deployable item label when a craft recipe exists
      "recipeSetDisplayName": "Kitchen Stove",
      "iconPath": "Deployables/T_ITEM_Kitchen_Stove",
      "craftRecipeId": "Kitchen_Stove"    // omitted when no craft recipe
    },
    "Cleaning_Device": {
      "id": "Cleaning_Device",
      // RecipeSet id ≠ craftable: D_Processing T3_Cleaning_Device → Cleaning_Device
      "displayName": "Biofuel Bio-Cleaner",
      "recipeSetDisplayName": "Cleaning Device",
      "iconPath": "Deployables/T_ITEM_T3_Cleaning_Device",
      "craftRecipeId": "T3_Cleaning_Device"
    },
    "Character": {
      "id": "Character",
      "displayName": "Character",
      "recipeSetDisplayName": "Character"
      // no iconPath / craftRecipeId
    }
  }
}
```

### Mapping from current `recipeData` (app) → catalog

| App `recipeData` field | Catalog |
|---|---|
| keyed by `recipe.Name` | `recipes[].id` |
| `label` | `items[staticItemName].displayName` (or `items[ingredientId]`) |
| `iconPath` | `items[…].iconPath` / `stations[id].iconPath` |
| `inputs[].id` / `.quantity` | `ingredients[].id` / `.count` |
| `sources` | `stations` (string ids); labels in `stations[id].displayName` |
| `preferredSource` | runtime only (not in catalog) |
| `outputQuantity` | `outputCount` |
| `outputItemId` | `templateName` |
| `itemStaticId` | `staticItemName` |
| alias lookup (`Wood_Refined` → refined wood recipe) | `items[id].recipeIds` |
| raw mat label via `D_Itemable` | `items[id]` (no / empty `recipeIds`) |

### Using it for crafting trees

1. Filter `recipes` where `acquisition === "craft"` for search / top-level pickers.
2. Display: `items[recipe.staticItemName]` (or recipe-level display fields if that join is missing); child nodes use `items[ingredientId]`.
3. Station labels / icons: `stations[stationId]` (prefer `displayName` over `recipeSetDisplayName`).
4. Recurse: `const next = items[ingredient.id].recipeIds ?? []`.
   - `[]` / missing → treat as raw (`isRaw`)
   - `items[id].gatherFirst === true` → treat as gather terminal (`isRaw`) even if `recipeIds` is non-empty
     (conversion paths like Quarrite Armor Fragment → Oxite stay on `recipeIds` but are not used for the tree)
   - length > 1 → alternate recipes (e.g. `Pastry` vs `Pastry_Butter`); default to `[0]` until the UI offers a picker
5. Quantity math: `ceil`/`requested / outputCount` × each `ingredients[].count` (same as today’s tree). For a secondary multi-output product, divide by that product’s count in `recipes[].outputs` (not the primary `outputCount`).
6. Ignore shop/workshop rows in the calculator (`purchase` present; no `ingredients`).

### Gather-first materials (`items[*].gatherFirst`)

Some world resources also appear as **outputs** of optional conversion recipes (Quarrite armor fragments,
pyritic crust, frozen ore thaw, terraforming dust → ore). Those recipes are real and stay in `recipes` /
`items[*].recipeIds`, but the crafting calculator should still stop at the ore (or wood, etc.) as a
gathered node.

Detection (in `build-data-catalog.ts` from `D_ItemsStatic.Manual_Tags`):

- Tag matches `Item.Resource.Ore` / `Item.Resource.Ore.*`
- Or similar gather tags: `Item.Resource.Wood`, `.Fiber`, `.Stone`, `.Stick`, `.Leather`, `.Bone`, `.Fur`, `.Ice`

Excluded on purpose: bare `Item.Resource`, `Item.Resource.Ingot` (refined / craftable), `Item.ResourceGenerator.*`.

Loader (`processCatalogData`): does **not** alias `recipeData[staticId]` for `gatherFirst` items (and still
skips “selfish” converters where input id === recipe id). Tree `isRaw` then follows `!recipeData[itemId]`.

### Semantics

- `acquisition: "shop" | "workshop"` → purchase-only: `tier.method = "purchase_only"`, no `stations` / `ingredients`.
  Workshop-only items (no processor recipe) use `id` = `D_WorkshopItems` row name.
- Tier `method` values: `recipe_requirement`, `station_deduced`, `default_unlocked` (tier 0), `purchase_only`, `unknown`.
- Missing `iconPath` means none / Unreal icon outside `Item_Icons/` (e.g. Character crafting).
- `items` covers every static id referenced as an output or ingredient; raw materials omit `recipeIds`.
- `gatherFirst: true` → world-gather primary; omit when false (compact emit).
- Loader defaults: missing `purchase` / `modifier` / `instantStats` / `equipGrantedStats` / `flags` / `stations` /
  `ingredients` → `null` or `[]` as appropriate.

### Flags

Informational flags stay on the recipe; `meta.reviewQueueCount` counts rows with any review flag
(filter `recipes` by those flags if you need the list).

| Flag | Meaning |
|---|---|
| `no_granted_stats` | Item grants no stats (most non-food items). Informational. |
| `multi_station_tiers` | Craftable at stations of different tiers; `tier.value` is the minimum. Informational. |
| `partial_station_tier_gaps` | Some station's tier couldn't be resolved (tier still deduced from others). Review. |
| `tier_unknown` | No tier could be deduced at all. Review. |
| `missing_station_talent` / `missing_requirement_talent` | Talent lookup failed. Review. |
| `missing_output_template` / `missing_static_item` / `missing_itemable` / `missing_consumable_row` / `missing_modifier_row` | Broken join in the item chain. Review. |
| `unknown_stat_key` | Stat key not found in `D_Stats`. Review. |
| `unknown_currency` / `shop_price_missing` | Purchase cost couldn't be resolved. Review. |
| `recipe_disabled` | `bForceDisableRecipe` set. Review. |
| `non_blueprint_talent_tree` | Requirement talent sits in a non-`Blueprint_T*` tree (missions etc). Review. |

Snapshot from the 2026-07 export: **2538** recipes (2164 craft, 40 shop, 334 workshop); **2504** items
(626 raw, 27 gather-first); **68** stations; 363 grant stats; 59 unknown tier; 199 in review queue.

## 6. Misc facts worth remembering

- The web app loads `/icarus-game/Data/version.json` first (for game version + `catalogHash`), then
  `/icarus-game/Data/data-catalog.json?v=<catalogHash>` (`src/store/icarus.js` → `processCatalogData`).
  Raw `D_*.json` tables are not shipped under `public/`; read them from the Ue4Export when rebuilding the catalog
  or syncing icons (`yarn update-game-assets` uses export `Traits/D_Itemable.json`).
  `yarn update-game-assets` preserves an existing `catalogHash` when refreshing version from the export;
  re-run `yarn build-data-catalog` or `yarn prepare-data-catalog` after catalog changes.
- Weather has its own unrelated `Tier` fields (`Weather/D_WeatherEvents.json`) — do not confuse with tech tiers.
- `D_TalentRanks` (Novice/Apprentice/Journeyman/Master) is about talent point investment, not tech tiers.
- Feature gating: rows may carry `Metadata.RequiredFeatureLevel` (e.g. `DangerousHorizons`, `GreatHunts`, `NewFrontiers`).
- Item icons export to `export/Icarus/Content/Assets/2DArt/UI/Items/Item_Icons`; the app serves them from
  `public/icarus-game/ItemIcons` (synced via `yarn update-game-assets`).
