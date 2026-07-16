<template>
    <div>
        <div v-if="!isLoadingRecipes && tab.items.length > 0">
            <div class="flex align-items-center">
                <h3>Items</h3>
                <n-tooltip trigger="hover">
                    <template #trigger>
                        <n-button class="ml-3" size="tiny" secondary circle type="default" @click="sortInputs">
                            <n-icon size="13">
                                <SortAlphaDown></SortAlphaDown>
                            </n-icon>
                        </n-button>
                    </template>
                    Sort items alphabetically
                </n-tooltip>
            </div>

            <div class="items-scroll-area">
                <transition-group x-appear name="list" tag="div">
                    <div v-for="item in tab.items" class="recipe-item flex align-items-center" :key="item.id">
                        <div class="relative flex align-items-center mr-1">
                            <n-image
                                class="icon"
                                width="45"
                                :src="`${gameAssetsUrl}/ItemIcons/${recipeData[item.id]?.iconPath}.png`"
                                :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                :preview-disabled="false"
                            />
                            <div v-if="recipeData[item.id]?.outputQuantity > 1" class="item-counter">x{{ recipeData[item.id].outputQuantity }}</div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="flex align-items-center pb-1">
                                <div class="flex-shrink flex align-items-center">
                                    <favorite-star-button
                                        :item-id="recipeData[item.id]?.itemStaticId || item.id"
                                        :label="recipeData[item.id]?.label"
                                        size="sm"
                                    />
                                    <item-modifier-tooltip :recipe="recipeData[item.id]">
                                        <div class="label text-overflow-ellipsis" :data-item-id="item.id">
                                            {{ recipeData[item.id]?.label }}
                                        </div>
                                    </item-modifier-tooltip>
                                    <item-detail-button
                                        :item-id="recipeData[item.id]?.itemStaticId || item.id"
                                        :label="recipeData[item.id]?.label"
                                    />
                                    <recipe-variant-picker
                                        :item-id="item.id"
                                        :preferred-recipe-id="recipePreferences[item.id] || null"
                                        @change="(recipeId) => onRecipePreferenceChange(item.id, recipeId)"
                                    />
                                </div>
                            </div>
                            <div class="flex align-items-center flex-grow-1">
                                <quantity-stepper
                                    class="input-quantity flex-shrink-0"
                                    :model-value="item.quantity"
                                    :min="0"
                                    :max="100000"
                                    @update:model-value="onQuantityUpdate(item, $event)"
                                />
                                <component-source-picker
                                    :component-id="item.id"
                                    :preferred-recipe-id="recipePreferences[item.id] || null"
                                    @change="triggerCalc()"
                                ></component-source-picker>
                                <n-tooltip trigger="hover">
                                    <template #trigger>
                                        <n-button class="hover-button ml-auto" secondary type="error" size="small" @click="removeListItem(item)">
                                            <n-icon size="13">
                                                <Times></Times>
                                            </n-icon>
                                        </n-button>
                                    </template>
                                    Remove from list
                                </n-tooltip>
                            </div>
                        </div>
                    </div>
                </transition-group>
            </div>

            <div class="mt-4">
                <crafting-tree
                    :trees="requirementTrees"
                    :progress="treeProgress"
                    :collapsed-paths="collapsedPaths"
                    :recipe-preferences="recipePreferences"
                    @recipe-preference-change="triggerCalc"
                />
            </div>

            <div
                v-if="baseMaterials.length > 0 || craftedMaterials.length > 0 || requiredCraftingStations.length > 0"
                class="summary-columns mt-4"
            >
                <div class="summary-column">
                    <h3>Base Materials</h3>
                    <div
                        v-for="material in baseMaterials"
                        :key="material.id"
                        class="recipe-item materials pl-0 flex align-items-center"
                    >
                        <div class="relative flex align-items-center">
                            <n-image
                                class="icon"
                                width="32"
                                :src="`${gameAssetsUrl}/ItemIcons/${materialIconPath(material.id)}.png`"
                                :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                :preview-disabled="false"
                            />
                        </div>
                        <div class="material-qty">{{ material.quantity }}</div>
                        <div class="label">{{ material.label }}</div>
                        <item-detail-button :item-id="material.id" :label="material.label" />
                    </div>
                </div>

                <div class="summary-column">
                    <h3>Crafted Materials</h3>
                    <div
                        v-for="material in craftedMaterials"
                        :key="material.id"
                        class="recipe-item materials pl-0 flex align-items-center"
                    >
                        <div class="relative flex align-items-center">
                            <n-image
                                class="icon"
                                width="32"
                                :src="`${gameAssetsUrl}/ItemIcons/${materialIconPath(material.id)}.png`"
                                :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                :preview-disabled="false"
                            />
                        </div>
                        <div class="material-qty">{{ material.quantity }}</div>
                        <div class="label">{{ material.label }}</div>
                        <item-detail-button :item-id="material.id" :label="material.label" />
                    </div>
                </div>

                <div class="summary-column">
                    <h3>Crafting Stations</h3>
                    <div
                        v-for="componentName in requiredCraftingStations"
                        :key="componentName"
                        class="recipe-item stations pl-0 flex align-items-center"
                    >
                        <div class="flex align-items-center">
                            <n-image
                                class="icon"
                                width="32"
                                :src="`${gameAssetsUrl}/ItemIcons/${stationIconPath(componentName)}.png`"
                                :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                :preview-disabled="false"
                            />
                            <div class="label">{{ stationLabel(componentName) }}</div>
                            <item-detail-button
                                v-if="stationDetailId(componentName)"
                                :item-id="stationDetailId(componentName)"
                                :label="stationLabel(componentName)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="mb-3">
            <h3>No Items</h3>
            <n-text type="info">You haven't added any items to this list yet.</n-text>
        </div>
    </div>
</template>

<script>
import debounce from 'debounce';
import { mapActions, mapState } from 'pinia';
import { SortAlphaDown, Times } from '@vicons/fa';

import ComponentSourcePicker from './ComponentSourcePicker.vue';
import CraftingTree from './CraftingTree.vue';
import ItemModifierTooltip from './ItemModifierTooltip.vue';
import QuantityStepper from './QuantityStepper.vue';
import RecipeVariantPicker from './RecipeVariantPicker.vue';
import FavoriteStarButton from '@/pages/icarus/components/FavoriteStarButton.vue';
import ItemDetailButton from '@/pages/icarus/components/ItemDetailButton.vue';
import { useIcarusStore } from '@/store/icarus';
import {
    getCraftRecipeIdsForItem,
    getRecipeOutputCountForItem,
    getStationCraftRecipeId,
    getStationLabel,
    resolveItemRecipe,
} from '@/utility/icarusData';
import { GAME_ASSETS_URL } from '@/constants/common';

export default {
    name: 'CraftingToolCalculator',
    components: {
        ComponentSourcePicker,
        CraftingTree,
        FavoriteStarButton,
        ItemDetailButton,
        ItemModifierTooltip,
        QuantityStepper,
        RecipeVariantPicker,
        SortAlphaDown,
        Times,
    },
    props: {
        tab: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
            requiredCraftingStations: [],
            requirementTrees: [],
        };
    },
    watch: {
        tab: {
            immediate: true,
            handler(tab) {
                if (tab && !tab.treeProgress) {
                    tab.treeProgress = {};
                }
                if (tab && !tab.collapsedPaths) {
                    tab.collapsedPaths = {};
                }
                if (tab && !tab.recipePreferences) {
                    tab.recipePreferences = {};
                }
            },
        },
        'tab.items': {
            deep: true,
            immediate: true,
            handler() {
                this.triggerCalc();
            },
        },
        isLoadingRecipes(loading) {
            if (!loading) {
                this.triggerCalc();
            }
        },
    },
    computed: {
        ...mapState(useIcarusStore, ['recipeData', 'itemStaticData', 'itemTableData', 'stations', 'isLoadingRecipes']),
        treeProgress() {
            return this.tab.treeProgress ?? {};
        },
        collapsedPaths() {
            return this.tab.collapsedPaths ?? {};
        },
        recipePreferences() {
            return this.tab.recipePreferences ?? {};
        },
        terminalMaterials() {
            const baseTotals = new Map();
            const craftedTotals = new Map();
            const progress = this.treeProgress;

            const isInFabrication = (path) => {
                const entry = progress[path];
                if (!entry) return false;
                return (
                    Boolean(entry.inFabrication) ||
                    Boolean(entry.readyAtLocation) ||
                    Boolean(entry.completed) ||
                    (entry.required > 0 && (entry.current ?? 0) >= entry.required)
                );
            };

            const addTo = (totals, node) => {
                if (!node?.id) return;
                const existing = totals.get(node.id);
                if (existing) {
                    existing.quantity += node.quantity ?? 0;
                    return;
                }
                totals.set(node.id, {
                    id: node.id,
                    label: node.label ?? node.id,
                    quantity: node.quantity ?? 0,
                });
            };

            const finalize = (totals) =>
                [...totals.values()]
                    .map((entry) => ({
                        ...entry,
                        quantity: Math.ceil(entry.quantity),
                    }))
                    .filter((entry) => entry.quantity > 0)
                    .sort((a, b) => a.label.localeCompare(b.label));

            const walk = (node, path) => {
                if (!node || isInFabrication(path)) return;
                const children = node.children || [];
                if (children.length === 0) {
                    // Root (or leaf) with nothing further — raw gather / selected raw item.
                    if (node.isRaw) {
                        addTo(baseTotals, node);
                    } else {
                        addTo(craftedTotals, node);
                    }
                    return;
                }
                children.forEach((child) => {
                    const childPath = `${path}/${child.id}`;
                    if (isInFabrication(childPath)) return;
                    if (child.expanded) {
                        // Craftable intermediate: list it, then resolve its own inputs.
                        addTo(craftedTotals, child);
                        walk(child.expanded, childPath);
                    } else if (child.isRaw) {
                        addTo(baseTotals, child);
                    } else {
                        addTo(craftedTotals, child);
                    }
                });
            };

            (this.requirementTrees || []).forEach((tree) => walk(tree, tree.id));

            return {
                base: finalize(baseTotals),
                crafted: finalize(craftedTotals),
            };
        },
        baseMaterials() {
            return this.terminalMaterials.base;
        },
        craftedMaterials() {
            return this.terminalMaterials.crafted;
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['removeItem']),
        materialIconPath(itemId) {
            const recipe = this.recipeData[itemId];
            if (recipe?.iconPath) return recipe.iconPath;
            const tableId = this.itemStaticData[itemId]?.itemTableId;
            return this.itemTableData[tableId]?.icon ?? this.itemTableData[itemId]?.icon ?? '';
        },
        stationLabel(stationId) {
            return getStationLabel(stationId, {
                stations: this.stations,
                recipeData: this.recipeData,
                itemTableData: this.itemTableData,
            });
        },
        stationIconPath(stationId) {
            const craftRecipeId = getStationCraftRecipeId(stationId, {
                stations: this.stations,
                recipeData: this.recipeData,
            });
            return this.stations[stationId]?.iconPath ?? this.recipeData[craftRecipeId]?.iconPath ?? '';
        },
        stationDetailId(stationId) {
            const craftRecipeId = getStationCraftRecipeId(stationId, {
                stations: this.stations,
                recipeData: this.recipeData,
            });
            if (!craftRecipeId) return null;
            return this.recipeData[craftRecipeId]?.itemStaticId || craftRecipeId;
        },
        sortInputs() {
            this.tab.items.sort((a, b) => {
                const aLabel = this.recipeData[a.id].label;
                const bLabel = this.recipeData[b.id].label;
                return aLabel.localeCompare(bLabel);
            });
        },
        onQuantityUpdate(item, value) {
            item.quantity = value;
            this.onQuantityChange(item);
        },
        onQuantityChange(item) {
            if (item.quantity < 1) {
                this.$nextTick(() => {
                    this.removeListItem(item);
                });
            }
        },
        removeListItem(item) {
            this.removeItem(item.id, this.tab);
        },
        onRecipePreferenceChange(path, recipeId) {
            if (!this.tab.recipePreferences) {
                this.tab.recipePreferences = {};
            }
            this.tab.recipePreferences[path] = recipeId;
            this.triggerCalc();
        },
        triggerCalc: debounce(function () {
            this.calculateRequiredItems();
        }, 100),
        calculateRequiredItems() {
            const selectedItems = this.tab.items || [];
            const recipeData = this.recipeData;
            const itemStaticData = this.itemStaticData;
            const itemTableData = this.itemTableData;
            const stationsCatalog = this.stations;
            const recipePreferences = this.tab.recipePreferences ?? {};
            const requiredCraftingStations = new Set();

            const getComponentLabel = (componentId) =>
                recipeData[componentId]?.label ??
                itemTableData[itemStaticData[componentId]?.itemTableId]?.displayName ??
                componentId.replace(/_/g, ' ');

            const recipeContext = {
                recipeData,
                itemStaticData,
                itemTableData,
            };
            const stationContext = {
                stations: stationsCatalog,
                recipeData,
                itemTableData,
            };

            const buildRequirementNode = (itemId, requestedQuantity, stations = new Set(), activePath = new Set(), path = itemId) => {
                const label = getComponentLabel(itemId);
                const preferredRecipeId = recipePreferences[path] ?? null;
                const recipe = resolveItemRecipe(itemId, recipeContext, { preferredRecipeId });
                const hasRecipe = Boolean(recipe);

                const node = {
                    id: itemId,
                    quantity: requestedQuantity,
                    label,
                    isRaw: !hasRecipe,
                    children: [],
                    alternateRecipeIds: getCraftRecipeIdsForItem(itemId, recipeContext),
                    preferredRecipeId,
                };

                if (activePath.has(itemId) || !hasRecipe) {
                    return node;
                }

                node.recipeId = recipe.id;
                node.outputQuantity = getRecipeOutputCountForItem(recipe, itemId);
                node.preferredSource = recipe.preferredSource ?? null;

                if (node.preferredSource) {
                    stations.add(node.preferredSource);
                }

                const nextPath = new Set(activePath);
                nextPath.add(itemId);
                const multiplier = requestedQuantity / node.outputQuantity;

                (recipe.inputs || []).forEach((input) => {
                    const inputQuantity = input.quantity * multiplier;
                    // Self-input conversion recipes (Frozen_Wood ← Frozen_Wood) are terminal mats.
                    const isSelfInput = input.id === recipe.id || input.id === itemId;
                    const childPath = `${path}/${input.id}`;
                    const childPreferred = recipePreferences[childPath] ?? null;
                    const childRecipe = !isSelfInput
                        ? resolveItemRecipe(input.id, recipeContext, { preferredRecipeId: childPreferred })
                        : null;
                    const childHasRecipe = Boolean(childRecipe);
                    const child = {
                        id: input.id,
                        quantity: inputQuantity,
                        label: getComponentLabel(input.id),
                        isRaw: !childHasRecipe,
                        alternateRecipeIds: getCraftRecipeIdsForItem(input.id, recipeContext),
                        preferredRecipeId: childPreferred,
                    };
                    node.children.push(child);

                    if (childHasRecipe && !nextPath.has(input.id)) {
                        child.expanded = buildRequirementNode(input.id, inputQuantity, stations, nextPath, childPath);
                    }
                });

                return node;
            };

            const primaryStations = new Set();
            const primaryTrees = selectedItems.map((item) =>
                buildRequirementNode(item.id, item.quantity ?? 1, primaryStations, new Set(), item.id)
            );
            primaryStations.forEach((station) => requiredCraftingStations.add(station));

            this.requirementTrees = primaryTrees;
            this.requiredCraftingStations = [...requiredCraftingStations].sort((a, b) => {
                const aLabel = getStationLabel(a, stationContext);
                const bLabel = getStationLabel(b, stationContext);
                return aLabel.localeCompare(bLabel);
            });
        },
    },
};
</script>

<style scoped lang="scss">
.items-scroll-area {
    max-height: 390px;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.summary-columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    align-items: start;
}

.summary-column {
    min-width: 0;

    h3 {
        margin-top: 0;
    }
}

@media (max-width: 900px) {
    .summary-columns {
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
}

.recipe-item {
    min-height: 60px;
    padding: 0.3rem 0.3rem 0.4rem 0.3rem;
    border-radius: 4px;

    &.stations,
    &.materials {
        min-height: 35px;
    }

    .material-qty {
        min-width: 2.25rem;
        margin-right: 0.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        opacity: 0.85;
    }

    .input-quantity {
        margin-right: 0.5rem;
    }

    .icon {
        margin: 0 0.5rem 0 0;
    }

    .label {
        font-weight: 600;
        line-height: 18px;
    }

    .hover-button {
        visibility: hidden;
    }

    &:hover {
        background-color: rgba(222, 222, 255, 0.03);

        .hover-button {
            visibility: visible;
        }
    }
}

.list-enter-active,
.list-leave-active {
    transition: all 0.2s ease;
}
.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}
.list-move {
    transition: transform 0.5s ease;
}
</style>
