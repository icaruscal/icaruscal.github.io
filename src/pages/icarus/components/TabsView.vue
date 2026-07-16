<template>
    <div class="tabs-view">
        <n-spin :show="isLoadingRecipes">
            <n-card class="overflow-hidden tabs-card" content-style="padding: 0;">
                <div class="tab-meta flex align-items-center px-3 pt-2">
                    <span class="tab-count">{{ planningTabCount }} / {{ maxPlanningTabs }} lists</span>
                </div>
                <n-tabs
                    ref="tabsInstRef"
                    class="browser-tabs"
                    type="card"
                    size="small"
                    v-model:value="activeTabId"
                    :addable="planningTabCount < maxPlanningTabs"
                    closable
                    tabs-padding="8"
                    @add="addTab"
                    @close="onCloseTab"
                >
                    <n-tab-pane
                        v-for="tab in tabs"
                        :name="tab.id"
                        :key="tab.id"
                        :closable="!tab.isDashboard"
                    >
                        <template #tab>
                            <div
                                class="browser-tab-label"
                                :class="{ dashboard: tab.isDashboard }"
                                @dblclick.stop="startRename(tab, $event)"
                            >
                                <n-input
                                    v-if="editingTabId === tab.id"
                                    ref="renameInput"
                                    class="tab-rename-input"
                                    size="tiny"
                                    :value="editingTitle"
                                    @click.stop
                                    @mousedown.stop
                                    @update:value="editingTitle = $event"
                                    @keydown.enter.prevent="commitRename"
                                    @keydown.esc.prevent="cancelRename"
                                    @blur="commitRename"
                                />
                                <span v-else class="tab-title">{{ tab.title }}</span>
                            </div>
                        </template>
                        <div class="tab-pane-body">
                            <dashboard-view v-if="tab.isDashboard" @open-tab="onOpenTabFromDashboard" />
                            <crafting-calculator v-else :tab="tab" />
                        </div>
                    </n-tab-pane>
                </n-tabs>
            </n-card>
        </n-spin>
    </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'pinia';
import { useIcarusStore } from '@/store/icarus';

import CraftingCalculator from '@/pages/icarus/components/craftingCalculator/CraftingCalculator.vue';
import DashboardView from '@/pages/icarus/components/DashboardView.vue';

const icarusStore = useIcarusStore();

export default {
    name: 'CraftingToolTabView',
    components: {
        CraftingCalculator,
        DashboardView,
    },
    data() {
        return {
            activeTabId: icarusStore.activeTabId,
            editingTabId: null,
            editingTitle: '',
        };
    },
    watch: {
        activeTabId(newValue) {
            this.setActiveTab(newValue);
            if (this.editingTabId && this.editingTabId !== newValue) {
                this.cancelRename();
            }
        },
        storeActiveTabId(newValue) {
            if (newValue !== this.activeTabId) {
                this.activeTabId = newValue;
                this.syncTabBarPosition();
            }
        },
    },
    computed: {
        ...mapState(useIcarusStore, ['tabs', 'tabCount', 'activeTab', 'isLoadingRecipes']),
        ...mapGetters(useIcarusStore, ['planningTabCount', 'maxPlanningTabs']),
        storeActiveTabId() {
            return icarusStore.activeTabId;
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['setActiveTab', 'setTabTitle']),
        addTab() {
            if (this.planningTabCount >= this.maxPlanningTabs) {
                return;
            }
            const newTab = icarusStore.addTab();
            this.setActiveTab(newTab.id);
            this.syncSelectedTab();
        },
        onCloseTab(tabId) {
            const tab = this.tabs.find((entry) => entry.id === tabId);
            if (!tab || tab.isDashboard) {
                return;
            }
            if (this.editingTabId === tabId) {
                this.cancelRename();
            }
            icarusStore.removeTab(tabId);
            this.syncSelectedTab();
        },
        onOpenTabFromDashboard(tabId) {
            this.activeTabId = tabId;
            this.setActiveTab(tabId);
            this.syncTabBarPosition();
        },
        syncSelectedTab() {
            this.activeTabId = icarusStore.activeTabId;
            this.syncTabBarPosition();
        },
        syncTabBarPosition() {
            this.$nextTick(() => {
                this.$refs.tabsInstRef?.syncBarPosition?.();
            });
        },
        startRename(tab, event) {
            if (tab.isDashboard) {
                return;
            }
            event?.preventDefault?.();
            this.editingTabId = tab.id;
            this.editingTitle = tab.title;
            this.$nextTick(() => {
                const input = this.$refs.renameInput;
                const el = Array.isArray(input) ? input[0] : input;
                el?.focus?.();
                const nativeInput = el?.$el?.querySelector?.('input');
                nativeInput?.select?.();
            });
        },
        commitRename() {
            if (this.editingTabId == null) {
                return;
            }
            const title = (this.editingTitle || '').trim();
            if (title) {
                this.setTabTitle(this.editingTabId, title);
            }
            this.cancelRename();
            this.syncTabBarPosition();
        },
        cancelRename() {
            this.editingTabId = null;
            this.editingTitle = '';
        },
    },
};
</script>

<style scoped lang="scss">
.tab-meta {
    justify-content: flex-end;

    .tab-count {
        font-size: 0.75rem;
        opacity: 0.55;
    }
}

.tab-pane-body {
    padding: 1rem;
}

.browser-tab-label {
    display: inline-flex;
    align-items: center;
    max-width: 12rem;
    min-height: 1.25rem;

    &.dashboard .tab-title {
        font-weight: 700;
    }
}

.tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
}

.tab-rename-input {
    width: 9rem;
}

.browser-tabs {
    :deep(.n-tabs-nav) {
        padding: 0 0.5rem;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    :deep(.n-tabs-tab) {
        border-radius: 8px 8px 0 0 !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-bottom: none !important;
        margin-right: 0.25rem !important;
        padding: 0.35rem 0.65rem !important;
        transition: background 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.08) !important;
        }
    }

    :deep(.n-tabs-tab--active) {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.16) !important;
        font-weight: 600;
    }

    :deep(.n-tabs-tab__close) {
        margin-left: 0.35rem;
        border-radius: 4px;

        &:hover {
            background: rgba(255, 80, 80, 0.25);
            color: #ff8f8f;
        }
    }

    :deep(.n-tabs-pad) {
        border-bottom: none !important;
    }

    :deep(.n-tabs-tab-pad) {
        border-bottom: none !important;
    }

    :deep(.n-tabs-nav-scroll-content) {
        border-bottom: none !important;
    }

    :deep(.n-tabs-wrapper) {
        align-items: flex-end;
    }
}
</style>
