<template>
    <div
        class="tree-line flex align-items-center"
        :class="{ completed: isCompleted }"
        :style="levelStyle"
    >
        <button
            v-if="hasChildren"
            type="button"
            class="collapse-toggle"
            :aria-label="isCollapsed ? 'Expand' : 'Collapse'"
            @click.stop="$emit('toggle-collapse')"
        >
            <n-icon size="12">
                <ChevronRight v-if="isCollapsed" />
                <ChevronDown v-else />
            </n-icon>
        </button>
        <div v-else class="collapse-spacer"></div>
        <n-checkbox :checked="isCompleted" size="small" @update:checked="onToggleComplete" />
        <div class="progress flex align-items-center">
            <quantity-stepper
                :model-value="currentCount"
                :min="0"
                :max="requiredCount"
                @update:model-value="onCurrentChange"
            />
            <span class="progress-separator">/</span>
            <span class="progress-required">{{ requiredCount }}</span>
        </div>
        <div class="label" :data-item-id="node.id">{{ node.label }}</div>
        <div v-if="stations.length > 0" class="stations flex align-items-center flex-wrap">
            <div
                v-for="station in stations"
                :key="station.id"
                class="station flex align-items-center"
                :class="{ preferred: station.isPreferred }"
            >
                <span>{{ station.label }}</span>
                <n-button-group v-if="station.canAdd" size="tiny" class="station-actions">
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button secondary type="default" @click.stop="addStation(station.id)">
                                <n-icon size="12">
                                    <Plus />
                                </n-icon>
                            </n-button>
                        </template>
                        Add station to craft list
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button secondary type="default" @click.stop="openStationInNewTab(station.id)">
                                <n-icon size="12">
                                    <ExternalLinkAlt />
                                </n-icon>
                            </n-button>
                        </template>
                        Open station in new tab
                    </n-tooltip>
                </n-button-group>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { ChevronDown, ChevronRight, ExternalLinkAlt, Plus } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import { itemLabelMap } from '@/utility/icarusData';
import { TREE_LEVEL_COLORS, TREE_MUTED_COLOR } from './treeLevelColors';
import QuantityStepper from './QuantityStepper.vue';

export default {
    name: 'CraftingTreeLine',
    components: {
        ChevronDown,
        ChevronRight,
        ExternalLinkAlt,
        Plus,
        QuantityStepper,
    },
    props: {
        node: {
            type: Object,
            required: true,
        },
        path: {
            type: String,
            required: true,
        },
        progress: {
            type: Object,
            required: true,
        },
        depth: {
            type: Number,
            default: 0,
        },
        hasChildren: {
            type: Boolean,
            default: false,
        },
        isCollapsed: {
            type: Boolean,
            default: false,
        },
        colorEnabled: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['toggle-collapse'],
    computed: {
        ...mapState(useIcarusStore, ['recipeData']),
        levelColor() {
            if (!this.colorEnabled) {
                return TREE_MUTED_COLOR;
            }
            return TREE_LEVEL_COLORS[this.depth % TREE_LEVEL_COLORS.length];
        },
        levelStyle() {
            return {
                '--tree-level-color': this.levelColor,
            };
        },
        requiredCount() {
            return Math.ceil(this.node.quantity ?? 0);
        },
        entry() {
            return this.progress[this.path];
        },
        currentCount() {
            const current = this.entry?.current ?? 0;
            return Math.min(Math.max(0, current), this.requiredCount);
        },
        isCompleted() {
            return Boolean(this.entry?.completed) || this.currentCount >= this.requiredCount;
        },
        componentRecipe() {
            if (this.node.isRaw) {
                return null;
            }
            return (
                this.recipeData[this.node.id] ??
                Object.values(this.recipeData).find(
                    (recipe) => recipe.outputItemId === this.node.id || recipe.itemStaticId === this.node.id
                ) ??
                null
            );
        },
        stations() {
            const recipe = this.componentRecipe;
            if (!recipe?.sources?.length) {
                return [];
            }
            const preferred = recipe.preferredSource ?? this.node.preferredSource ?? recipe.sources[0];
            return recipe.sources.map((stationId) => ({
                id: stationId,
                label: this.recipeData[stationId]?.label ?? itemLabelMap[stationId] ?? stationId,
                isPreferred: stationId === preferred,
                canAdd: Boolean(this.recipeData[stationId]),
            }));
        },
    },
    watch: {
        requiredCount(newRequired) {
            if (!this.entry) {
                return;
            }
            this.entry.required = newRequired;
            if (this.entry.current > newRequired) {
                this.entry.current = newRequired;
            }
            if (this.entry.completed) {
                this.entry.current = newRequired;
            }
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['addItem', 'openItemInNewTab']),
        ensureEntry(path = this.path) {
            if (!this.progress[path]) {
                this.progress[path] = {
                    current: 0,
                    required: 0,
                    completed: false,
                };
            }
            return this.progress[path];
        },
        resolveChildNode(child) {
            if (child.expanded) {
                return {
                    ...child.expanded,
                    label: child.expanded.label ?? child.label,
                    isRaw: child.isRaw,
                };
            }
            return child;
        },
        setSubtreeCompletion(node, path, completed) {
            this.setSubtreeProgressByRatio(node, path, completed ? 1 : 0);
        },
        setSubtreeProgressByRatio(node, path, ratio) {
            const entry = this.ensureEntry(path);
            const required = Math.ceil(node.quantity ?? 0);
            const clampedRatio = Math.min(Math.max(ratio, 0), 1);
            const current = required > 0 ? Math.min(required, Math.round(required * clampedRatio)) : 0;

            entry.current = current;
            entry.required = required;
            entry.completed = required > 0 && current >= required;

            (node.children || []).forEach((child) => {
                this.setSubtreeProgressByRatio(this.resolveChildNode(child), `${path}/${child.id}`, clampedRatio);
            });
        },
        onCurrentChange(value) {
            const next = Math.min(Math.max(0, value ?? 0), this.requiredCount);
            const ratio = this.requiredCount > 0 ? next / this.requiredCount : 0;
            this.setSubtreeProgressByRatio(this.node, this.path, ratio);
        },
        onToggleComplete(checked) {
            this.setSubtreeCompletion(this.node, this.path, checked);
        },
        addStation(stationId) {
            if (!stationId || !this.recipeData[stationId]) {
                return;
            }
            this.addItem(stationId);
        },
        openStationInNewTab(stationId) {
            if (!stationId || !this.recipeData[stationId]) {
                return;
            }
            this.openItemInNewTab(stationId);
        },
    },
};
</script>

<style scoped lang="scss">
.tree-line {
    min-height: 1.9rem;
    border-radius: 4px;
    padding: 0.1rem 0.35rem 0.1rem 0.25rem;
    gap: 0.35rem;
    color: var(--tree-level-color);
    background-color: color-mix(in srgb, var(--tree-level-color) 10%, transparent);

    .collapse-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 1.15rem;
        height: 1.15rem;
        padding: 0;
        border: none;
        border-radius: 3px;
        background: transparent;
        color: inherit;
        cursor: pointer;

        &:hover {
            background-color: color-mix(in srgb, var(--tree-level-color) 22%, transparent);
        }
    }

    .collapse-spacer {
        width: 1.15rem;
        flex-shrink: 0;
    }

    .progress {
        flex-shrink: 0;
        gap: 0.2rem;
        min-width: 5.5rem;

        .progress-separator {
            opacity: 0.7;
        }

        .progress-required {
            min-width: 1.25rem;
            font-weight: 500;
        }

        :deep(.quantity-stepper) {
            border-color: color-mix(in srgb, var(--tree-level-color) 35%, transparent);
            background: color-mix(in srgb, var(--tree-level-color) 8%, transparent);

            .step-btn:hover:not(:disabled) {
                background: color-mix(in srgb, var(--tree-level-color) 20%, transparent);
            }

            .quantity-input {
                width: 2rem;
                border-left-color: color-mix(in srgb, var(--tree-level-color) 25%, transparent);
                border-right-color: color-mix(in srgb, var(--tree-level-color) 25%, transparent);
            }
        }
    }

    .label {
        min-width: 10rem;
        color: var(--tree-level-color);
    }

    .stations {
        margin-left: 0.5rem;
        gap: 0.35rem 0.65rem;
    }

    .station {
        font-size: 0.8rem;
        opacity: 0.55;
        white-space: nowrap;
        gap: 0.35rem;
        color: color-mix(in srgb, var(--tree-level-color) 75%, #ffffff);

        &.preferred {
            opacity: 0.9;
            font-weight: 600;
        }

        .station-actions {
            opacity: 0.9;

            :deep(.n-button) {
                height: 1.25rem;
                min-width: 1.25rem;
                padding: 0 0.3rem;
            }
        }
    }

    &.completed {
        opacity: 0.4;

        .label {
            text-decoration: line-through;
        }
    }

    &:hover {
        background-color: color-mix(in srgb, var(--tree-level-color) 18%, transparent);
    }
}
</style>
