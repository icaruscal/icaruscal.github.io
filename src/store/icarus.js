import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { useFuse } from '@vueuse/integrations/useFuse';

import { LOCAL_STORAGE_PREFIX } from '@/constants/common';
import router from '@/router/router';
import { formatGameVersionExtractedAt, formatGameVersionLabel, formatGameVersionShort, generateHighlightedText, processCatalogData, buildFoodConsumables, buildGearItems } from '@/utility/icarusData';

/** Normalize `?item=` from Vue Router query (string | string[]). */
const queryItemId = (query) => {
    const value = query?.item;
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
};

const queryWithoutItem = (query) => {
    const next = { ...query };
    delete next.item;
    return next;
};

// utility methods
const DEFAULT_TAB_TITLE = 'Planning';
const MULTI_TAB_TITLE = 'multi';
const DASHBOARD_TAB_ID = 'dashboard';
const DASHBOARD_TAB_TITLE = 'Dashboard';
const MAX_PLANNING_TABS = 20;

const generateTabId = () => Date.now();
const generateNewTab = () =>
    reactive({
        id: generateTabId(),
        title: DEFAULT_TAB_TITLE,
        titleIsCustom: false,
        isDashboard: false,
        items: [],
        treeProgress: {},
        collapsedPaths: {},
        recipePreferences: {},
    });
const generateDashboardTab = () =>
    reactive({
        id: DASHBOARD_TAB_ID,
        title: DASHBOARD_TAB_TITLE,
        titleIsCustom: true,
        isDashboard: true,
        items: [],
        treeProgress: {},
        collapsedPaths: {},
        recipePreferences: {},
    });
const tabIdsEqual = (a, b) => a === b || String(a) === String(b);
const findTabIndex = (id, tabs) => tabs.findIndex((tab) => tabIdsEqual(tab.id, id));
const findTab = (id, tabs) => tabs.find((tab) => tabIdsEqual(tab.id, id));

const normalizeTab = (tab) => {
    if (!tab.treeProgress) {
        tab.treeProgress = {};
    }
    if (!tab.collapsedPaths) {
        tab.collapsedPaths = {};
    }
    if (!tab.recipePreferences) {
        tab.recipePreferences = {};
    }
    if (!Array.isArray(tab.items)) {
        tab.items = [];
    }
    if (tab.isDashboard || tab.id === DASHBOARD_TAB_ID) {
        tab.id = DASHBOARD_TAB_ID;
        tab.title = DASHBOARD_TAB_TITLE;
        tab.titleIsCustom = true;
        tab.isDashboard = true;
        return tab;
    }
    if (tab.isDashboard === undefined) {
        tab.isDashboard = false;
    }
    if (tab.titleIsCustom === undefined) {
        // Preserve manually renamed existing tabs; leave default-titled tabs auto-managed
        tab.titleIsCustom = tab.title !== DEFAULT_TAB_TITLE;
    }
    return tab;
};

const ensureDashboardTab = (tabs) => {
    tabs.forEach(normalizeTab);
    let dashboardIndex = tabs.findIndex((tab) => tab.isDashboard);
    if (dashboardIndex === -1) {
        tabs.unshift(generateDashboardTab());
        return;
    }
    if (dashboardIndex > 0) {
        const [dashboard] = tabs.splice(dashboardIndex, 1);
        tabs.unshift(dashboard);
    }
};

const resolveActiveTabId = (tabs, preferredId) => {
    const match = preferredId != null ? findTab(preferredId, tabs) : null;
    if (match) {
        return match.id;
    }
    return tabs.find((tab) => tab.isDashboard)?.id ?? tabs[0]?.id ?? DASHBOARD_TAB_ID;
};

const clonePlain = (value) => JSON.parse(JSON.stringify(value));

const snapshotClosedTab = (tab) => {
    const normalized = normalizeTab({ ...tab });
    return {
        closedId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: normalized.title || DEFAULT_TAB_TITLE,
        titleIsCustom: Boolean(normalized.titleIsCustom),
        isDashboard: false,
        items: clonePlain(normalized.items || []),
        treeProgress: clonePlain(normalized.treeProgress || {}),
        collapsedPaths: clonePlain(normalized.collapsedPaths || {}),
        recipePreferences: clonePlain(normalized.recipePreferences || {}),
        closedAt: Date.now(),
    };
};

const restoreTabFromSnapshot = (snapshot) =>
    reactive(
        normalizeTab({
            id: generateTabId(),
            title: snapshot.title || DEFAULT_TAB_TITLE,
            titleIsCustom: Boolean(snapshot.titleIsCustom),
            isDashboard: false,
            items: clonePlain(snapshot.items || []),
            treeProgress: clonePlain(snapshot.treeProgress || {}),
            collapsedPaths: clonePlain(snapshot.collapsedPaths || {}),
            recipePreferences: clonePlain(snapshot.recipePreferences || {}),
        })
    );

// * data store
export const useIcarusStore = defineStore('icarus', {
    state: () => {
        const tabs = useStorage(
            `${LOCAL_STORAGE_PREFIX}/tabs`,
            [generateDashboardTab(), generateNewTab()],
            localStorage
        );
        ensureDashboardTab(tabs.value);

        const activeTabId = useStorage(
            `${LOCAL_STORAGE_PREFIX}/activeTabId`,
            resolveActiveTabId(tabs.value, null),
            localStorage
        );
        activeTabId.value = resolveActiveTabId(tabs.value, activeTabId.value);

        const settings = useStorage(
            `${LOCAL_STORAGE_PREFIX}/settings`,
            {
                searchFuzzyMatch: true,
                treeLevelColors: true,
                pageLayout: 'side',
            },
            localStorage,
            { mergeDefaults: true }
        );

        /** Static item ids (preferred) or recipe ids when static is unavailable. */
        const favorites = useStorage(`${LOCAL_STORAGE_PREFIX}/favorites`, [], localStorage);

        /** Snapshots of closed planning tabs (full state) for dashboard reopen. */
        const closedTabs = useStorage(`${LOCAL_STORAGE_PREFIX}/closedTabs`, [], localStorage);

        return {
            activeTabId,
            tabs,
            closedTabs,
            settings,
            favorites,

            itemTemplateData: {},
            itemStaticData: {},
            itemTableData: {},
            stations: {},

            recipeData: {},
            recipeOptions: [],
            foodConsumables: [],
            gearItems: [],
            /** Full `data-catalog.json` for item detail / reverse lookups. */
            dataCatalog: null,
            isLoadingRecipes: false,
            gameVersion: null,

            recipeSearch: '',
            /** Static item id (or recipe id) open in the item detail modal. */
            itemDetailId: null,
            /** Number of router pushes since the item modal opened (for Back / Close). */
            itemDetailOpenDepth: 0,
            /** True while unwinding history on close (ignore route item until stripped). */
            itemDetailClosing: false,
        };
    },
    getters: {
        canGoBackItemDetail: (state) => state.itemDetailOpenDepth > 1,
        activeTab: (state) => findTab(state.activeTabId, state.tabs),
        dashboardTab: (state) => state.tabs.find((tab) => tab.isDashboard),
        planningTabs: (state) => state.tabs.filter((tab) => !tab.isDashboard),
        tabCount() {
            return this.tabs.length;
        },
        planningTabCount() {
            return this.planningTabs.length;
        },
        maxPlanningTabs() {
            return MAX_PLANNING_TABS;
        },
        canAddPlanningTab() {
            return this.planningTabCount < MAX_PLANNING_TABS;
        },
        treeLevelColors(state) {
            return state.settings.treeLevelColors !== false;
        },
        pageLayout(state) {
            return state.settings.pageLayout === 'top' ? 'top' : 'side';
        },
        gameVersionShort(state) {
            return formatGameVersionShort(state.gameVersion);
        },
        gameVersionLabel(state) {
            return formatGameVersionLabel(state.gameVersion);
        },
        gameVersionExtractedAt(state) {
            return formatGameVersionExtractedAt(state.gameVersion);
        },
        foodBuffStatOptions(state) {
            const labels = new Map();
            for (const food of state.foodConsumables) {
                for (const stat of food.grantedStats) {
                    if (!labels.has(stat.key)) {
                        const base = (stat.display || stat.key).replace(/^[+-]?\d+%?\s*/, '').trim();
                        labels.set(stat.key, base || stat.key);
                    }
                }
            }
            return [...labels.entries()]
                .filter(([value]) => value !== 'BaseFoodStomachSlots_+')
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label));
        },
        gearStatOptions(state) {
            const labels = new Map();
            for (const gear of state.gearItems) {
                for (const stat of gear.gearStats) {
                    // Keys ending in `_?` are internal boolean flags without display text.
                    if (stat.key.endsWith('_?')) continue;
                    if (!labels.has(stat.key)) {
                        const base = (stat.display || stat.key).replace(/^[+-]?\d+(?:\.\d+)?%?\s*/, '').trim();
                        labels.set(stat.key, base || stat.key);
                    }
                }
            }
            return [...labels.entries()]
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label));
        },
        sortedRecipeOptions(state) {
            return state.recipeOptions.sort((a, b) => a.label.localeCompare(b.label));
        },
        filteredRecipeOptions(state) {
            if (state.recipeSearch) {
                //const searchLabel = state.recipeSearch.toLowerCase();

                const searchOptions = {
                    fuseOptions: {
                        keys: ['label'],
                        isCaseSensitive: false,
                        location: 0,
                        threshold: state.settings.searchFuzzyMatch ? undefined : 0,
                        distance: 100,
                        includeScore: true,
                        includeMatches: true,
                    },
                    resultLimit: undefined,
                    matchAllWhenSearchEmpty: true,
                };
                const { results } = useFuse(state.recipeSearch, this.sortedRecipeOptions, searchOptions);
                console.log({ searchResults: results.value });

                // map { item, refIndex } to an array of items
                return results.value.map((result) => ({
                    ...result.item,
                    highlightedLabel: result.matches ? generateHighlightedText(result.item.label, result.matches?.[0]?.indices) : result.item.label,
                }));
            }

            const sorted = this.sortedRecipeOptions;
            if (!state.favorites?.length) {
                return sorted;
            }

            const favorites = [];
            const rest = [];
            for (const option of sorted) {
                if (this.isFavorite(option.itemStaticId || option.id)) {
                    favorites.push(option);
                } else {
                    rest.push(option);
                }
            }
            return favorites.length > 0 ? [...favorites, ...rest] : sorted;
        },
        closedTabSummaries() {
            return (this.closedTabs || []).map((tab) => {
                const items = tab.items || [];
                const rootItems = items.map((item) => ({
                    id: item.id,
                    label: this.recipeData[item.id]?.label ?? item.id,
                    quantity: item.quantity ?? 1,
                }));
                return {
                    closedId: tab.closedId,
                    title: tab.title || DEFAULT_TAB_TITLE,
                    closedAt: tab.closedAt ?? null,
                    itemCount: items.length,
                    rootItems,
                };
            });
        },
    },
    actions: {
        // * tab methods
        addTab() {
            const tab = generateNewTab();
            this.tabs.push(tab);
            return tab;
        },
        removeTab(id) {
            const tabIndex = findTabIndex(id, this.tabs);
            if (tabIndex === -1) {
                console.error(`Could not find tab with id ${id}`, this.tabs);
                return;
            }

            if (this.tabs[tabIndex].isDashboard) {
                return;
            }

            const [removed] = this.tabs.splice(tabIndex, 1);
            if (removed) {
                this.closedTabs.unshift(snapshotClosedTab(removed));
            }

            const newTabIndex = Math.min(tabIndex, this.tabs.length - 1);
            this.activeTabId = resolveActiveTabId(this.tabs, this.tabs[newTabIndex]?.id);
        },
        restoreClosedTab(closedId) {
            if (!this.canAddPlanningTab) {
                return null;
            }

            const closedIndex = (this.closedTabs || []).findIndex((tab) => tab.closedId === closedId);
            if (closedIndex === -1) {
                console.error(`Could not find closed tab with id ${closedId}`, this.closedTabs);
                return null;
            }

            const [snapshot] = this.closedTabs.splice(closedIndex, 1);
            const tab = restoreTabFromSnapshot(snapshot);
            this.tabs.push(tab);
            this.syncTabTitle(tab);
            this.activeTabId = tab.id;
            return tab;
        },
        clearClosedTabs() {
            this.closedTabs.splice(0, this.closedTabs.length);
        },
        setActiveTab(id) {
            this.activeTabId = resolveActiveTabId(this.tabs, id);
        },
        setTabTitle(id, title) {
            const matchingId = findTabIndex(id, this.tabs);
            if (matchingId === -1) {
                return;
            }
            if (this.tabs[matchingId].isDashboard) {
                return;
            }
            this.tabs[matchingId].title = title;
            this.tabs[matchingId].titleIsCustom = true;
        },
        syncTabTitle(tab = this.activeTab) {
            if (!tab || tab.isDashboard || tab.titleIsCustom) {
                return;
            }

            const items = tab.items || [];
            if (items.length === 0) {
                tab.title = DEFAULT_TAB_TITLE;
                return;
            }

            if (items.length === 1) {
                const itemId = items[0].id;
                tab.title = this.recipeData[itemId]?.label ?? itemId;
                return;
            }

            tab.title = MULTI_TAB_TITLE;
        },
        syncAllTabTitles() {
            this.tabs.forEach((tab) => this.syncTabTitle(tab));
        },

        // * item list methods
        addItem(itemId, quantity = 1) {
            let currentTab = this.activeTab;

            if (currentTab?.isDashboard) {
                currentTab = this.planningTabs[0] ?? this.addTab();
                this.activeTabId = currentTab.id;
            }

            if (currentTab) {
                this.addItemToTab(itemId, currentTab.id);
            } else {
                console.error(`Could not find tab with id ${this.activeTabId}`, this.tabs);
            }
        },
        /** Add a craft recipe to a specific planning tab (not the dashboard). */
        addItemToTab(itemId, tabId) {
            if (!itemId || !this.recipeData[itemId]) {
                return null;
            }
            const tab = findTab(tabId, this.tabs);
            if (!tab || tab.isDashboard) {
                return null;
            }

            const matchingItem = tab.items.find((item) => item.id === itemId);
            const outputQuantity = this.recipeData[itemId].outputQuantity ?? 1;

            if (matchingItem) {
                matchingItem.quantity += outputQuantity;
            } else {
                tab.items.push({
                    id: itemId,
                    quantity: outputQuantity,
                });
            }
            this.syncTabTitle(tab);
            this.activeTabId = tab.id;
            return tab;
        },
        openItemInNewTab(itemId) {
            if (!itemId || !this.recipeData[itemId]) {
                return null;
            }

            const tab = this.addTab();
            this.addItemToTab(itemId, tab.id);
            return tab;
        },
        removeItem(itemId, tab = this.activeTab) {
            const currentTab = tab ?? this.activeTab;
            if (currentTab?.isDashboard) {
                return;
            }

            if (currentTab) {
                const matchingItemIndex = currentTab.items.findIndex((item) => item.id === itemId);
                if (matchingItemIndex > -1) {
                    currentTab.items.splice(matchingItemIndex, 1);
                }
                this.syncTabTitle(currentTab);
            } else {
                console.error(`Could not find tab with id ${this.activeTabId}`, this.tabs);
            }
        },
        setTreeLevelColors(value) {
            this.settings.treeLevelColors = value;
        },
        setPageLayout(value) {
            this.settings.pageLayout = value === 'top' ? 'top' : 'side';
        },

        // * recipe data
        async loadRecipeData() {
            this.isLoadingRecipes = true;

            // Small manifest: never cache so catalogHash stays fresh after deploys.
            const versionResponse = await fetch('/icarus-game/Data/version.json', {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (versionResponse.ok) {
                this.gameVersion = await versionResponse.json();
            } else {
                console.warn('Could not load game version.json', versionResponse.status);
                this.gameVersion = null;
            }

            const catalogCacheKey = this.gameVersion?.catalogHash || String(Date.now());
            const catalogResponse = await fetch(`/icarus-game/Data/data-catalog.json?v=${catalogCacheKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const catalog = await catalogResponse.json();

            const startTime = performance.now();
            const { recipeData, itemStaticData, itemTableData, stations } = processCatalogData(catalog);
            this.itemTemplateData = {};
            this.itemStaticData = itemStaticData;
            this.itemTableData = itemTableData;
            this.stations = stations ?? {};
            this.recipeData = recipeData;
            this.foodConsumables = buildFoodConsumables(catalog);
            this.gearItems = buildGearItems(catalog);
            this.dataCatalog = catalog;
            // Use Set to deduplicate: aliased entries (e.g. "Refined_Wood" / "Wood_Refined")
            // share the same object reference so Set collapses them to one search result.
            this.recipeOptions = [...new Set(Object.values(recipeData))];
            this.isLoadingRecipes = false;
            this.syncAllTabTitles();

            console.log({ itemStaticData, itemTableData, stations, recipeData, foodConsumables: this.foodConsumables.length, meta: catalog.meta, gameVersion: this.gameVersion });
            console.log(`Processed data in ${performance.now() - startTime}ms`);
        },
        /** Mirror `?item=` into store (route is source of truth). */
        setItemDetailId(itemOrRecipeId) {
            const id = itemOrRecipeId || null;
            if (this.itemDetailClosing) {
                if (!id) {
                    this.itemDetailClosing = false;
                    this.itemDetailId = null;
                    this.itemDetailOpenDepth = 0;
                }
                return;
            }
            this.itemDetailId = id;
            if (!id) {
                this.itemDetailOpenDepth = 0;
                return;
            }
            const stateDepth = window.history.state?.itemDetailOpenDepth;
            if (typeof stateDepth === 'number') {
                this.itemDetailOpenDepth = stateDepth;
            } else if (!this.itemDetailOpenDepth) {
                // Deep link / refresh: no push depth of our own.
                this.itemDetailOpenDepth = 0;
            }
        },
        openItemDetail(itemOrRecipeId) {
            if (!itemOrRecipeId) return;
            const route = router.currentRoute.value;
            const current = queryItemId(route.query);
            if (current === itemOrRecipeId) return;

            const wasOpen = Boolean(current);
            const nextDepth = wasOpen ? this.itemDetailOpenDepth + 1 : 1;
            this.itemDetailClosing = false;
            this.itemDetailOpenDepth = nextDepth;
            this.itemDetailId = itemOrRecipeId;

            router.push({
                query: { ...route.query, item: itemOrRecipeId },
                state: { itemDetailOpenDepth: nextDepth },
            });
        },
        backItemDetail() {
            if (this.itemDetailOpenDepth <= 1) return;
            router.back();
        },
        closeItemDetail() {
            const depth = this.itemDetailOpenDepth;
            this.itemDetailClosing = true;
            this.itemDetailOpenDepth = 0;
            this.itemDetailId = null;

            const stripItemFromQuery = () => {
                const route = router.currentRoute.value;
                if (!queryItemId(route.query)) {
                    this.itemDetailClosing = false;
                    return;
                }
                router.replace({ query: queryWithoutItem(route.query) });
            };

            if (depth > 0) {
                const removeHook = router.afterEach(() => {
                    removeHook();
                    stripItemFromQuery();
                });
                router.go(-depth);
            } else {
                stripItemFromQuery();
            }
        },

        /** Prefer D_ItemsStatic id so explorer / calculator / detail share one favorite key. */
        resolveFavoriteKey(itemOrRecipeId) {
            if (!itemOrRecipeId) return null;
            if (this.itemStaticData?.[itemOrRecipeId]) {
                return itemOrRecipeId;
            }
            const recipe = this.recipeData?.[itemOrRecipeId];
            if (recipe?.itemStaticId) {
                return recipe.itemStaticId;
            }
            const food = this.foodConsumables?.find(
                (entry) => entry.id === itemOrRecipeId || entry.staticItemName === itemOrRecipeId
            );
            if (food?.staticItemName) {
                return food.staticItemName;
            }
            return itemOrRecipeId;
        },
        isFavorite(itemOrRecipeId) {
            const key = this.resolveFavoriteKey(itemOrRecipeId);
            if (!key) return false;
            return this.favorites.some((fav) => this.resolveFavoriteKey(fav) === key);
        },
        toggleFavorite(itemOrRecipeId) {
            const key = this.resolveFavoriteKey(itemOrRecipeId);
            if (!key) return;
            const existingIndex = this.favorites.findIndex((fav) => this.resolveFavoriteKey(fav) === key);
            if (existingIndex >= 0) {
                this.favorites.splice(existingIndex, 1);
            } else {
                this.favorites.push(key);
            }
        },
    },
});
