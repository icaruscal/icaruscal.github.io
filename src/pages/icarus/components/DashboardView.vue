<template>
    <div class="dashboard">
        <div class="dashboard-header">
            <h3 class="dashboard-title">Dashboard</h3>
            <n-text depth="3">Progress across all lists</n-text>
        </div>

        <div class="overall-card">
            <div class="overall-top flex align-items-center justify-content-between">
                <div>
                    <div class="overall-label">Overall</div>
                    <div class="overall-stats">
                        {{ overallProgress.completedNodes }} / {{ overallProgress.trackedNodes }} nodes ·
                        {{ overallProgress.currentTotal }} / {{ overallProgress.requiredTotal }} items ·
                        {{ overallProgress.tabCount }} lists
                    </div>
                </div>
                <div class="overall-percent">{{ overallProgress.percent }}%</div>
            </div>
            <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${overallProgress.percent}%` }"></div>
            </div>
        </div>

        <em v-if="tabProgressSummaries.length === 0" class="empty-label">No planning lists yet. Add a tab to get started.</em>

        <div v-for="tab in tabProgressSummaries" :key="tab.id" class="tab-card" @click="openTab(tab.id)">
            <div class="tab-card-header flex align-items-center justify-content-between">
                <div class="tab-card-title">{{ tab.title }}</div>
                <div class="tab-card-percent">{{ tab.percent }}%</div>
            </div>
            <div class="progress-track compact">
                <div class="progress-fill" :style="{ width: `${tab.percent}%` }"></div>
            </div>
            <div class="tab-card-meta">
                {{ tab.completedNodes }} / {{ tab.trackedNodes }} nodes · {{ tab.itemCount }} selected
            </div>
            <div v-if="tab.rootItems.length > 0" class="root-items">
                <div
                    v-for="item in tab.rootItems"
                    :key="item.id"
                    class="root-item flex align-items-center"
                    :class="{ completed: item.completed }"
                >
                    <div class="root-item-progress">{{ item.current }}/{{ item.required }}</div>
                    <div class="root-item-label flex align-items-center">
                        <span>{{ item.label }}</span>
                        <item-lock-badge :item-id="item.id" size="sm" />
                    </div>
                    <div class="root-item-percent">{{ item.percent }}%</div>
                </div>
            </div>
            <em v-else class="empty-list">No items in this list</em>
        </div>
    </div>
</template>

<script>
import { mapActions, mapGetters } from 'pinia';
import { useIcarusStore } from '@/store/icarus';
import ItemLockBadge from '@/pages/icarus/components/ItemLockBadge.vue';

export default {
    name: 'DashboardView',
    components: {
        ItemLockBadge,
    },
    computed: {
        ...mapGetters(useIcarusStore, ['tabProgressSummaries', 'overallProgress']),
    },
    methods: {
        ...mapActions(useIcarusStore, ['setActiveTab']),
        openTab(tabId) {
            this.setActiveTab(tabId);
            this.$emit('open-tab', tabId);
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

.overall-card,
.tab-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.9rem 1rem;
}

.tab-card {
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
    }
}

.overall-label,
.tab-card-title {
    font-weight: 600;
    font-size: 1rem;
}

.overall-stats,
.tab-card-meta,
.empty-label,
.empty-list {
    font-size: 0.8rem;
    opacity: 0.6;
}

.overall-percent,
.tab-card-percent {
    font-size: 1.35rem;
    font-weight: 700;
    opacity: 0.9;
}

.progress-track {
    margin-top: 0.65rem;
    height: 0.55rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;

    &.compact {
        height: 0.4rem;
        margin-top: 0.5rem;
    }
}

.progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #70c0e8, #95d5b2);
    transition: width 0.2s ease;
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

    &.completed {
        opacity: 0.45;

        .root-item-label {
            text-decoration: line-through;
        }
    }

    &:hover {
        background: rgba(255, 255, 255, 0.04);
    }
}

.root-item-progress {
    min-width: 3.5rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
}

.root-item-label {
    flex: 1;
}

.root-item-percent {
    min-width: 2.5rem;
    text-align: right;
    opacity: 0.55;
    font-size: 0.85rem;
}
</style>
