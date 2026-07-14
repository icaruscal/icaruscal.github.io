import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { useFuse } from '@vueuse/integrations/useFuse';

import { LOCAL_STORAGE_PREFIX } from '@/constants/common';
import {
    generateHighlightedText,
    processItemStaticData,
    processItemTableData,
    processItemTemplateData,
    processRecipeData,
} from '@/utility/icarusData';

// utility methods
const DEFAULT_TAB_TITLE = 'Planning';
const MULTI_TAB_TITLE = 'multi';
const DASHBOARD_TAB_ID = 'dashboard';
const DASHBOARD_TAB_TITLE = 'Dashboard';

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
    });
const findTabIndex = (id, tabs) => tabs.findIndex((tab) => tab.id === id);

const normalizeTab = (tab) => {
    if (!tab.treeProgress) {
        tab.treeProgress = {};
    }
    if (!tab.collapsedPaths) {
        tab.collapsedPaths = {};
    }
    if (tab.isDashboard || tab.id === DASHBOARD_TAB_ID) {
        tab.id = DASHBOARD_TAB_ID;
        tab.title = DASHBOARD_TAB_TITLE;
        tab.titleIsCustom = true;
        tab.isDashboard = true;
        tab.items = tab.items || [];
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

// default state
const defaultTab = generateNewTab();
const tabData = useStorage(`${LOCAL_STORAGE_PREFIX}/tabs`, [generateDashboardTab(), defaultTab]);
ensureDashboardTab(tabData.value);
const defaultTabId = tabData.value.find((tab) => tab.isDashboard)?.id ?? tabData.value[0].id;
//console.log({defaultTabId, defaultTab, tabData});

const settingsData = useStorage(
    `${LOCAL_STORAGE_PREFIX}/settings`,
    {
        searchFuzzyMatch: true,
        treeLevelColors: true,
        pageLayout: 'side',
    },
    localStorage,
    { mergeDefaults: true }
);

// * data store
export const useIcarusStore = defineStore('icarus', {
    state: () => ({
        activeTabId: defaultTabId,
        tabs: tabData,
        settings: settingsData,

        itemTemplateData: {},
        itemStaticData: {},
        itemTableData: {},

        recipeData: {},
        recipeOptions: [],
        isLoadingRecipes: false,

        recipeSearch: '',
    }),
    getters: {
        activeTab: (state) => state.tabs.find((tab) => tab.id === state.activeTabId),
        dashboardTab: (state) => state.tabs.find((tab) => tab.isDashboard),
        planningTabs: (state) => state.tabs.filter((tab) => !tab.isDashboard),
        tabCount() {
            return this.tabs.length;
        },
        planningTabCount() {
            return this.planningTabs.length;
        },
        treeLevelColors(state) {
            return state.settings.treeLevelColors !== false;
        },
        pageLayout(state) {
            return state.settings.pageLayout === 'top' ? 'top' : 'side';
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
            return this.sortedRecipeOptions;
        },
        tabProgressSummaries() {
            return this.planningTabs.map((tab) => {
                const progressEntries = Object.values(tab.treeProgress || {});
                let currentTotal = 0;
                let requiredTotal = 0;
                let completedNodes = 0;
                let trackedNodes = 0;

                if (progressEntries.length > 0) {
                    progressEntries.forEach((entry) => {
                        const required = Math.max(0, entry.required ?? 0);
                        if (required <= 0) {
                            return;
                        }
                        const current = Math.min(Math.max(0, entry.current ?? 0), required);
                        requiredTotal += required;
                        currentTotal += current;
                        trackedNodes += 1;
                        if (entry.completed || current >= required) {
                            completedNodes += 1;
                        }
                    });
                }

                if (requiredTotal === 0) {
                    (tab.items || []).forEach((item) => {
                        const required = Math.max(0, item.quantity ?? 0);
                        requiredTotal += required;
                        trackedNodes += 1;
                    });
                }

                const rootItems = (tab.items || []).map((item) => {
                    const required = Math.max(0, Math.ceil(item.quantity ?? 0));
                    const entry = tab.treeProgress?.[item.id];
                    const current = Math.min(Math.max(0, entry?.current ?? 0), required);
                    return {
                        id: item.id,
                        label: this.recipeData[item.id]?.label ?? item.id,
                        required,
                        current,
                        completed: Boolean(entry?.completed) || (required > 0 && current >= required),
                        percent: required > 0 ? Math.round((current / required) * 100) : 0,
                    };
                });

                const percent = requiredTotal > 0 ? Math.round((currentTotal / requiredTotal) * 100) : 0;

                return {
                    id: tab.id,
                    title: tab.title,
                    itemCount: (tab.items || []).length,
                    currentTotal,
                    requiredTotal,
                    completedNodes,
                    trackedNodes,
                    percent,
                    rootItems,
                };
            });
        },
        overallProgress() {
            const summaries = this.tabProgressSummaries;
            const currentTotal = summaries.reduce((sum, tab) => sum + tab.currentTotal, 0);
            const requiredTotal = summaries.reduce((sum, tab) => sum + tab.requiredTotal, 0);
            const completedNodes = summaries.reduce((sum, tab) => sum + tab.completedNodes, 0);
            const trackedNodes = summaries.reduce((sum, tab) => sum + tab.trackedNodes, 0);
            return {
                tabCount: summaries.length,
                currentTotal,
                requiredTotal,
                completedNodes,
                trackedNodes,
                percent: requiredTotal > 0 ? Math.round((currentTotal / requiredTotal) * 100) : 0,
            };
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

            this.tabs.splice(tabIndex, 1);

            const newTabIndex = Math.min(tabIndex, this.tabs.length - 1);
            const newActiveTab = this.tabs[newTabIndex];
            this.activeTabId = newActiveTab.id;
        },
        setActiveTab(id) {
            this.activeTabId = id;
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
                const matchingItem = currentTab.items.find((item) => item.id === itemId);
                const outputQuantity = this.recipeData[itemId].outputQuantity ?? 1;

                if (matchingItem) {
                    matchingItem.quantity += outputQuantity;
                } else {
                    currentTab.items.push({
                        id: itemId,
                        quantity: outputQuantity,
                    });
                }
                this.syncTabTitle(currentTab);
            } else {
                console.error(`Could not find tab with id ${this.activeTabId}`, this.tabs);
            }
        },
        openItemInNewTab(itemId) {
            if (!itemId || !this.recipeData[itemId]) {
                return null;
            }

            const tab = this.addTab();
            const outputQuantity = this.recipeData[itemId].outputQuantity ?? 1;
            tab.items.push({
                id: itemId,
                quantity: outputQuantity,
            });
            this.syncTabTitle(tab);
            this.activeTabId = tab.id;
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
            const dateTime = new Date().getTime();
            this.isLoadingRecipes = true;

            const itemTemplateResponse = await fetch(`/icarus-game/Data/D_ItemTemplate.json?v=${dateTime}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const itemTemplate = await itemTemplateResponse.json();

            const itemStaticResponse = await fetch(`/icarus-game/Data/D_ItemsStatic.json?v=${dateTime}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const itemStatic = await itemStaticResponse.json();

            const itemTableResponse = await fetch(`/icarus-game/Data/D_Itemable.json?v=${dateTime}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const itemTable = await itemTableResponse.json();

            const recipeResponse = await fetch(`/icarus-game/Data/D_ProcessorRecipes.json?v=${dateTime}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const recipes = await recipeResponse.json();

            const startTime = performance.now();

            const itemTemplateData = processItemTemplateData(itemTemplate.Rows);
            this.itemTemplateData = itemTemplateData;

            const itemStaticData = processItemStaticData(itemStatic.Rows);
            this.itemStaticData = itemStaticData;

            const itemTableData = processItemTableData(itemTable.Rows);
            this.itemTableData = itemTableData;

            const { recipeData } = processRecipeData(recipes?.Rows, { itemTemplateData, itemStaticData, itemTableData });
            this.recipeData = recipeData;
            // Use Set to deduplicate: aliased entries (e.g. "Refined_Wood" / "Wood_Refined")
            // share the same object reference so Set collapses them to one search result.
            this.recipeOptions = [...new Set(Object.values(recipeData))];
            this.isLoadingRecipes = false;
            this.syncAllTabTitles();

            console.log({ itemTemplateData, itemStaticData, itemTableData, recipeData });
            console.log(`Processed data in ${performance.now() - startTime}ms`);
        },
    },
});
