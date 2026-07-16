<template>
    <n-modal
        :show="show"
        preset="card"
        :bordered="false"
        :closable="true"
        :style="modalStyle"
        class="item-detail-modal"
        @update:show="onShowUpdate"
    >
        <template #header>
            <div class="modal-header-row">
                <button
                    v-if="canGoBackItemDetail"
                    type="button"
                    class="modal-back-btn"
                    @click="backItemDetail"
                >
                    ← Back
                </button>
                <span class="modal-header-label">Item details</span>
            </div>
        </template>

        <div v-if="!detail" class="item-detail empty">Item not found.</div>

        <div v-else ref="detailScroll" class="item-detail-scroll">
            <div class="item-detail">
                <header class="hero">
                    <div class="hero-icon-wrap">
                        <n-image
                            class="hero-icon"
                            width="72"
                            :src="`${gameAssetsUrl}/ItemIcons/${detail.iconPath}.png`"
                            :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                            :preview-disabled="true"
                        />
                    </div>
                    <div class="hero-body">
                        <h2 class="hero-title">
                            <favorite-star-button
                                :item-id="detail.id"
                                :label="detail.displayName"
                                size="lg"
                            />
                            {{ detail.displayName }}
                            <item-lock-badge :locks="detail.locks" :item-id="detail.id" size="lg" />
                        </h2>
                        <div class="hero-tags">
                            <span v-if="detail.availability.tier != null" class="chip chip-tier">
                                T{{ detail.availability.tier }}
                            </span>
                            <span
                                v-for="tag in acquisitionTags"
                                :key="tag.key"
                                class="chip"
                                :class="tag.className"
                            >
                                {{ tag.label }}
                            </span>
                            <span v-if="detail.mission" class="chip chip-mission">Mission</span>
                            <span v-if="detail.gatherFirst" class="chip chip-gather">Gather-first</span>
                            <span
                                v-if="detail.foodAudience"
                                class="chip"
                                :class="detail.foodAudience === 'animal' ? 'chip-animal' : 'chip-prospector'"
                            >
                                {{ detail.foodAudience === 'animal' ? 'Animal feed' : 'Prospector food' }}
                            </span>
                        </div>
                        <p v-if="detail.description" class="hero-description">{{ detail.description }}</p>
                        <p v-else class="hero-description muted">No description.</p>
                        <p v-if="detail.flavorText" class="hero-flavor">“{{ detail.flavorText }}”</p>
                    </div>
                    <deployable-runtime-badges
                        v-if="detail.deployableBadges.length"
                        class="hero-runtime"
                        :badges="detail.deployableBadges"
                    />
                </header>

                <div class="split">
                    <section class="panel">
                        <h3 class="panel-title">Availability</h3>
                        <div class="availability">
                            <div class="availability-meta">
                                <span class="chip chip-tier">{{ detail.availability.tierLabel || 'No tier' }}</span>
                                <span class="chip chip-neutral">{{ detail.availability.methodLabel }}</span>
                            </div>
                            <div v-if="detail.availability.unlockRefs.length" class="availability-unlock">
                                <div class="availability-unlock-label">Unlocked by</div>
                                <div class="item-chip-list">
                                    <button
                                        v-for="ref in detail.availability.unlockRefs"
                                        :key="`unlock-${ref.id}`"
                                        type="button"
                                        class="item-chip"
                                        :class="{ 'is-static': !ref.clickable }"
                                        :disabled="!ref.clickable"
                                        @click="openEntity(ref)"
                                    >
                                        <n-image
                                            width="22"
                                            :src="`${gameAssetsUrl}/ItemIcons/${ref.iconPath}.png`"
                                            :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                            :preview-disabled="true"
                                        />
                                        <span class="item-chip-label">{{ ref.label }}</span>
                                        <span v-if="ref.tier != null" class="item-chip-meta">T{{ ref.tier }}</span>
                                    </button>
                                </div>
                            </div>
                            <p v-else-if="detail.availability.summary" class="availability-summary">
                                {{ detail.availability.summary }}
                            </p>
                        </div>
                    </section>

                    <section class="panel">
                        <h3 class="panel-title">Acquisition</h3>
                        <div v-if="detail.acquisitions.length" class="acq-list">
                            <div
                                v-for="(entry, index) in detail.acquisitions"
                                :key="`acq-${index}-${entry.type}`"
                                class="acq-row"
                            >
                                <span class="chip" :class="acquisitionChipClass(entry.type)">
                                    {{ acquisitionLabel(entry) }}
                                </span>
                                <div class="acq-body">
                                    <template v-if="entry.type === 'craft'">
                                        <div class="acq-meta" v-if="entry.outputCount > 1 || entry.tier != null">
                                            <span v-if="entry.outputCount > 1">Produces ×{{ entry.outputCount }}</span>
                                            <span v-if="entry.tier != null">T{{ entry.tier }}</span>
                                        </div>
                                        <div v-if="entry.stations.length" class="item-chip-list">
                                            <button
                                                v-for="station in entry.stations"
                                                :key="`acq-${entry.recipeId}-${station.id}`"
                                                type="button"
                                                class="item-chip"
                                                :class="{ 'is-static': !station.clickable }"
                                                :disabled="!station.clickable"
                                                @click="openEntity(station)"
                                            >
                                                <n-image
                                                    width="22"
                                                    :src="`${gameAssetsUrl}/ItemIcons/${station.iconPath}.png`"
                                                    :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                                    :preview-disabled="true"
                                                />
                                                <span class="item-chip-label">{{ station.label }}</span>
                                            </button>
                                        </div>
                                    </template>
                                    <template v-else-if="entry.type === 'shop'">
                                        <div v-if="entry.stationRef" class="item-chip-list">
                                            <button
                                                type="button"
                                                class="item-chip"
                                                :class="{ 'is-static': !entry.stationRef.clickable }"
                                                :disabled="!entry.stationRef.clickable"
                                                @click="openEntity(entry.stationRef)"
                                            >
                                                <n-image
                                                    width="22"
                                                    :src="`${gameAssetsUrl}/ItemIcons/${entry.stationRef.iconPath}.png`"
                                                    :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                                                    :preview-disabled="true"
                                                />
                                                <span class="item-chip-label">{{ entry.stationRef.label }}</span>
                                            </button>
                                        </div>
                                        <div v-if="entry.costsLabel" class="acq-detail acq-cost">{{ entry.costsLabel }}</div>
                                    </template>
                                    <template v-else-if="entry.type === 'workshop'">
                                        <div v-if="entry.researchLabel" class="acq-detail">
                                            Research <span class="acq-cost">{{ entry.researchLabel }}</span>
                                        </div>
                                        <div v-if="entry.replicationLabel" class="acq-detail">
                                            Replication <span class="acq-cost">{{ entry.replicationLabel }}</span>
                                        </div>
                                        <div v-if="entry.requiredMission" class="acq-detail">
                                            Mission: {{ entry.requiredMission }}
                                        </div>
                                    </template>
                                    <template v-else>
                                        <span class="acq-detail">{{ entry.label }}</span>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <p v-else class="na">Not applicable</p>
                    </section>
                </div>

                <div class="split">
                    <section class="panel">
                        <h3 class="panel-title">Effects</h3>
                        <p v-if="!hasAnyEffects" class="na">Not applicable</p>
                        <div v-else class="effects-stack">
                            <div class="effect-col">
                                <div class="effect-label">On consume</div>
                                <div v-if="detail.effects.instantStats.length" class="pill-row">
                                    <span
                                        v-for="stat in detail.effects.instantStats"
                                        :key="`i-${stat.key}`"
                                        class="stat-pill"
                                        :class="statPillClass(stat)"
                                    >
                                        {{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </span>
                                </div>
                                <p v-else class="na">Not applicable</p>
                            </div>

                            <div class="effect-col">
                                <div class="effect-label">
                                    Buff
                                    <span
                                        v-if="detail.effects.modifier?.lifetimeMinutes != null"
                                        class="effect-meta"
                                    >
                                        {{ detail.effects.modifier.lifetimeMinutes }}m
                                    </span>
                                </div>
                                <template v-if="hasBuffEffect">
                                    <p v-if="detail.effects.modifier.description" class="effect-desc">
                                        {{ detail.effects.modifier.description }}
                                    </p>
                                    <div
                                        v-if="detail.effects.modifier.grantedStats.length"
                                        class="pill-row"
                                    >
                                        <span
                                            v-for="stat in detail.effects.modifier.grantedStats"
                                            :key="`g-${stat.key}`"
                                            class="stat-pill"
                                            :class="statPillClass(stat)"
                                        >
                                            {{ stat.display || `${stat.key}: ${stat.value}` }}
                                        </span>
                                    </div>
                                </template>
                                <p v-else class="na">Not applicable</p>
                            </div>

                            <div class="effect-col">
                                <div class="effect-label">Equipped</div>
                                <div v-if="detail.effects.equipGrantedStats.length" class="pill-row">
                                    <span
                                        v-for="stat in detail.effects.equipGrantedStats"
                                        :key="`e-${stat.key}`"
                                        class="stat-pill"
                                        :class="statPillClass(stat)"
                                    >
                                        {{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </span>
                                </div>
                                <p v-else class="na">Not applicable</p>
                            </div>
                        </div>
                    </section>

                    <section class="panel">
                        <h3 class="panel-title">Recipe</h3>
                        <div v-if="detail.recipes.length" class="recipe-list">
                            <div v-for="recipe in detail.recipes" :key="recipe.id" class="recipe-block">
                                <div class="recipe-heading">
                                    <span class="recipe-name">{{ humanize(recipe.id) }}</span>
                                    <item-lock-badge :locks="recipe.locks" :recipe-id="recipe.id" size="sm" />
                                    <span v-if="recipe.outputCount > 1" class="chip chip-neutral">
                                        ×{{ recipe.outputCount }}
                                    </span>
                                </div>
                                <div v-if="recipe.ingredients.length" class="item-chip-list">
                                    <item-detail-chip
                                        v-for="ing in recipe.ingredients"
                                        :key="`${recipe.id}-${ing.id}`"
                                        :item-id="ing.id"
                                        :label="ing.label"
                                        :icon-path="ing.iconPath"
                                        :count="ing.count"
                                        @select="openRelated"
                                    />
                                </div>
                                <p v-else class="na">No ingredients listed.</p>
                            </div>
                        </div>
                        <p v-else class="na">Not applicable</p>
                    </section>
                </div>

                <section class="panel panel-used-in">
                    <h3 class="panel-title">
                        Used in
                        <span v-if="detail.usedIn.length" class="panel-count">{{ detail.usedIn.length }}</span>
                    </h3>
                    <div v-if="detail.usedIn.length" class="used-in-wrap">
                        <div class="used-in-scroll">
                            <div class="used-in-flow">
                                <item-detail-chip
                                    v-for="row in detail.usedIn"
                                    :key="row.recipeId"
                                    variant="compact"
                                    :item-id="row.staticItemName || row.recipeId"
                                    :recipe-id="row.recipeId"
                                    :label="row.label"
                                    :icon-path="row.iconPath"
                                    :count="row.count"
                                    count-placement="end"
                                    @select="openRelated"
                                />
                            </div>
                        </div>
                    </div>
                    <p v-else class="na">Not applicable</p>
                </section>
            </div>
        </div>
    </n-modal>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'pinia';
import { nextTick } from 'vue';

import { useIcarusStore } from '@/store/icarus';
import { buildItemDetail } from '@/utility/icarusData';
import { GAME_ASSETS_URL } from '@/constants/common';
import DeployableRuntimeBadges from '@/pages/icarus/components/DeployableRuntimeBadges.vue';
import FavoriteStarButton from '@/pages/icarus/components/FavoriteStarButton.vue';
import ItemDetailChip from '@/pages/icarus/components/ItemDetailChip.vue';
import ItemLockBadge from '@/pages/icarus/components/ItemLockBadge.vue';

const ACQ_META = {
    craft: { label: 'Craft', className: 'chip-craft' },
    shop: { label: 'Shop', className: 'chip-shop' },
    workshop: { label: 'Workshop', className: 'chip-workshop' },
    gather: { label: 'Gather', className: 'chip-gather' },
    mission: { label: 'Mission', className: 'chip-mission' },
};

export default {
    name: 'ItemDetailModal',
    components: {
        DeployableRuntimeBadges,
        FavoriteStarButton,
        ItemDetailChip,
        ItemLockBadge,
    },
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
        };
    },
    computed: {
        ...mapState(useIcarusStore, ['itemDetailId', 'dataCatalog']),
        ...mapGetters(useIcarusStore, ['canGoBackItemDetail']),
        show() {
            return Boolean(this.itemDetailId);
        },
        detail() {
            if (!this.itemDetailId || !this.dataCatalog) return null;
            return buildItemDetail(this.dataCatalog, this.itemDetailId);
        },
        hasBuffEffect() {
            const modifier = this.detail?.effects?.modifier;
            if (!modifier) return false;
            return Boolean(modifier.description) || (modifier.grantedStats?.length ?? 0) > 0;
        },
        hasAnyEffects() {
            const effects = this.detail?.effects;
            if (!effects) return false;
            return (
                (effects.instantStats?.length ?? 0) > 0 ||
                this.hasBuffEffect ||
                (effects.equipGrantedStats?.length ?? 0) > 0
            );
        },
        acquisitionTags() {
            const detail = this.detail;
            if (!detail) return [];
            const seen = new Set();
            const tags = [];
            for (const entry of detail.acquisitions) {
                const meta = ACQ_META[entry.type];
                if (!meta || seen.has(entry.type)) continue;
                seen.add(entry.type);
                tags.push({ key: entry.type, label: meta.label, className: meta.className });
            }
            return tags;
        },
        modalStyle() {
            return {
                width: 'min(72vw, 960px)',
            };
        },
    },
    watch: {
        itemDetailId() {
            nextTick(() => {
                const el = this.$refs.detailScroll;
                if (el) el.scrollTop = 0;
            });
        },
    },
    methods: {
        ...mapActions(useIcarusStore, ['openItemDetail', 'closeItemDetail', 'backItemDetail']),
        onShowUpdate(value) {
            if (!value) this.closeItemDetail();
        },
        openRelated(id) {
            if (!id) return;
            this.openItemDetail(id);
        },
        openEntity(ref) {
            if (!ref?.clickable || !ref.detailId) return;
            this.openItemDetail(ref.detailId);
        },
        humanize(value) {
            return String(value || '').replace(/_/g, ' ');
        },
        acquisitionLabel(entry) {
            return ACQ_META[entry.type]?.label || entry.label || entry.type;
        },
        acquisitionChipClass(type) {
            return ACQ_META[type]?.className || 'chip-neutral';
        },
        statPillClass(stat) {
            const key = stat?.key || '';
            if (/FoodRecovery/i.test(key)) return 'food';
            if (/WaterRecovery/i.test(key)) return 'water';
            if (/HealthRecovery|MaximumHealth/i.test(key)) return 'health';
            if (/Stamina/i.test(key)) return 'stamina';
            if (/Oxygen/i.test(key)) return 'oxygen';
            if (typeof stat?.value === 'number') {
                if (stat.value < 0) return 'is-neg';
                if (stat.value > 0) return 'is-pos';
            }
            return '';
        },
    },
};
</script>

<style lang="scss" scoped>
.modal-header-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
}

.modal-back-btn {
    flex-shrink: 0;
    margin: 0;
    padding: 0.2rem 0.45rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.95);
    }
}

.modal-header-label {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
}

.item-detail-scroll {
    max-height: min(78vh, 820px);
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 0.15rem;
}

.item-detail {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    color: rgba(255, 255, 255, 0.88);
    font-size: 0.92rem;
    line-height: 1.45;

    &.empty {
        padding: 1.5rem 0;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
    }
}

.hero {
    display: flex;
    gap: 1.1rem;
    align-items: flex-start;
    flex-shrink: 0;
    padding: 1rem 1.1rem;
    border-radius: 10px;
    background:
        radial-gradient(120% 140% at 0% 0%, rgba(99, 226, 183, 0.1), transparent 45%),
        linear-gradient(160deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-icon-wrap {
    flex-shrink: 0;
    width: 5.25rem;
    height: 5.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-body {
    min-width: 0;
    flex: 1;
}

.hero-runtime {
    flex-shrink: 0;
    margin-left: auto;
    padding-left: 0.75rem;
    align-self: flex-start;
    min-width: min(16rem, 42%);
}

.hero-title {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    margin: 0 0 0.45rem;
    font-size: 1.45rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
}

.hero-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.65rem;
}

.hero-description {
    margin: 0 0 0.45rem;
    color: rgba(255, 255, 255, 0.78);
}

.hero-flavor {
    margin: 0;
    font-style: italic;
    color: rgba(255, 255, 255, 0.48);
    font-size: 0.88rem;
}

.chip {
    display: inline-flex;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.chip-tier {
    color: #d7c28a;
    background: rgba(180, 150, 60, 0.16);
}

.chip-craft {
    color: #a8e6a3;
    background: rgba(99, 180, 90, 0.16);
}

.chip-shop {
    color: #8ec8f0;
    background: rgba(70, 140, 200, 0.16);
}

.chip-workshop {
    color: #c4b0f0;
    background: rgba(130, 100, 200, 0.16);
}

.chip-gather {
    color: #b8d4a0;
    background: rgba(110, 150, 80, 0.16);
}

.chip-mission {
    color: #f0b48a;
    background: rgba(200, 120, 60, 0.16);
}

.chip-prospector {
    color: #a8e6a3;
    background: rgba(99, 180, 90, 0.18);
}

.chip-animal {
    color: #e6d48a;
    background: rgba(180, 150, 60, 0.18);
}

.chip-neutral {
    color: rgba(255, 255, 255, 0.7);
}

.panel {
    padding: 0.9rem 1rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-sizing: border-box;
}

.panel-used-in {
    flex-shrink: 0;
}

.panel-title {
    margin: 0 0 0.65rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    gap: 0.45rem;
}

.panel-count {
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0;
    text-transform: none;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
}

.availability-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.65rem;
}

.availability-unlock-label {
    margin-bottom: 0.35rem;
    font-size: 0.78rem;
    font-weight: 650;
    color: rgba(255, 255, 255, 0.55);
}

.availability-summary {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.88rem;
}

.acq-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.4rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
}

.split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    align-items: stretch;
    flex-shrink: 0;
}

.effects-stack {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.effect-col {
    min-width: 0;
    padding: 0.55rem 0.65rem;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.effect-label {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
    font-size: 0.8rem;
    font-weight: 650;
    color: rgba(255, 255, 255, 0.78);
}

.effect-meta {
    font-size: 0.72rem;
    font-weight: 600;
    color: #8ec8f0;
    background: rgba(70, 140, 200, 0.18);
    padding: 0.05rem 0.35rem;
    border-radius: 999px;
}

.effect-desc {
    margin: 0 0 0.4rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
}

.pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}

.stat-pill {
    font-size: 0.74rem;
    padding: 0.18rem 0.45rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);

    &.food {
        color: #a8e6a3;
        background: rgba(99, 180, 90, 0.15);
    }

    &.water {
        color: #8ec8f0;
        background: rgba(70, 140, 200, 0.15);
    }

    &.health {
        color: #f0a0a0;
        background: rgba(200, 80, 80, 0.15);
    }

    &.stamina {
        color: #e6d48a;
        background: rgba(180, 150, 60, 0.15);
    }

    &.oxygen {
        color: #a0d8f0;
        background: rgba(80, 160, 200, 0.15);
    }

    &.is-neg {
        color: #f0a0a0;
        background: rgba(200, 80, 80, 0.12);
    }

    &.is-pos {
        color: #a8e6a3;
        background: rgba(99, 180, 90, 0.12);
    }
}

.acq-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.acq-row {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
}

.acq-body {
    min-width: 0;
    flex: 1;
    padding-top: 0.05rem;
}

.acq-detail {
    margin-top: 0.15rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.62);
}

.acq-cost {
    color: #e6d48a;
    font-variant-numeric: tabular-nums;
}

.recipe-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.recipe-heading {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
}

.recipe-name {
    font-weight: 650;
    color: rgba(255, 255, 255, 0.9);
}

.used-in-wrap {
    margin-top: 0.15rem;
}

.used-in-scroll {
    max-height: 11rem;
    overflow-x: hidden;
    overflow-y: auto;
}

.used-in-flow {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.35rem 0.45rem;
    padding-right: 0.15rem;
}

.item-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.item-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.55rem 0.28rem 0.35rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.22);
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.15s ease;

    &:hover:not(:disabled):not(.is-static) {
        border-color: rgba(99, 226, 183, 0.45);
        background: rgba(99, 226, 183, 0.08);
        transform: translateY(-1px);
    }

    &.is-static,
    &:disabled {
        cursor: default;
    }
}

.item-chip-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
}

.item-chip-meta {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
}

.na {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.38);
    font-style: italic;
}

.muted {
    color: rgba(255, 255, 255, 0.45);
}

@media (max-width: 820px) {
    .hero {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .hero-tags {
        justify-content: center;
    }

    .split {
        grid-template-columns: 1fr;
    }

    .acq-row {
        flex-direction: column;
        gap: 0.3rem;
    }
}
</style>
