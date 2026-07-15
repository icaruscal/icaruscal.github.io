<template>
    <span class="modifier-tooltip-trigger">
        <n-tooltip
            v-if="hasContent"
            trigger="hover"
            :delay="300"
            :duration="0"
            :keep-alive-on-hover="false"
            placement="top-start"
        >
            <template #trigger>
                <span class="modifier-tooltip-inner">
                    <slot />
                </span>
            </template>
            <div class="modifier-tooltip">
                <div v-if="instantStats.length" class="mod-section">
                    <div class="mod-section-title">On consume</div>
                    <ul class="mod-stat-list">
                        <li v-for="stat in instantStats" :key="`i-${stat.key}`" :class="statClass(stat.value)">
                            {{ stat.display || `${stat.key}: ${stat.value}` }}
                        </li>
                    </ul>
                </div>

                <div v-if="hasBuffSection" class="mod-section" :class="{ 'mt-2': instantStats.length }">
                    <div class="mod-section-title">
                        Buff
                        <span v-if="lifetimeMinutes != null" class="mod-lifetime">{{ lifetimeMinutes }}m</span>
                    </div>
                    <div v-if="modifierDescription" class="mod-desc" :class="{ 'mb-1': grantedStats.length }">
                        {{ modifierDescription }}
                    </div>
                    <ul v-if="grantedStats.length" class="mod-stat-list">
                        <li v-for="stat in grantedStats" :key="`g-${stat.key}`" :class="statClass(stat.value)">
                            {{ stat.display || `${stat.key}: ${stat.value}` }}
                        </li>
                    </ul>
                </div>

                <div
                    v-if="equipGrantedStats.length"
                    class="mod-section"
                    :class="{ 'mt-2': instantStats.length || hasBuffSection }"
                >
                    <div class="mod-section-title">Equipped</div>
                    <ul class="mod-stat-list">
                        <li v-for="stat in equipGrantedStats" :key="`e-${stat.key}`" :class="statClass(stat.value)">
                            {{ stat.display || `${stat.key}: ${stat.value}` }}
                        </li>
                    </ul>
                </div>
            </div>
        </n-tooltip>
        <slot v-else />
    </span>
</template>

<script>
import { formatModifierLifetimeMinutes, recipeHasModifierTooltip } from '@/utility/icarusData';

export default {
    name: 'ItemModifierTooltip',
    props: {
        recipe: {
            type: Object,
            default: null,
        },
    },
    computed: {
        hasContent() {
            return recipeHasModifierTooltip(this.recipe);
        },
        instantStats() {
            return this.recipe?.instantStats ?? [];
        },
        equipGrantedStats() {
            return this.recipe?.equipGrantedStats ?? [];
        },
        grantedStats() {
            return this.recipe?.modifier?.grantedStats ?? [];
        },
        modifierDescription() {
            return this.recipe?.modifier?.description ?? null;
        },
        lifetimeMinutes() {
            return formatModifierLifetimeMinutes(this.recipe?.modifier?.lifetimeSeconds);
        },
        hasBuffSection() {
            return Boolean(this.modifierDescription) || this.grantedStats.length > 0 || this.lifetimeMinutes != null;
        },
    },
    methods: {
        statClass(value) {
            if (typeof value !== 'number') return '';
            if (value < 0) return 'is-neg';
            if (value > 0) return 'is-pos';
            return '';
        },
    },
};
</script>

<style scoped lang="scss">
.modifier-tooltip-trigger {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-width: 0;
}

.modifier-tooltip-inner {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-width: 0;
}

.modifier-tooltip {
    max-width: 18rem;
    line-height: 1.4;
}

.mod-section-title {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 0.25rem;
}

.mod-lifetime {
    margin-left: 0.35rem;
    text-transform: none;
    letter-spacing: 0;
    color: rgba(255, 255, 255, 0.75);
}

.mod-desc {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
}

.mod-stat-list {
    margin: 0;
    padding-left: 1rem;
    font-size: 0.8rem;

    .is-pos {
        color: #a8e6a3;
    }

    .is-neg {
        color: #f0a0a0;
    }
}
</style>
