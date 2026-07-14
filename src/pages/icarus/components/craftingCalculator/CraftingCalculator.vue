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
                                <div class="flex-shrink">
                                    <div class="label text-overflow-ellipsis" :data-item-id="item.id">{{ recipeData[item.id]?.label }}</div>
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
                                <component-source-picker :component-id="item.id" @change="triggerCalc()"></component-source-picker>
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
                <crafting-tree :trees="requirementTrees" :progress="treeProgress" />
            </div>

            <div class="flex align-items-center mt-3">
                <h3>Crafting Stations</h3>
            </div>
            <div>
                <div v-for="componentName in requiredCraftingStations" :key="componentName" class="recipe-item stations pl-0 flex align-items-center">
                    <div class="flex align-items-center">
                        <n-image
                            class="icon"
                            width="32"
                            :src="`${gameAssetsUrl}/ItemIcons/${recipeData[componentName]?.iconPath}.png`"
                            :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                            :preview-disabled="false"
                        />
                        <div class="label">{{ recipeData[componentName]?.label ?? itemLabelMap[componentName] ?? componentName }}</div>
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
import QuantityStepper from './QuantityStepper.vue';
import { useIcarusStore } from '@/store/icarus';
import { itemLabelMap } from '@/utility/icarusData';
import { GAME_ASSETS_URL } from '@/constants/common';

export default {
    name: 'CraftingToolCalculator',
    components: {
        ComponentSourcePicker,
        CraftingTree,
        QuantityStepper,
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
            itemLabelMap: itemLabelMap,
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
        ...mapState(useIcarusStore, ['recipeData', 'itemStaticData', 'itemTableData', 'isLoadingRecipes']),
        treeProgress() {
            return this.tab.treeProgress ?? {};
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['removeItem']),
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
        triggerCalc: debounce(function () {
            this.calculateRequiredItems();
        }, 100),
        calculateRequiredItems() {
            const selectedItems = this.tab.items || [];
            const recipeData = this.recipeData;
            const itemStaticData = this.itemStaticData;
            const itemTableData = this.itemTableData;
            const requiredCraftingStations = new Set();

            const getComponentLabel = (componentId) =>
                recipeData[componentId]?.label ??
                itemLabelMap[componentId] ??
                itemTableData[itemStaticData[componentId]?.itemTableId]?.displayName ??
                componentId.replace(/_/g, ' ');

            const buildRequirementNode = (itemId, requestedQuantity, stations = new Set(), activePath = new Set()) => {
                const label = getComponentLabel(itemId);
                const hasRecipe = Boolean(recipeData[itemId]);

                const node = {
                    id: itemId,
                    quantity: requestedQuantity,
                    label,
                    isRaw: !hasRecipe,
                    children: [],
                };

                if (activePath.has(itemId) || !hasRecipe) {
                    return node;
                }

                const recipe = recipeData[itemId];
                node.recipeId = recipe.id;
                node.outputQuantity = recipe.outputQuantity || 1;
                node.preferredSource = recipe.preferredSource ?? null;

                if (node.preferredSource) {
                    stations.add(node.preferredSource);
                }

                const nextPath = new Set(activePath);
                nextPath.add(itemId);
                const multiplier = requestedQuantity / node.outputQuantity;

                (recipe.inputs || []).forEach((input) => {
                    const inputQuantity = input.quantity * multiplier;
                    const childHasRecipe = Boolean(recipeData[input.id]);
                    const child = {
                        id: input.id,
                        quantity: inputQuantity,
                        label: getComponentLabel(input.id),
                        isRaw: !childHasRecipe,
                    };
                    node.children.push(child);

                    if (childHasRecipe && !nextPath.has(input.id)) {
                        child.expanded = buildRequirementNode(input.id, inputQuantity, stations, nextPath);
                    }
                });

                return node;
            };

            const primaryStations = new Set();
            const primaryTrees = selectedItems.map((item) =>
                buildRequirementNode(item.id, item.quantity ?? 1, primaryStations)
            );
            primaryStations.forEach((station) => requiredCraftingStations.add(station));

            this.requirementTrees = primaryTrees;
            this.requiredCraftingStations = [...requiredCraftingStations].sort((a, b) => {
                const aLabel = recipeData[a]?.label ?? itemLabelMap[a] ?? a;
                const bLabel = recipeData[b]?.label ?? itemLabelMap[b] ?? b;
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

.recipe-item {
    min-height: 60px;
    padding: 0.3rem 0.3rem 0.4rem 0.3rem;
    border-radius: 4px;

    &.stations {
        min-height: 35px;
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
