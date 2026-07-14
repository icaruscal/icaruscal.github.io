<template>
    <div class="crafting-tree-node" :style="levelStyle">
        <crafting-tree-line
            :node="node"
            :path="path"
            :progress="progress"
            :depth="depth"
            :has-children="hasChildren"
            :is-collapsed="isCollapsed"
            :color-enabled="colorEnabled"
            @toggle-collapse="$emit('toggle-collapse', path)"
        />
        <div v-if="hasChildren && !isCollapsed" class="tree-children">
            <crafting-tree-node
                v-for="child in childNodes"
                :key="childPath(child)"
                :node="child"
                :path="childPath(child)"
                :progress="progress"
                :depth="depth + 1"
                :collapsed-paths="collapsedPaths"
                :color-enabled="colorEnabled"
                @toggle-collapse="$emit('toggle-collapse', $event)"
            />
        </div>
    </div>
</template>

<script>
import CraftingTreeLine from './CraftingTreeLine.vue';
import { TREE_LEVEL_COLORS, TREE_MUTED_COLOR } from './treeLevelColors';

export default {
    name: 'CraftingTreeNode',
    components: {
        CraftingTreeLine,
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
        collapsedPaths: {
            type: Object,
            default: () => ({}),
        },
        colorEnabled: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['toggle-collapse'],
    computed: {
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
        childNodes() {
            return (this.node.children || []).map((child) => {
                if (child.expanded) {
                    return {
                        ...child.expanded,
                        label: child.expanded.label ?? child.label,
                        isRaw: child.isRaw,
                    };
                }
                return child;
            });
        },
        hasChildren() {
            return this.childNodes.length > 0;
        },
        isCollapsed() {
            return Boolean(this.collapsedPaths[this.path]);
        },
    },
    methods: {
        childPath(child) {
            return `${this.path}/${child.id}`;
        },
    },
};
</script>

<style scoped lang="scss">
.crafting-tree-node {
    .tree-children {
        margin-left: 1.25rem;
        padding-left: 0.75rem;
        border-left: 2px solid color-mix(in srgb, var(--tree-level-color) 22%, transparent);
    }
}
</style>
