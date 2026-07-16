<template>
    <item-modifier-tooltip :recipe="tooltipRecipe">
        <button
            type="button"
            class="item-detail-chip"
            :class="[`item-detail-chip--${variant}`, { 'is-static': !clickable }]"
            :disabled="!clickable"
            @click="onClick"
        >
            <n-image
                :width="iconSize"
                :src="`${gameAssetsUrl}/ItemIcons/${iconPath}.png`"
                :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                :preview-disabled="true"
            />
            <span v-if="count != null && countPlacement === 'start'" class="item-detail-chip-count">
                {{ count }}×
            </span>
            <span class="item-detail-chip-label">{{ label }}</span>
            <span v-if="count != null && countPlacement === 'end'" class="item-detail-chip-meta">
                ×{{ count }}
            </span>
            <span v-if="meta" class="item-detail-chip-meta">{{ meta }}</span>
        </button>
    </item-modifier-tooltip>
</template>

<script>
import { mapState } from 'pinia';

import { useIcarusStore } from '@/store/icarus';
import { GAME_ASSETS_URL } from '@/constants/common';
import { resolveModifierTooltipRecipe } from '@/utility/icarusData';
import ItemModifierTooltip from '@/pages/icarus/components/craftingCalculator/ItemModifierTooltip.vue';

export default {
    name: 'ItemDetailChip',
    components: {
        ItemModifierTooltip,
    },
    props: {
        /** Static item / recipe id used for navigation. */
        itemId: {
            type: String,
            required: true,
        },
        /** Recipe id for buff tooltip lookup; defaults to itemId. */
        recipeId: {
            type: String,
            default: null,
        },
        label: {
            type: String,
            required: true,
        },
        iconPath: {
            type: String,
            default: '',
        },
        count: {
            type: Number,
            default: null,
        },
        /** Where to render count: before label (`2× Name`) or after (`Name ×2`). */
        countPlacement: {
            type: String,
            default: 'start',
            validator: (value) => ['start', 'end'].includes(value),
        },
        meta: {
            type: String,
            default: null,
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'compact'].includes(value),
        },
        clickable: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['select'],
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
        };
    },
    computed: {
        ...mapState(useIcarusStore, ['recipeData', 'dataCatalog']),
        tooltipRecipe() {
            const id = this.recipeId || this.itemId;
            return resolveModifierTooltipRecipe(id, {
                catalog: this.dataCatalog,
                recipeData: this.recipeData,
            });
        },
        iconSize() {
            return this.variant === 'compact' ? 18 : 22;
        },
    },
    methods: {
        onClick() {
            if (!this.clickable || !this.itemId) return;
            this.$emit('select', this.itemId);
        },
    },
};
</script>

<style scoped lang="scss">
.item-detail-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    max-width: 100%;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &.is-static,
    &:disabled {
        cursor: default;
    }
}

.item-detail-chip--default {
    padding: 0.28rem 0.55rem 0.28rem 0.35rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.22);
    transition:
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.15s ease;

    &:hover:not(:disabled):not(.is-static) {
        border-color: rgba(99, 226, 183, 0.45);
        background: rgba(99, 226, 183, 0.08);
        transform: translateY(-1px);
    }
}

.item-detail-chip--compact {
    gap: 0.3rem;
    padding: 0.18rem 0.4rem 0.18rem 0.25rem;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.15s ease;

    &:hover:not(:disabled):not(.is-static) {
        background: rgba(99, 226, 183, 0.12);
    }

    .item-detail-chip-label {
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .item-detail-chip-meta {
        font-size: 0.7rem;
    }
}

.item-detail-chip-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    font-variant-numeric: tabular-nums;
}

.item-detail-chip-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
}

.item-detail-chip-meta {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
    font-variant-numeric: tabular-nums;
}
</style>
