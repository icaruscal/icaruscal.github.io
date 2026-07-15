<template>
    <n-tooltip v-if="hasLocks" trigger="hover" :delay="200" :duration="0">
        <template #trigger>
            <span
                class="item-lock-badge"
                :class="{ [`item-lock-badge--${size}`]: true }"
                role="img"
                :aria-label="ariaLabel"
            >
                <n-icon :size="iconSize">
                    <ExclamationCircle />
                </n-icon>
            </span>
        </template>
        <div class="item-lock-tooltip">
            <div v-for="(line, index) in tooltipLines" :key="index">{{ line }}</div>
        </div>
    </n-tooltip>
</template>

<script>
import { mapState } from 'pinia';
import { ExclamationCircle } from '@vicons/fa';

import { useIcarusStore } from '@/store/icarus';
import {
    formatLocksTooltipLines,
    hasItemLocks,
    normalizeLocks,
    resolveLocksForItem,
} from '@/utility/icarusData';

export default {
    name: 'ItemLockBadge',
    components: {
        ExclamationCircle,
    },
    props: {
        /** Pre-resolved locks object from catalog / food row / detail. */
        locks: {
            type: Object,
            default: null,
        },
        /** Craft / recipe id. */
        recipeId: {
            type: String,
            default: null,
        },
        /** D_ItemsStatic id. */
        itemId: {
            type: String,
            default: null,
        },
        size: {
            type: String,
            default: 'md',
            validator: (value) => ['sm', 'md', 'lg'].includes(value),
        },
    },
    computed: {
        ...mapState(useIcarusStore, ['dataCatalog', 'recipeData', 'itemStaticData']),
        resolvedLocks() {
            const direct = normalizeLocks(this.locks);
            if (direct) return direct;
            return resolveLocksForItem(
                { recipeId: this.recipeId, staticItemId: this.itemId },
                {
                    catalog: this.dataCatalog,
                    recipeData: this.recipeData,
                    itemStaticData: this.itemStaticData,
                }
            );
        },
        hasLocks() {
            return hasItemLocks(this.resolvedLocks);
        },
        tooltipLines() {
            return formatLocksTooltipLines(this.resolvedLocks);
        },
        ariaLabel() {
            return this.tooltipLines.join('. ') || 'Content lock';
        },
        iconSize() {
            if (this.size === 'lg') return 16;
            if (this.size === 'sm') return 11;
            return 13;
        },
    },
};
</script>

<style lang="scss" scoped>
.item-lock-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #e6a23c;
    cursor: help;
    line-height: 1;
}

.item-lock-badge--sm {
    margin-left: 0.2rem;
}

.item-lock-badge--md {
    margin-left: 0.3rem;
}

.item-lock-badge--lg {
    margin-left: 0.4rem;
}

.item-lock-tooltip {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    max-width: 16rem;
}
</style>
