<template>
    <div class="tree-line flex align-items-center" :class="{ completed: isCompleted }">
        <n-checkbox :checked="isCompleted" size="small" @update:checked="onToggleComplete" />
        <div class="progress flex align-items-center">
            <n-input-number
                class="progress-current"
                size="tiny"
                :value="currentCount"
                :min="0"
                :max="requiredCount"
                :show-button="false"
                :validator="validateCount"
                @update:value="onCurrentChange"
            />
            <span class="progress-separator">/</span>
            <span class="progress-required">{{ requiredCount }}</span>
        </div>
        <div class="label" :data-item-id="node.id">{{ node.label }}</div>
        <div v-if="stationLabel" class="station flex align-items-center">
            <span>{{ stationLabel }}</span>
            <n-tooltip v-if="canAddStation" trigger="hover">
                <template #trigger>
                    <n-button class="station-add-btn" secondary type="default" size="tiny" @click.stop="addStation">
                        <n-icon size="12">
                            <Plus />
                        </n-icon>
                    </n-button>
                </template>
                Add station to craft list
            </n-tooltip>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { Plus } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import { itemLabelMap } from '@/utility/icarusData';

export default {
    name: 'CraftingTreeLine',
    components: {
        Plus,
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
    },
    computed: {
        ...mapState(useIcarusStore, ['recipeData']),
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
        stationId() {
            return this.node.preferredSource ?? null;
        },
        stationLabel() {
            if (!this.stationId || this.node.isRaw) {
                return null;
            }
            return this.recipeData[this.stationId]?.label ?? itemLabelMap[this.stationId] ?? this.stationId;
        },
        canAddStation() {
            return Boolean(this.stationId && this.recipeData[this.stationId]);
        },
    },
    watch: {
        requiredCount(newRequired) {
            if (!this.entry) {
                return;
            }
            if (this.entry.current > newRequired) {
                this.entry.current = newRequired;
            }
            if (this.entry.completed) {
                this.entry.current = newRequired;
            }
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['addItem']),
        ensureEntry(path = this.path) {
            if (!this.progress[path]) {
                this.progress[path] = {
                    current: 0,
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
            const entry = this.ensureEntry(path);
            const required = Math.ceil(node.quantity ?? 0);
            entry.completed = completed;
            entry.current = completed ? required : 0;

            (node.children || []).forEach((child) => {
                this.setSubtreeCompletion(this.resolveChildNode(child), `${path}/${child.id}`, completed);
            });
        },
        validateCount(value) {
            return Number.isInteger(value);
        },
        onCurrentChange(value) {
            const entry = this.ensureEntry();
            const next = Math.min(Math.max(0, value ?? 0), this.requiredCount);
            const completed = next >= this.requiredCount;
            entry.current = next;
            entry.completed = completed;

            if (completed) {
                this.setSubtreeCompletion(this.node, this.path, true);
            }
        },
        onToggleComplete(checked) {
            this.setSubtreeCompletion(this.node, this.path, checked);
        },
        addStation() {
            if (!this.canAddStation) {
                return;
            }
            this.addItem(this.stationId);
        },
    },
};
</script>

<style scoped lang="scss">
.tree-line {
    min-height: 1.9rem;
    border-radius: 4px;
    padding-right: 0.25rem;
    gap: 0.35rem;

    .progress {
        flex-shrink: 0;
        gap: 0.15rem;
        min-width: 4.5rem;

        .progress-current {
            width: 2.75rem;
        }

        .progress-separator {
            opacity: 0.6;
        }

        .progress-required {
            min-width: 1.25rem;
            font-weight: 500;
        }
    }

    .label {
        min-width: 10rem;
    }

    .station {
        margin-left: 0.5rem;
        font-size: 0.8rem;
        opacity: 0.55;
        white-space: nowrap;
        gap: 0.2rem;

        .station-add-btn {
            opacity: 0.7;
            height: 1.25rem;
            width: 1.25rem;
            padding: 0;
        }
    }

    &.completed {
        opacity: 0.4;

        .label {
            text-decoration: line-through;
        }
    }

    &:hover {
        background-color: rgba(222, 222, 255, 0.03);
    }
}

:deep(.progress-current .n-input) {
    --n-height: 22px;
    --n-font-size: 12px;
    --n-padding-left: 4px;
    --n-padding-right: 4px;
}
</style>
