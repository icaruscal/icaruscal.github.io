<template>
    <header class="header">
        <div class="navbar">
            <div class="inner px-2 flex align-items-center justify-content-between">
                <div class="mx-2 title flex align-items-center">
                    <n-image
                        class="icon"
                        width="24"
                        :src="`${gameAssetsUrl}/ItemIcons/Tools/ITEM_Building_RepairTool.png`"
                        :preview-disabled="true"
                    />
                    <span class="px-2">Icarus Crafting Calculator</span>
                    <nav class="page-nav flex align-items-center ml-3">
                        <router-link
                            v-for="item in navItems"
                            :key="item.to"
                            class="page-nav-link"
                            :to="item.to"
                            active-class="is-active"
                            exact-active-class="is-active"
                        >
                            {{ item.label }}
                        </router-link>
                    </nav>
                </div>
                <div class="header-actions flex align-items-center mr-2">
                    <n-tooltip v-if="gameVersionShort" trigger="hover" placement="bottom">
                        <template #trigger>
                            <n-text depth="3" class="game-version-label mr-3">
                                {{ gameVersionShort }}
                            </n-text>
                        </template>
                        <div class="game-version-tooltip">
                            <div>{{ gameVersionLabel }}</div>
                            <div v-if="gameVersionExtractedAt">Extracted {{ gameVersionExtractedAt }}</div>
                        </div>
                    </n-tooltip>
                    <n-tooltip trigger="hover" placement="bottom">
                        <template #trigger>
                            <n-button size="small" secondary quaternary circle :type="pageLayout === 'top' ? 'primary' : 'default'" @click="toggleLayout">
                                <n-icon size="16">
                                    <SearchPlus v-if="pageLayout === 'side'" />
                                    <Columns v-else />
                                </n-icon>
                            </n-button>
                        </template>
                        {{ pageLayout === 'side' ? 'Switch to top layout' : 'Switch to side layout' }}
                    </n-tooltip>
                </div>
            </div>
        </div>
    </header>
</template>

<script>
import { mapActions, mapGetters } from 'pinia';
import { Columns, SearchPlus } from '@vicons/fa';
import { GAME_ASSETS_URL } from '@/constants/common';
import { RouteName } from '@/constants/router';
import { useIcarusStore } from '@/store/icarus';

export default {
    name: 'Header',
    components: {
        Columns,
        SearchPlus,
    },
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
            navItems: [
                { label: 'Calculator', to: { name: RouteName.CALCULATOR } },
                { label: 'Consumables', to: { name: RouteName.CONSUMABLES } },
                { label: 'Gear', to: { name: RouteName.GEAR } },
            ],
        };
    },
    computed: {
        ...mapGetters(useIcarusStore, ['pageLayout', 'gameVersionShort', 'gameVersionLabel', 'gameVersionExtractedAt']),
    },
    methods: {
        ...mapActions(useIcarusStore, ['setPageLayout']),
        toggleLayout() {
            this.setPageLayout(this.pageLayout === 'top' ? 'side' : 'top');
        },
    },
};
</script>

<style lang="scss">
.header {
    position: sticky;
    top: 0;
    z-index: 999;
}

.navbar {
    padding: 0.25rem;
    background-color: var(--navbar-bg-color);
    border-bottom: 1px solid var(--navbar-border-color);

    .inner {
        margin: 0 auto;
        max-width: 100rem;

        .title {
            min-height: 2rem;
            font-weight: bold;
            font-size: 1rem;
        }

        .game-version-label {
            font-size: 0.8rem;
            font-weight: normal;
            white-space: nowrap;
            cursor: default;
        }
    }
}

.page-nav {
    gap: 0.15rem;
    font-weight: 500;
}

.page-nav-link {
    padding: 0.25rem 0.7rem;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.15s ease, background-color 0.15s ease;

    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background-color: rgba(255, 255, 255, 0.06);
    }

    &.is-active {
        color: #70c0e8;
        background-color: rgba(112, 192, 232, 0.12);
    }
}

.game-version-tooltip {
    line-height: 1.4;
}
</style>
