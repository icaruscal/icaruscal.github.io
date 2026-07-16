<template>
    <div class="dashboard">
        <div class="dashboard-header flex align-items-center justify-content-between gap-2">
            <div>
                <h3 class="dashboard-title">Closed tabs</h3>
                <n-text depth="3">Reopen lists with their items, recipe picks, and tree state</n-text>
            </div>
            <n-button
                v-if="closedTabSummaries.length > 0"
                size="small"
                secondary
                type="error"
                @click="clearHistory"
            >
                Clear history
            </n-button>
        </div>

        <n-text v-if="!canAddPlanningTab && closedTabSummaries.length > 0" depth="3" class="limit-note">
            Maximum of {{ maxPlanningTabs }} planning lists open. Close a tab to reopen one from history.
        </n-text>

        <em v-if="closedTabSummaries.length === 0" class="empty-label">
            No closed tabs yet. Close a planning list to save it here.
        </em>

        <div
            v-for="tab in closedTabSummaries"
            :key="tab.closedId"
            class="tab-card"
            :class="{ disabled: !canAddPlanningTab }"
            @click="reopenTab(tab.closedId)"
        >
            <div class="tab-card-header flex align-items-center justify-content-between gap-2">
                <div class="tab-card-title">{{ tab.title }}</div>
                <n-button
                    size="tiny"
                    type="primary"
                    secondary
                    :disabled="!canAddPlanningTab"
                    @click.stop="reopenTab(tab.closedId)"
                >
                    Reopen
                </n-button>
            </div>
            <div class="tab-card-meta">
                <span>{{ tab.itemCount }} {{ tab.itemCount === 1 ? 'item' : 'items' }}</span>
                <span v-if="tab.closedAt" class="meta-sep">·</span>
                <span v-if="tab.closedAt">{{ formatClosedAt(tab.closedAt) }}</span>
            </div>
            <div v-if="tab.rootItems.length > 0" class="root-items">
                <div v-for="item in tab.rootItems" :key="item.id" class="root-item flex align-items-center">
                    <div class="root-item-qty">×{{ item.quantity }}</div>
                    <div class="root-item-label">{{ item.label }}</div>
                </div>
            </div>
            <em v-else class="empty-list">Empty list</em>
        </div>
    </div>
</template>

<script>
import { mapActions, mapGetters } from 'pinia';
import { useIcarusStore } from '@/store/icarus';

export default {
    name: 'DashboardView',
    computed: {
        ...mapGetters(useIcarusStore, [
            'closedTabSummaries',
            'canAddPlanningTab',
            'maxPlanningTabs',
        ]),
    },
    methods: {
        ...mapActions(useIcarusStore, ['restoreClosedTab', 'clearClosedTabs']),
        formatClosedAt(timestamp) {
            try {
                return new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(timestamp));
            } catch {
                return '';
            }
        },
        reopenTab(closedId) {
            const tab = this.restoreClosedTab(closedId);
            if (tab) {
                this.$emit('open-tab', tab.id);
            }
        },
        clearHistory() {
            this.clearClosedTabs();
        },
    },
};
</script>

<style scoped lang="scss">
.dashboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.dashboard-title {
    margin: 0 0 0.15rem;
}

.limit-note {
    font-size: 0.85rem;
}

.tab-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.9rem 1rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
    }

    &.disabled {
        cursor: not-allowed;
        opacity: 0.65;
    }
}

.tab-card-title {
    font-weight: 600;
    font-size: 1rem;
}

.tab-card-meta,
.empty-label,
.empty-list {
    font-size: 0.8rem;
    opacity: 0.6;
}

.tab-card-meta {
    margin-top: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.meta-sep {
    opacity: 0.7;
}

.root-items {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.root-item {
    gap: 0.75rem;
    min-height: 1.6rem;
    border-radius: 4px;
    padding: 0.15rem 0.35rem;

    &:hover {
        background: rgba(255, 255, 255, 0.04);
    }
}

.root-item-qty {
    min-width: 2.5rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
}

.root-item-label {
    flex: 1;
}
</style>
