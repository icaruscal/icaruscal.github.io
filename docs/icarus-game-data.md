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
| `Traits/D_Resource.json` | Deployable pipe connections (energy / water / fuel / …) |
| `Traits/D_Energy.json` / `D_Water.json` / `D_Fuel.json` / `D_Oxygen.json` / `D_CrudeOil.json` / `D_RefinedOil.json` | Per-connection flow rates and optional vs required |
| `Traits/D_Generator.json` | Internal fuel (biofuel / wood) for devices without a grid connection |
| `Resources/D_OptionalResourceFlows.json` | UI hints for optional connections (`per recipe`, `for boost`, …) |
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
    "animalFoodCount": 17,     // items[*].foodAudience === "animal"
    "prospectorFoodCount": 205,// items[*].foodAudience === "prospector"
    "stationCount": 68,
    "deployableCount": 221,  // items with items[*].deployable
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
        "talentDisplayName": "Biofuel Stove", // when D_Talents.DisplayName is set
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
      "flavorText": "...",          // D_Itemable.FlavorText (omitted when empty)
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
    "Food_Animal_Feed": {
      "id": "Food_Animal_Feed",
      "displayName": "Seed Animal Feed",
      "iconPath": "Consumeables/T_ITEM_Animal_Feed",
      "recipeIds": ["Food_Animal_Feed"],
      "foodAudience": "animal"   // Manual_Tags Item.AnimalFeed
    },
    "Food_Fruit_Pie": {
      "id": "Food_Fruit_Pie",
      "displayName": "Fruit Pie",
      "iconPath": "Consumeables/ITEM_Fruit_Pie",
      "recipeIds": ["Fruit_Pie"],
      "foodAudience": "prospector"   // Manual_Tags Item.Consumable.Food.Cooked.Fruit
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
    },
    "Kitchen_Stove": {
      "id": "Kitchen_Stove",
      "displayName": "Biofuel Stove",
      "iconPath": "Deployables/T_ITEM_Kitchen_Stove",
      "recipeIds": ["Kitchen_Stove"],
      "deployable": {
        "powerDrawMw": 375,
        "requiresShelter": true,
        "connections": [
          {
            "resource": "water",
            "role": "consume",
            "required": false,
            "optionalHint": "per recipe",
            "flowRate": 0
          }
        ],
        "generator": {
          "resource": "Energy",
          "generationRate": 500,
          "generationRatio": 50,
          "fuels": ["Biofuel"]
        }
      }
    }
  },
  "stations": {
    "Kitchen_Stove": {
      "id": "Kitchen_Stove",
      "displayName": "Biofuel Stove",     // prefers deployable item label when a craft recipe exists
      "recipeSetDisplayName": "Kitchen Stove",
      "iconPath": "Deployables/T_ITEM_Kitchen_Stove",
      "craftRecipeId": "Kitchen_Stove",   // omitted when no craft recipe
      "deployable": { /* same shape as items[*].deployable — copied from linked deployable */ }
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

### Food audience (`items[*].foodAudience`)

Consumables intended for animals vs prospectors are tagged on `D_ItemsStatic.Manual_Tags` (not on
`D_Consumable`):

| Tag | Catalog value | Examples |
|---|---|---|
| `Item.AnimalFeed` | `"animal"` | Animal feed, gruel, silage |
| `Item.Consumable.Food` / `Item.Consumable.Food.*` | `"prospector"` | Fruit Pie, cooked meats, berries |

Animal feed also typically uses `Actionable: Animal_Feed` (feed mount only) instead of
`Generic_Consumable` + `Usable: Consume_Stack_Food`. Food trough / diet tag queries often accept
**both** `Item.Consumable.Food` and `Item.AnimalFeed`, so prospector food can still be eaten by
animals — `foodAudience` marks design intent.

Explore filters this via `aud=prospector,animal,other` (other = no `foodAudience`).

### Semantics

- `acquisition: "shop" | "workshop"` → purchase-only: `tier.method = "purchase_only"`, no `stations` / `ingredients`.
  Workshop-only items (no processor recipe) use `id` = `D_WorkshopItems` row name.
- Tier `method` values: `recipe_requirement`, `station_deduced`, `default_unlocked` (tier 0), `purchase_only`, `unknown`.
- Missing `iconPath` means none / Unreal icon outside `Item_Icons/` (e.g. Character crafting).
- `items` covers every static id referenced as an output or ingredient; raw materials omit `recipeIds`.
- `flavorText` comes from `D_Itemable.FlavorText` (compact-omitted when empty).
- `gatherFirst: true` → world-gather primary; omit when false (compact emit).
- `foodAudience: "animal" | "prospector"` → designed consumer from `Manual_Tags`
  (`Item.AnimalFeed` vs `Item.Consumable.Food*`); omit when neither applies. Animals can still eat many
  prospector foods — this is design intent, not exclusive edibility.
- `tier.talentDisplayName` is the talent's UI label when present (compact-omitted when null).
- `items[*].deployable` / `stations[*].deployable` — pipe / power / internal-fuel requirements for placeables
  (see §7). Omitted when the item is not a deployable or has nothing to report.
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
(626 raw, 27 gather-first); **68** stations; **221** deployables with runtime data; 363 grant stats; 59 unknown tier; 199 in review queue.

## 7. Deployable runtime (pipes / power / fuel)

Separate from **recipe** `ResourceInputs` (per-craft water/biofuel/oil costs on `recipes[].ingredients` with
`table: "Resource"`). Those are craft costs; this section is about **running a placed deployable**.

### Join chain

When a `D_ItemsStatic` row has a `Deployable` trait, the catalog joins:

```text
D_ItemsStatic
  ├─ Processing.RowName ──► D_Processing     MaxMilliwattage, bRequiresShelter, RequiresEnergy
  ├─ Resource.RowName   ──► D_Resource       bHas*Connection + *Flow refs
  │     └─ EnergyFlow / WaterFlow / FuelFlow / OxygenFlow / CrudeOilFlow / RefinedOilFlow
  │           ──► D_Energy / D_Water / D_Fuel / D_Oxygen / D_CrudeOil / D_RefinedOil
  │           ResourceFlowRate, FlowType, bIsOptional, OptionalFlowType
  │                 ──► D_OptionalResourceFlows (ShortMessage → optionalHint)
  └─ Generator.RowName  ──► D_Generator     internal inventory fuel — not a pipe
        GenerationRate, GenerationRatio, TransmutableResources / TransmutableItems → fuels[]
```

Emitted on **`items[*].deployable`** for every placeable that has usable runtime data (`meta.deployableCount`,
~221 rows) and copied to **`stations[*].deployable`** when the recipe set links to a deployable item
(via `D_Processing.DefaultRecipeSet` + static `Processing` / `Deployable` traits).

### Catalog `deployable` shape

| Field | Meaning |
|---|---|
| `powerDrawMw` | `D_Processing.MaxMilliwattage` — draw while processing (milliwatts); omit / null when 0 |
| `requiresShelter` | `D_Processing.bRequiresShelter` |
| `connections[]` | Pipe/grid hooks from `D_Resource` (omit empty) |
| `connections[].resource` | `electricity` \| `water` \| `biofuel` \| `oxygen` \| `crudeOil` \| `refinedOil` |
| `connections[].role` | `consume` \| `produce` \| `store` (from flow `FlowType`) |
| `connections[].required` | `false` when flow `bIsOptional` (optional pipe) |
| `connections[].optionalHint` | Parsed `D_OptionalResourceFlows.ShortMessage` (e.g. `per recipe`, `for boost`) |
| `connections[].flowRate` | Flow `ResourceFlowRate` (units/s). Electricity UI often uses `powerDrawMw` when this is 0 |
| `generator` | Present when `D_Generator` trait exists — burns inventory items / resource types |
| `generator.resource` | What the generator produces internally (usually `Energy`) |
| `generator.generationRate` | Burn / generation rate (game units/s) |
| `generator.generationRatio` | Optional ratio when set |
| `generator.fuels` | Accepted fuel ids: `TransmutableResources` values (e.g. `Biofuel`) and/or `TransmutableItems` row names (e.g. `Wood`, `Fiber`) |

Example (`Kitchen_Stove` item):

```jsonc
"deployable": {
  "powerDrawMw": 375,
  "requiresShelter": true,
  "connections": [
    { "resource": "water", "role": "consume", "required": false, "optionalHint": "per recipe", "flowRate": 0 }
  ],
  "generator": {
    "resource": "Energy",
    "generationRate": 500,
    "generationRatio": 50,
    "fuels": ["Biofuel"]
  }
}
```

Campfire / stone furnace style devices often have **no** pipe `connections` and only a `generator` with
item fuels (`Fiber`, `Stick`, `Wood`, `Wood_Refined`, `Coal_Ore`, …).

### UI (item detail modal)

| Piece | Role |
|---|---|
| `buildItemDetail` → `deployableBadges` | From `items[id].deployable` (or linked `stations[id].deployable`) |
| `buildDeployableRuntimeBadges(deployable, items)` | View-model rows in `src/utility/icarusData.js` |
| `DeployableRuntimeBadges.vue` | Always-visible panel in the hero header (right-aligned); **no tooltips** |

Each badge row shows:

- Resource **icon** (pipe-tool / generator / oxite game icons when available; Font Awesome vicon fallback)
- **Label** (Electricity, Water, Internal fuel, Shelter, …)
- **Status**: Required / Optional / Internal / Produces / Storage
- **Amount** when present (`375 mW`, `2500/s`)
- **Hint** when present (`per recipe`, `for boost`)
- For internal fuel: a chip list of every `generator.fuels` entry with **item icon + displayName**
  (resolved via `catalog.items[fuelId]`)

### Gameplay examples

| Deployable | Electricity | Water | Internal fuel |
|---|---|---|---|
| Biofuel Stove (`Kitchen_Stove`) | — | Optional (per recipe) | Biofuel (`generationRate` 500) |
| Electric Stove | Required (375 mW) | Optional (per recipe) | — |
| Stone Furnace / Campfire | — | — | Wood / sticks / … (`Basic_Energy_Generator`) |
| Biofuel Composter | — | Optional (boost, 100/s) | — |
| Electric Composter | Required (1500 mW) | Optional (boost) | — |
| Polymerizer | Required | — | — |

## 8. Misc facts worth remembering

- The web app loads `/icarus-game/Data/version.json` first (for game version + `catalogHash`), then
  `/icarus-game/Data/data-catalog.json?v=<catalogHash>` (`src/store/icarus.js` → `processCatalogData`).
  Raw `D_*.json` tables are not shipped under `public/`; read them from the Ue4Export when rebuilding the catalog
  or syncing icons (`yarn update-game-assets` uses export `Traits/D_Itemable.json`).
  `yarn update-game-assets` preserves an existing `catalogHash` when refreshing version from the export;
  re-run `yarn build-data-catalog` or `yarn prepare-data-catalog` after catalog changes.
- Weather has its own unrelated `Tier` fields (`Weather/D_WeatherEvents.json`) — do not confuse with tech tiers.
- `D_TalentRanks` (Novice/Apprentice/Journeyman/Master) is about talent point investment, not tech tiers.
- Feature gating uses two different signals in the game data:
  - `Metadata.RequiredFeatureLevel` (e.g. `NewFrontiers`, `Laika`) is a **build rollout** marker — once the
    client `version.json` FeatureLevel includes that release, the row is active for everyone. It is **not**
    treated as a catalog DLC lock (Clay Brick Wall is NewFrontiers-flagged but playable without owning the
    paid New Frontiers expansion).
  - Real ownership gates come from talent/recipe `RequiredFlags` → `D_DLCPackageData` (Steam package id)
    and are exposed as `locks.dlc` (display names from `D_DLCPackageData.DLCName`). Prospect craft unlocks
    are `locks.missions` (from `RequiredFlags` → `D_AccountFlags.RewardedFromMissions` → `D_ProspectList.DropName`,
    e.g. HEAL Device → CRISIS). Example: Creature Comforts Pack → `Creature_Comforts` package flag.
  **Item** `locks` only keep gates that apply on *every* acquisition path (intersection). If any craft path is
  unlocked — or the item is `gatherFirst` — item-level DLC badges are omitted; locked alternate recipes still
  carry their own `locks` (e.g. base Concrete Mix unlocked, Industrial Furniture Pack recipes still gated).
- Item icons export to `export/Icarus/Content/Assets/2DArt/UI/Items/Item_Icons`; the app serves them from
  `public/icarus-game/ItemIcons` (synced via `yarn update-game-assets`).
