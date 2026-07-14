<template>
    <div class="crafting-tree-node">
        <crafting-tree-line :node="node" :path="path" :progress="progress" />
        <div v-if="childNodes.length > 0" class="tree-children">
            <crafting-tree-node
                v-for="child in childNodes"
                :key="childPath(child)"
                :node="child"
                :path="childPath(child)"
                :progress="progress"
            />
        </div>
    </div>
</template>

<script>
import CraftingTreeLine from './CraftingTreeLine.vue';

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
    },
    computed: {
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
        border-left: 1px solid rgba(255, 255, 255, 0.12);
    }
}
</style>
