<template>
    <n-tooltip trigger="hover" :delay="300" :duration="0">
        <template #trigger>
            <n-button
                class="favorite-star-btn"
                :class="{
                    'is-favorited': favorited,
                    [`favorite-star-btn--${size}`]: true,
                }"
                size="tiny"
                quaternary
                circle
                type="default"
                :aria-label="ariaLabel"
                @click.stop="onToggle"
            >
                <n-icon :size="iconSize">
                    <Star v-if="favorited" />
                    <StarRegular v-else />
                </n-icon>
            </n-button>
        </template>
        {{ favorited ? 'Remove from favorites' : 'Add to favorites' }}
    </n-tooltip>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { Star, StarRegular } from '@vicons/fa';

import { useIcarusStore } from '@/store/icarus';

export default {
    name: 'FavoriteStarButton',
    components: {
        Star,
        StarRegular,
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
        size: {
            type: String,
            default: 'md',
            validator: (value) => ['sm', 'md', 'lg'].includes(value),
        },
    },
    computed: {
        ...mapState(useIcarusStore, ['favorites']),
        favorited() {
            void this.favorites;
            return this.isFavorite(this.itemId);
        },
        ariaLabel() {
            const name = this.label || this.itemId;
            return this.favorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`;
        },
        iconSize() {
            if (this.size === 'lg') return 18;
            if (this.size === 'sm') return 12;
            return 14;
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['isFavorite', 'toggleFavorite']),
        onToggle() {
            this.toggleFavorite(this.itemId);
        },
    },
};
</script>

<style lang="scss" scoped>
.favorite-star-btn {
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.35);
    margin-right: 0.15rem;

    &:hover {
        color: #e6b84a;
    }

    &.is-favorited {
        color: #e6b84a;
    }
}

.favorite-star-btn--sm {
    margin-right: 0.1rem;
}

.favorite-star-btn--lg {
    margin-right: 0.25rem;
}
</style>
