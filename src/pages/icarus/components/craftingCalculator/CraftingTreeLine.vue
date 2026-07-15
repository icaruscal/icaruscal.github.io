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
        <div class="status-toggles flex align-items-center">
            <n-tooltip trigger="hover" :delay="300" :duration="0" :keep-alive-on-hover="false">
                <template #trigger>
                    <button
                        type="button"
                        class="status-toggle"
                        :class="{ active: isInFabrication }"
                        :aria-label="isInFabrication ? 'Clear in fabrication' : 'Mark in fabrication'"
                        :aria-pressed="isInFabrication"
                        @click.stop="onToggleFabrication"
                    >
                        <n-icon size="13">
                            <Hammer />
                        </n-icon>
                    </button>
                </template>
                In fabrication
            </n-tooltip>
            <n-tooltip trigger="hover" :delay="300" :duration="0" :keep-alive-on-hover="false">
                <template #trigger>
                    <button
                        type="button"
                        class="status-toggle"
                        :class="{ active: isReadyAtLocation }"
                        :aria-label="isReadyAtLocation ? 'Clear ready at location' : 'Mark ready at location'"
                        :aria-pressed="isReadyAtLocation"
                        @click.stop="onToggleReady"
                    >
                        <n-icon size="13">
                            <MapMarkerAlt />
                        </n-icon>
                    </button>
                </template>
                Ready at location
            </n-tooltip>
        </div>
        <div class="progress flex align-items-center">
            <quantity-stepper
                :model-value="currentCount"
                :min="0"
                :max="requiredCount"
                @update:model-value="onCurrentChange"
            />
            <span class="progress-separator">/</span>
            <span class="progress-required">{{ requiredCount }}</span>
            <span class="progress-remaining">({{ remainingCount }})</span>
        </div>
        <div class="label flex align-items-center" :data-item-id="node.id">
            <span>{{ node.label }}</span>
            <item-lock-badge
                :item-id="detailItemId"
                :recipe-id="componentRecipe?.id || node.id"
                size="sm"
            />
            <item-detail-button :item-id="detailItemId" :label="node.label" />
            <recipe-variant-picker
                v-if="!node.isRaw"
                :item-id="node.id"
                :preferred-recipe-id="recipePreferences[path] || null"
                @change="onRecipePreferenceChange"
            />
        </div>
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
import { ChevronDown, ChevronRight, ExternalLinkAlt, Hammer, MapMarkerAlt, Plus } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import { getStationCraftRecipeId, getStationLabel, resolveItemRecipe } from '@/utility/icarusData';
import { colorForName, TREE_MUTED_COLOR } from './treeLevelColors';
import QuantityStepper from './QuantityStepper.vue';
import RecipeVariantPicker from './RecipeVariantPicker.vue';
import ItemDetailButton from '@/pages/icarus/components/ItemDetailButton.vue';
import ItemLockBadge from '@/pages/icarus/components/ItemLockBadge.vue';

export default {
    name: 'CraftingTreeLine',
    components: {
        ChevronDown,
        ChevronRight,
        ExternalLinkAlt,
        Hammer,
        MapMarkerAlt,
        Plus,
        ItemDetailButton,
        ItemLockBadge,
        QuantityStepper,
        RecipeVariantPicker,
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
        recipePreferences: {
            type: Object,
            default: () => ({}),
        },
    },
    emits: ['toggle-collapse', 'recipe-preference-change'],
    computed: {
        ...mapState(useIcarusStore, {
            recipeData: 'recipeData',
            stationCatalog: 'stations',
            itemTableData: 'itemTableData',
            itemStaticData: 'itemStaticData',
        }),
        levelColor() {
            if (!this.colorEnabled) {
                return TREE_MUTED_COLOR;
            }
            return colorForName(this.node.label ?? this.node.id);
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
        remainingCount() {
            return Math.max(0, this.requiredCount - this.currentCount);
        },
        isReadyAtLocation() {
            return (
                Boolean(this.entry?.readyAtLocation) ||
                Boolean(this.entry?.completed) ||
                (this.requiredCount > 0 && this.currentCount >= this.requiredCount)
            );
        },
        isInFabrication() {
            return Boolean(this.entry?.inFabrication) || this.isReadyAtLocation;
        },
        isCompleted() {
            return this.isReadyAtLocation;
        },
        componentRecipe() {
            if (this.node.isRaw) {
                return null;
            }
            if (this.node.recipeId && this.recipeData[this.node.recipeId]) {
                return this.recipeData[this.node.recipeId];
            }
            return (
                resolveItemRecipe(
                    this.node.id,
                    {
                        recipeData: this.recipeData,
                        itemStaticData: this.itemStaticData,
                    },
                    { preferredRecipeId: this.recipePreferences[this.path] || null }
                ) ??
                this.recipeData[this.node.id] ??
                Object.values(this.recipeData).find(
                    (recipe) => recipe.outputItemId === this.node.id || recipe.itemStaticId === this.node.id
                ) ??
                null
            );
        },
        detailItemId() {
            return this.componentRecipe?.itemStaticId || this.node.id;
        },
        stations() {
            const recipe = this.componentRecipe;
            if (!recipe?.sources?.length) {
                return [];
            }
            const preferred = recipe.preferredSource ?? this.node.preferredSource ?? recipe.sources[0];
            const stationContext = {
                stations: this.stationCatalog,
                recipeData: this.recipeData,
                itemTableData: this.itemTableData,
            };
            return recipe.sources.map((stationId) => {
                const craftRecipeId = getStationCraftRecipeId(stationId, stationContext);
                return {
                    id: stationId,
                    craftRecipeId,
                    label: getStationLabel(stationId, stationContext),
                    isPreferred: stationId === preferred,
                    canAdd: Boolean(craftRecipeId),
                };
            });
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
            if (this.entry.completed || this.entry.readyAtLocation) {
                this.entry.current = newRequired;
                this.entry.completed = true;
                this.entry.readyAtLocation = true;
                this.entry.inFabrication = true;
            }
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['addItem', 'openItemInNewTab']),
        onRecipePreferenceChange(recipeId) {
            this.recipePreferences[this.path] = recipeId;
            this.$emit('recipe-preference-change');
        },
        ensureEntry(path = this.path) {
            if (!this.progress[path]) {
                this.progress[path] = {
                    current: 0,
                    required: 0,
                    completed: false,
                    inFabrication: false,
                    readyAtLocation: false,
                };
            }
            const entry = this.progress[path];
            if (entry.inFabrication === undefined) {
                entry.inFabrication = false;
            }
            if (entry.readyAtLocation === undefined) {
                entry.readyAtLocation = Boolean(entry.completed);
            }
            return entry;
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
        setSubtreeFabrication(node, path, inFabrication) {
            if (!inFabrication) {
                this.setSubtreeProgressByRatio(node, path, 0);
                this.clearSubtreeFabrication(node, path);
                return;
            }

            const entry = this.ensureEntry(path);
            entry.inFabrication = true;

            (node.children || []).forEach((child) => {
                this.setSubtreeFabrication(this.resolveChildNode(child), `${path}/${child.id}`, true);
            });
        },
        clearSubtreeFabrication(node, path) {
            const entry = this.ensureEntry(path);
            entry.inFabrication = false;

            (node.children || []).forEach((child) => {
                this.clearSubtreeFabrication(this.resolveChildNode(child), `${path}/${child.id}`);
            });
        },
        setSubtreeReady(node, path, ready) {
            this.setSubtreeProgressByRatio(node, path, ready ? 1 : 0);
            if (ready) {
                this.setSubtreeFabrication(node, path, true);
            }
        },
        setSubtreeProgressByRatio(node, path, ratio) {
            const entry = this.ensureEntry(path);
            const required = Math.ceil(node.quantity ?? 0);
            const clampedRatio = Math.min(Math.max(ratio, 0), 1);
            const current = required > 0 ? Math.min(required, Math.round(required * clampedRatio)) : 0;
            const completed = required > 0 && current >= required;

            entry.current = current;
            entry.required = required;
            entry.completed = completed;
            entry.readyAtLocation = completed;
            if (completed) {
                entry.inFabrication = true;
            }

            (node.children || []).forEach((child) => {
                this.setSubtreeProgressByRatio(this.resolveChildNode(child), `${path}/${child.id}`, clampedRatio);
            });
        },
        onCurrentChange(value) {
            const next = Math.min(Math.max(0, value ?? 0), this.requiredCount);
            const ratio = this.requiredCount > 0 ? next / this.requiredCount : 0;
            this.setSubtreeProgressByRatio(this.node, this.path, ratio);
        },
        onToggleFabrication() {
            this.setSubtreeFabrication(this.node, this.path, !this.isInFabrication);
        },
        onToggleReady() {
            this.setSubtreeReady(this.node, this.path, !this.isReadyAtLocation);
        },
        addStation(stationId) {
            const craftRecipeId = getStationCraftRecipeId(stationId, {
                stations: this.stationCatalog,
                recipeData: this.recipeData,
            });
            if (!craftRecipeId) {
                return;
            }
            this.addItem(craftRecipeId);
        },
        openStationInNewTab(stationId) {
            const craftRecipeId = getStationCraftRecipeId(stationId, {
                stations: this.stationCatalog,
                recipeData: this.recipeData,
            });
            if (!craftRecipeId) {
                return;
            }
            this.openItemInNewTab(craftRecipeId);
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

    .status-toggles {
        flex-shrink: 0;
        gap: 0.1rem;
    }

    .status-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        padding: 0;
        border: 1px solid color-mix(in srgb, var(--tree-level-color) 30%, transparent);
        border-radius: 3px;
        background: transparent;
        color: inherit;
        opacity: 0.4;
        cursor: pointer;

        &:hover {
            opacity: 0.75;
            background-color: color-mix(in srgb, var(--tree-level-color) 18%, transparent);
        }

        &.active {
            opacity: 1;
            background-color: color-mix(in srgb, var(--tree-level-color) 28%, transparent);
            border-color: color-mix(in srgb, var(--tree-level-color) 55%, transparent);
        }
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

        .progress-remaining {
            opacity: 0.65;
            font-size: 0.9em;
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
        .collapse-toggle,
        .collapse-spacer,
        .progress,
        .label,
        .stations {
            opacity: 0.4;
        }

        .label {
            text-decoration: line-through;
        }
    }

    &:hover {
        background-color: color-mix(in srgb, var(--tree-level-color) 18%, transparent);
    }
}
</style>
