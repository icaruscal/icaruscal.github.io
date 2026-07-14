<template>
    <div class="crafting-tree">
        <div class="crafting-tree-header flex align-items-center">
            <div class="components-section--label">Crafting Tree</div>
            <div class="header-actions flex align-items-center ml-auto">
                <n-button-group size="tiny" class="tree-expand-group">
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="tiny" secondary quaternary :disabled="trees.length === 0" @click="collapseAll">
                                <n-icon size="14">
                                    <Compress />
                                </n-icon>
                            </n-button>
                        </template>
                        Collapse all
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="tiny" secondary quaternary :disabled="trees.length === 0" @click="expandToLevel(1)">
                                <n-icon size="14">
                                    <AngleDown />
                                </n-icon>
                            </n-button>
                        </template>
                        Expand to level 1
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="tiny" secondary quaternary :disabled="trees.length === 0" @click="expandToLevel(2)">
                                <n-icon size="14">
                                    <AngleDoubleDown />
                                </n-icon>
                            </n-button>
                        </template>
                        Expand to level 2
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="tiny" secondary quaternary :disabled="trees.length === 0" @click="expandAll">
                                <n-icon size="14">
                                    <Expand />
                                </n-icon>
                            </n-button>
                        </template>
                        Expand all
                    </n-tooltip>
                </n-button-group>
                <n-tooltip trigger="hover">
                    <template #trigger>
                        <n-button
                            class="ml-2"
                            size="tiny"
                            secondary
                            quaternary
                            circle
                            :type="colorEnabled ? 'primary' : 'default'"
                            @click="toggleColors"
                        >
                            <n-icon size="14">
                                <Palette />
                            </n-icon>
                        </n-button>
                    </template>
                    {{ colorEnabled ? 'Disable item colors' : 'Enable item colors' }}
                </n-tooltip>
            </div>
        </div>
        <em v-if="trees.length === 0" class="empty-subcategory-label">No items</em>
        <div v-for="tree in trees" :key="tree.id" class="crafting-tree-root mb-3">
            <crafting-tree-node
                :node="tree"
                :path="tree.id"
                :progress="progress"
                :collapsed-paths="collapsedPaths"
                :color-enabled="colorEnabled"
                @toggle-collapse="toggleCollapse"
            />
        </div>
    </div>
</template>

<script>
import { mapActions, mapGetters } from 'pinia';
import { AngleDoubleDown, AngleDown, Compress, Expand, Palette } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import CraftingTreeNode from './CraftingTreeNode.vue';

export default {
    name: 'CraftingTree',
    components: {
        AngleDoubleDown,
        AngleDown,
        Compress,
        Expand,
        Palette,
        CraftingTreeNode,
    },
    props: {
        trees: {
            type: Array,
            required: true,
        },
        progress: {
            type: Object,
            required: true,
        },
        collapsedPaths: {
            type: Object,
            default: () => ({}),
        },
    },
    computed: {
        ...mapGetters(useIcarusStore, ['treeLevelColors']),
        colorEnabled() {
            return this.treeLevelColors;
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['setTreeLevelColors']),
        toggleColors() {
            this.setTreeLevelColors(!this.colorEnabled);
        },
        setCollapsedPaths(next) {
            Object.keys(this.collapsedPaths).forEach((key) => {
                delete this.collapsedPaths[key];
            });
            Object.assign(this.collapsedPaths, next);
        },
        toggleCollapse(path) {
            this.collapsedPaths[path] = !this.collapsedPaths[path];
        },
        collectExpandablePaths(node, path, depth = 0, entries = []) {
            const children = (node.children || []).map((child) => {
                if (child.expanded) {
                    return {
                        ...child.expanded,
                        label: child.expanded.label ?? child.label,
                        isRaw: child.isRaw,
                    };
                }
                return child;
            });

            if (children.length > 0) {
                entries.push({ path, depth });
                children.forEach((child) => {
                    this.collectExpandablePaths(child, `${path}/${child.id}`, depth + 1, entries);
                });
            }
            return entries;
        },
        collapseAll() {
            const next = {};
            this.trees.forEach((tree) => {
                this.collectExpandablePaths(tree, tree.id).forEach(({ path }) => {
                    next[path] = true;
                });
            });
            this.setCollapsedPaths(next);
        },
        expandToLevel(level) {
            const next = {};
            this.trees.forEach((tree) => {
                this.collectExpandablePaths(tree, tree.id).forEach(({ path, depth }) => {
                    if (depth >= level) {
                        next[path] = true;
                    }
                });
            });
            this.setCollapsedPaths(next);
        },
        expandAll() {
            this.setCollapsedPaths({});
        },
    },
};
</script>

<style scoped lang="scss">
.crafting-tree-header {
    margin-bottom: 0.25rem;
}

.components-section--label {
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.5;
}

.empty-subcategory-label {
    font-size: 0.85rem;
    opacity: 0.6;
    margin-left: 1rem;
}
</style>
