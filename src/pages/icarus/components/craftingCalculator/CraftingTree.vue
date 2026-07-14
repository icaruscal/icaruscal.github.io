<template>
    <div class="crafting-tree">
        <div class="crafting-tree-header flex align-items-center">
            <div class="components-section--label">Crafting Tree</div>
            <div class="header-actions flex align-items-center ml-auto">
                <n-tooltip trigger="hover">
                    <template #trigger>
                        <n-button size="tiny" secondary quaternary circle :disabled="trees.length === 0" @click="collapseAll">
                            <n-icon size="14">
                                <Compress />
                            </n-icon>
                        </n-button>
                    </template>
                    Collapse all
                </n-tooltip>
                <n-tooltip trigger="hover">
                    <template #trigger>
                        <n-button class="ml-1" size="tiny" secondary quaternary circle :disabled="trees.length === 0" @click="expandAll">
                            <n-icon size="14">
                                <Expand />
                            </n-icon>
                        </n-button>
                    </template>
                    Expand all
                </n-tooltip>
                <n-tooltip trigger="hover">
                    <template #trigger>
                        <n-button
                            class="ml-1"
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
                    {{ colorEnabled ? 'Disable level colors' : 'Enable level colors' }}
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
import { Compress, Expand, Palette } from '@vicons/fa';
import { useIcarusStore } from '@/store/icarus';
import CraftingTreeNode from './CraftingTreeNode.vue';

export default {
    name: 'CraftingTree',
    components: {
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
        collectExpandablePaths(node, path, paths = []) {
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
                paths.push(path);
                children.forEach((child) => {
                    this.collectExpandablePaths(child, `${path}/${child.id}`, paths);
                });
            }
            return paths;
        },
        collapseAll() {
            const next = {};
            this.trees.forEach((tree) => {
                this.collectExpandablePaths(tree, tree.id).forEach((path) => {
                    next[path] = true;
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
