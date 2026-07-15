<template>
    <n-tooltip trigger="hover" :delay="300" :duration="0">
        <template #trigger>
            <n-button
                class="item-detail-btn"
                size="tiny"
                quaternary
                circle
                type="default"
                :aria-label="`Details for ${label || itemId}`"
                @click.stop="onOpen"
            >
                <n-icon size="12">
                    <InfoCircle />
                </n-icon>
            </n-button>
        </template>
        Item details
    </n-tooltip>
</template>

<script>
import { mapActions } from 'pinia';
import { InfoCircle } from '@vicons/fa';

import { useIcarusStore } from '@/store/icarus';

export default {
    name: 'ItemDetailButton',
    components: {
        InfoCircle,
    },
    props: {
        /** Static item id or recipe id. */
        itemId: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            default: '',
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['openItemDetail']),
        onOpen() {
            this.openItemDetail(this.itemId);
        },
    },
};
</script>

<style lang="scss" scoped>
.item-detail-btn {
    flex-shrink: 0;
    margin-left: 0.25rem;
}
</style>
