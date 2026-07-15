<template>
    <div :class="['item-search', `item-search--${variant}`]">
        <div class="search-bar flex align-items-center">
            <n-input
                ref="searchInput"
                type="text"
                v-model:value="searchValue"
                placeholder="Search..."
                clearable
                :size="variant === 'top' ? 'large' : 'medium'"
                @input="onSearch"
                @focus="onFocus"
                @keydown.esc.prevent="closeDropdown"
            />
            <div class="flex-shrink-0 ml-3">
                <n-tooltip trigger="hover" :placement="variant === 'top' ? 'bottom' : 'right'">
                    <template #trigger>
                        <n-checkbox v-model:checked="settings.searchFuzzyMatch">Fuzzy search</n-checkbox>
                    </template>
                    Allows partial text matches, sorted by match quality
                </n-tooltip>
            </div>
        </div>

        <n-spin :show="isLoadingRecipes" :class="{ 'dropdown-spin': variant === 'top' }">
            <n-card
                v-show="variant === 'side' || dropdownOpen"
                class="scroll-wrap"
                :class="{ 'dropdown-panel': variant === 'top' }"
                content-style="padding: 0;"
            >
                <div v-if="filteredRecipeOptions.length === 0" class="p-3 font-italic">No matching items found.</div>

                <RecycleScroller
                    class="scroller"
                    :items="filteredRecipeOptions"
                    :item-size="40"
                    key-field="id"
                    v-slot="{ item }"
                >
                    <div class="recipe-item flex align-items-center" @mousedown.prevent @click="onSelectItem(item.id)">
                        <item-modifier-tooltip class="recipe-item-main flex align-items-center" :recipe="recipeData[item.id]">
                            <div class="relative flex align-items-center">
                                <n-image
                                    class="icon"
                                    width="32"
                                    :src="`${gameAssetsUrl}/ItemIcons/${item.iconPath}.png`"
                                    :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                    :preview-disabled="true"
                                />
                                <div v-if="recipeData[item.id]?.outputQuantity > 1" class="item-counter">x{{ recipeData[item.id].outputQuantity }}</div>
                            </div>
                            <div class="flex-shrink" style="min-width: 0">
                                <div class="label text-overflow-ellipsis" v-bind:item-id="item.id">
                                    <span v-if="item.highlightedLabel" v-html="item.highlightedLabel"></span>
                                    <span v-else>{{ item.label }}</span>
                                </div>
                            </div>
                        </item-modifier-tooltip>
                        <n-tooltip trigger="hover">
                            <template #trigger>
                                <n-button class="hover-button ml-auto" secondary type="default" size="small">
                                    <n-icon size="13">
                                        <Plus></Plus>
                                    </n-icon>
                                </n-button>
                            </template>
                            Add to list
                        </n-tooltip>
                    </div>
                </RecycleScroller>
            </n-card>
        </n-spin>
    </div>
</template>

<script>
import debounce from 'debounce';
import { mapActions, mapState } from 'pinia';
import { Plus } from '@vicons/fa';

import { useIcarusStore } from '@/store/icarus';
import { GAME_ASSETS_URL } from '@/constants/common';
import ItemModifierTooltip from './ItemModifierTooltip.vue';

const icarusStore = useIcarusStore();

export default {
    name: 'CraftingToolItemSelector',
    components: {
        Plus,
        ItemModifierTooltip,
    },
    props: {
        variant: {
            type: String,
            default: 'side',
            validator: (value) => ['side', 'top'].includes(value),
        },
    },
    data() {
        return {
            searchValue: null,
            gameAssetsUrl: GAME_ASSETS_URL,
            dropdownOpen: false,
        };
    },
    computed: {
        ...mapState(useIcarusStore, ['recipeData', 'isLoadingRecipes', 'filteredRecipeOptions', 'settings']),
    },
    watch: {
        variant() {
            this.dropdownOpen = false;
        },
    },
    mounted() {
        document.addEventListener('mousedown', this.onDocumentMouseDown);
    },
    beforeUnmount() {
        document.removeEventListener('mousedown', this.onDocumentMouseDown);
    },
    methods: {
        ...mapActions(useIcarusStore, ['addItem']),
        onSearch: debounce((value) => {
            icarusStore.recipeSearch = value;
        }, 250),
        onFocus() {
            if (this.variant === 'top') {
                this.dropdownOpen = true;
            }
        },
        closeDropdown() {
            this.dropdownOpen = false;
        },
        onDocumentMouseDown(event) {
            if (this.variant !== 'top' || !this.dropdownOpen) {
                return;
            }
            if (!this.$el.contains(event.target)) {
                this.closeDropdown();
            }
        },
        onSelectItem(itemId) {
            this.addItem(itemId);
        },
    },
};
</script>

<style scoped lang="scss">
.item-search--side {
    .search-bar {
        margin-bottom: 0.75rem;
    }

    .scroll-wrap,
    .scroller {
        height: 30rem;
    }
}

.item-search--top {
    position: relative;
    width: min(42rem, 100%);
    margin: 0 auto;

    .search-bar {
        width: 100%;
    }

    .dropdown-spin {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 0.35rem);
        z-index: 20;
    }

    .dropdown-panel {
        box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.35);
    }

    .scroll-wrap,
    .scroller {
        height: 22rem;
        max-height: min(22rem, 60vh);
    }
}

.recipe-item {
    height: 40px;
    padding: 0.1rem 1rem 0.1rem 0.6rem;
    cursor: pointer;

    .recipe-item-main {
        flex: 1;
        min-width: 0;
    }

    .icon {
        margin-right: 0.5rem;
    }

    .label {
        font-weight: 600;
        line-height: 1rem;
    }

    .hover-button {
        visibility: hidden;
    }

    .plus {
        font-weight: bold;
        font-size: 16px;
    }

    &:hover {
        background-color: rgba(222, 222, 255, 0.01);

        .hover-button {
            visibility: visible;
        }
    }
}
</style>
