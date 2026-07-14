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
                </div>
                <div class="header-actions flex align-items-center mr-2">
                    <n-tooltip trigger="hover" placement="bottom">
                        <template #trigger>
                            <n-button size="small" secondary quaternary circle :type="pageLayout === 'top' ? 'primary' : 'default'" @click="toggleLayout">
                                <n-icon size="16">
                                    <SearchPlus v-if="pageLayout === 'side'" />
                                    <Columns v-else />
                                </n-icon>
                            </n-button>
                        </template>
                        {{ pageLayout === 'side' ? 'Switch to top search layout' : 'Switch to side search layout' }}
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
        };
    },
    computed: {
        ...mapGetters(useIcarusStore, ['pageLayout']),
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
    }
}
</style>
