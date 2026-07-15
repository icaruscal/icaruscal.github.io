<template>
    <n-popover
        v-if="recipeIds.length > 1"
        v-model:show="open"
        trigger="manual"
        placement="bottom-start"
        :show-arrow="false"
        :raw="true"
        :style="{ padding: 0 }"
        :on-clickoutside="onClickOutside"
    >
        <template #trigger>
            <n-tooltip trigger="hover" :delay="400" :disabled="open">
                <template #trigger>
                    <n-button
                        class="recipe-variant-btn"
                        text
                        size="tiny"
                        :type="hasNonDefaultSelection ? 'primary' : 'default'"
                        @click.prevent.stop="toggleOpen"
                        @mousedown.prevent
                    >
                        <n-icon size="12">
                            <AngleDown />
                        </n-icon>
                    </n-button>
                </template>
                Choose crafting recipe
            </n-tooltip>
        </template>

        <n-card class="recipe-variant-panel" content-style="padding: 0;" size="small">
            <div class="panel-search">
                <n-input
                    ref="searchInput"
                    v-model:value="search"
                    size="small"
                    clearable
                    placeholder="Search recipes…"
                    @click.stop
                    @keydown.stop
                />
            </div>

            <div class="panel-list">
                <div v-if="filteredVariants.length === 0" class="panel-empty font-italic">No matching recipes.</div>
                <button
                    v-for="variant in filteredVariants"
                    :key="variant.id"
                    type="button"
                    class="variant-row"
                    :class="{ selected: variant.id === selectedRecipeId }"
                    @click="onSelect(variant.id)"
                >
                    <div class="variant-title">{{ variant.title }}</div>
                    <div class="variant-summary">{{ variant.summary }}</div>
                </button>
            </div>
        </n-card>
    </n-popover>
</template>

<script>
import { mapState } from 'pinia';
import { AngleDown } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import {
    formatRecipeVariantLabel,
    getCraftRecipeIdsForItem,
    resolveItemRecipe,
} from '@/utility/icarusData';

export default {
    name: 'RecipeVariantPicker',
    components: {
        AngleDown,
    },
    props: {
        itemId: {
            type: String,
            required: true,
        },
        preferredRecipeId: {
            type: String,
            default: null,
        },
    },
    emits: ['change'],
    data() {
        return {
            open: false,
            search: '',
        };
    },
    computed: {
        ...mapState(useIcarusStore, ['recipeData', 'itemStaticData', 'itemTableData']),
        recipeContext() {
            return {
                recipeData: this.recipeData,
                itemStaticData: this.itemStaticData,
                itemTableData: this.itemTableData,
            };
        },
        recipeIds() {
            return getCraftRecipeIdsForItem(this.itemId, this.recipeContext);
        },
        selectedRecipeId() {
            return (
                resolveItemRecipe(this.itemId, this.recipeContext, {
                    preferredRecipeId: this.preferredRecipeId,
                })?.id ?? null
            );
        },
        hasNonDefaultSelection() {
            return Boolean(this.preferredRecipeId && this.preferredRecipeId !== this.recipeIds[0]);
        },
        variants() {
            return this.recipeIds.map((recipeId) => {
                const recipe = this.recipeData[recipeId];
                return {
                    id: recipeId,
                    title: recipe?.label ?? recipeId,
                    summary: formatRecipeVariantLabel(recipe, this.recipeContext),
                };
            });
        },
        filteredVariants() {
            const query = this.search.trim().toLowerCase();
            if (!query) return this.variants;
            return this.variants.filter((variant) => {
                const haystack = `${variant.title} ${variant.summary} ${variant.id}`.toLowerCase();
                return haystack.includes(query);
            });
        },
    },
    watch: {
        open(show) {
            if (!show) {
                this.search = '';
                return;
            }
            this.$nextTick(() => {
                const input = this.$refs.searchInput?.inputElRef ?? this.$refs.searchInput?.$el?.querySelector?.('input');
                input?.focus?.({ preventScroll: true });
            });
        },
    },
    methods: {
        toggleOpen() {
            this.open = !this.open;
        },
        onClickOutside() {
            this.open = false;
        },
        onSelect(recipeId) {
            this.open = false;
            this.search = '';
            this.$emit('change', recipeId);
        },
    },
};
</script>

<style scoped lang="scss">
.recipe-variant-btn {
    margin-left: 0.15rem;
    opacity: 0.65;
    vertical-align: middle;

    &:hover {
        opacity: 1;
    }
}

.recipe-variant-panel {
    width: min(22rem, 86vw);
    background: rgb(24, 24, 28);
    border: 1px solid rgba(255, 255, 255, 0.09);
    box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.35);
}

.panel-search {
    padding: 0.55rem 0.65rem 0.45rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-list {
    max-height: min(16rem, 45vh);
    overflow-y: auto;
    padding: 0.25rem 0;
}

.panel-empty {
    padding: 0.75rem 0.85rem;
    font-size: 0.82rem;
    opacity: 0.55;
}

.variant-row {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0.45rem 0.85rem;
    line-height: 1.25;

    &:hover {
        background-color: rgba(222, 222, 255, 0.04);
    }

    &.selected {
        background-color: rgba(99, 226, 183, 0.08);

        .variant-title {
            color: #63e2b7;
        }
    }
}

.variant-title {
    font-weight: 600;
    font-size: 0.82rem;
}

.variant-summary {
    margin-top: 0.2rem;
    font-size: 0.72rem;
    line-height: 1.35;
    opacity: 0.55;
    white-space: normal;
}
</style>
