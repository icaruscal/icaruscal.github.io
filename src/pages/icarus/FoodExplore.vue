<template>
    <div class="food-explore p-2 pt-3">
        <div class="explore-header mb-3 mx-2">
            <h1 class="explore-title m-0">Consumable Explorer</h1>
            <p class="explore-subtitle mt-1 mb-0">
                Browse food, drink, and medicines — instant recovery, buffs, and debuffs.
            </p>
        </div>

        <n-spin :show="isLoadingRecipes">
            <div class="explore-layout mx-2">
                <aside class="filters-panel">
                    <n-card size="small" title="Filters" content-style="padding-top: 0.5rem;">
                        <div class="filter-block">
                            <label class="filter-label">Search</label>
                            <n-input v-model:value="filters.search" placeholder="Name, buff, description…" clearable />
                        </div>

                        <div class="filter-block">
                            <label class="filter-label">Type</label>
                            <div class="toggle-grid">
                                <n-checkbox v-model:checked="filters.categories.food">Food &amp; drink</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.medicine">Medicine &amp; other</n-checkbox>
                            </div>
                        </div>

                        <div class="filter-block">
                            <label class="filter-label">Intended for</label>
                            <div class="toggle-grid">
                                <n-checkbox v-model:checked="filters.audiences.prospector">Prospector</n-checkbox>
                                <n-checkbox v-model:checked="filters.audiences.animal">Animal</n-checkbox>
                                <n-checkbox v-model:checked="filters.audiences.other">Other / untagged</n-checkbox>
                            </div>
                        </div>

                        <div class="filter-block">
                            <label class="filter-label">Source</label>
                            <div class="toggle-grid">
                                <n-checkbox v-model:checked="filters.sources.craft">Craft</n-checkbox>
                                <n-checkbox v-model:checked="filters.sources.gather">Gather</n-checkbox>
                                <n-checkbox v-model:checked="filters.sources.mission">Mission</n-checkbox>
                                <n-checkbox v-model:checked="filters.sources.shop">Shop</n-checkbox>
                                <n-checkbox v-model:checked="filters.sources.workshop">Workshop</n-checkbox>
                            </div>
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Tier</label>
                                <span class="filter-range-value">{{ filters.tier[0] }} – {{ filters.tier[1] }}</span>
                            </div>
                            <n-slider v-model:value="filters.tier" range :min="0" :max="5" :step="1" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Food recovery</label>
                                <span class="filter-range-value">{{ filters.food[0] }} – {{ filters.food[1] }}</span>
                            </div>
                            <n-slider v-model:value="filters.food" range :min="foodBounds.min" :max="foodBounds.max" :step="5" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Water recovery</label>
                                <span class="filter-range-value">{{ filters.water[0] }} – {{ filters.water[1] }}</span>
                            </div>
                            <n-slider v-model:value="filters.water" range :min="waterBounds.min" :max="waterBounds.max" :step="5" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Buff duration (min)</label>
                                <span class="filter-range-value">
                                    {{ filters.duration[0] }} – {{ filters.duration[1] === durationBounds.max ? '∞' : filters.duration[1] }}
                                </span>
                            </div>
                            <n-slider
                                v-model:value="filters.duration"
                                range
                                :min="durationBounds.min"
                                :max="durationBounds.max"
                                :step="5"
                                :disabled="!filters.hasBuffOnly"
                            />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Buff effects</label>
                                <n-button-group v-if="filters.buffKeys.length > 1" size="tiny">
                                    <n-button
                                        :type="filters.buffMatchMode === 'and' ? 'primary' : 'default'"
                                        secondary
                                        @click="filters.buffMatchMode = 'and'"
                                    >
                                        And
                                    </n-button>
                                    <n-button
                                        :type="filters.buffMatchMode === 'or' ? 'primary' : 'default'"
                                        secondary
                                        @click="filters.buffMatchMode = 'or'"
                                    >
                                        Or
                                    </n-button>
                                </n-button-group>
                            </div>
                            <n-select
                                v-model:value="filters.buffKeys"
                                multiple
                                filterable
                                clearable
                                placeholder="Any buff…"
                                :options="foodBuffStatOptions"
                                :max-tag-count="2"
                            />
                            <div v-if="filters.buffKeys.length > 1" class="buff-match-hint">
                                {{ filters.buffMatchMode === 'or' ? 'Match any selected buff' : 'Match all selected buffs' }}
                            </div>
                            <div v-if="selectedBuffLimitFilters.length" class="buff-limit-filters">
                                <div v-for="buff in selectedBuffLimitFilters" :key="buff.key" class="buff-limit-block">
                                    <div class="filter-label-row">
                                        <label class="filter-label">{{ buff.label }}</label>
                                        <span class="filter-range-value">{{ formatBuffLimitDisplay(buff) }}</span>
                                    </div>
                                    <n-slider
                                        v-model:value="filters.buffLimits[buff.key]"
                                        range
                                        :min="buff.bounds.min"
                                        :max="buff.bounds.max"
                                        :step="buff.step"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="filter-block toggles">
                            <div class="toggle-row">
                                <span>Favorites only</span>
                                <n-switch v-model:value="filters.favoritesOnly" size="small" />
                            </div>
                            <div class="toggle-row">
                                <span>Has lasting buff</span>
                                <n-switch v-model:value="filters.hasBuffOnly" size="small" />
                            </div>
                            <div class="toggle-row">
                                <span>Has negative stats</span>
                                <n-switch v-model:value="filters.hasNegativeOnly" size="small" />
                            </div>
                        </div>

                        <n-button class="mt-2" block secondary @click="resetFilters">Reset filters</n-button>
                    </n-card>
                </aside>

                <section class="results-panel">
                    <div class="results-toolbar flex align-items-center justify-content-between mb-2 gap-2">
                        <n-text depth="3">{{ filteredFoods.length }} of {{ foodConsumables.length }} consumables</n-text>
                        <div class="toolbar-actions flex align-items-center gap-2">
                            <n-select
                                v-if="viewMode === 'cards'"
                                v-model:value="sortBy"
                                class="sort-select"
                                size="small"
                                :options="sortOptions"
                            />
                            <n-button-group size="small">
                                <n-button :type="viewMode === 'cards' ? 'primary' : 'default'" secondary @click="viewMode = 'cards'">
                                    Cards
                                </n-button>
                                <n-button :type="viewMode === 'table' ? 'primary' : 'default'" secondary @click="viewMode = 'table'">
                                    Table
                                </n-button>
                            </n-button-group>
                        </div>
                    </div>

                    <div v-if="filteredFoods.length === 0" class="empty-state">No foods match these filters.</div>

                    <template v-else>
                        <n-text v-if="hasMoreResults" depth="3" class="page-status mb-2">
                            Showing {{ pagedFoods.length }} of {{ sortedFoods.length }}
                        </n-text>

                        <n-data-table
                            v-if="viewMode === 'table'"
                            class="food-table"
                            size="small"
                            :bordered="false"
                            :single-line="false"
                            :columns="tableColumns"
                            :data="pagedFoods"
                            :row-key="(row) => row.id"
                            :scroll-x="tableScrollX"
                        />

                        <div v-else class="food-grid">
                            <article
                                v-for="food in pagedFoods"
                                :key="food.id"
                                class="food-card"
                                :class="{ 'is-active': isCardActive(food) }"
                                @pointerenter="onCardEnter(food)"
                                @pointerleave="onCardLeave(food)"
                                @focusin="onCardEnter(food)"
                                @focusout="onCardFocusOut($event, food)"
                            >
                                <div
                                    v-if="isCardActive(food)"
                                    class="food-card-actions flex align-items-center"
                                >
                                    <favorite-star-button
                                        :item-id="food.staticItemName || food.id"
                                        :label="food.label"
                                        size="sm"
                                    />
                                    <item-lock-badge
                                        v-if="cardHasLocks(food)"
                                        :locks="food.locks"
                                        :item-id="food.staticItemName || food.id"
                                        :recipe-id="food.id"
                                        size="sm"
                                    />
                                    <item-detail-button
                                        :item-id="food.staticItemName || food.id"
                                        :label="food.label"
                                    />
                                    <n-dropdown
                                        v-if="craftRecipeId(food)"
                                        trigger="click"
                                        placement="bottom-start"
                                        :options="addToCalculatorOptions"
                                        @select="(key) => onAddToCalculator(key, food)"
                                        @update:show="(show) => onAddMenuShow(show, food)"
                                    >
                                        <n-button
                                            class="add-calc-btn"
                                            size="tiny"
                                            quaternary
                                            circle
                                            type="primary"
                                            @click.stop
                                        >
                                            <n-icon size="12">
                                                <Plus />
                                            </n-icon>
                                        </n-button>
                                    </n-dropdown>
                                </div>
                                <div
                                    v-else-if="cardHintFavorite(food) || cardHasLocks(food)"
                                    class="food-card-hints flex align-items-center"
                                    aria-hidden="true"
                                >
                                    <span v-if="cardHintFavorite(food)" class="hint-fav">★</span>
                                    <span v-if="cardHasLocks(food)" class="hint-lock">!</span>
                                </div>

                                <div class="food-card-top flex">
                                    <img
                                        class="food-icon"
                                        width="48"
                                        height="48"
                                        loading="lazy"
                                        decoding="async"
                                        alt=""
                                        :src="`${gameAssetsUrl}/ItemIcons/${food.iconPath}.png`"
                                        @error="onIconError"
                                    />
                                    <div class="food-meta flex-1">
                                        <div
                                            class="food-name"
                                            :class="{ 'food-name--hoverable': foodTooltip(food) }"
                                            :title="foodTooltip(food) || undefined"
                                        >
                                            {{ food.label }}
                                        </div>
                                        <div class="food-tags flex flex-wrap">
                                            <span class="chip" :class="`chip--${categoryTagType(food.category)}`">
                                                {{ categoryLabel(food.category) }}
                                            </span>
                                            <span
                                                v-if="food.foodAudience"
                                                class="chip"
                                                :class="`chip--${foodAudienceTagType(food.foodAudience)}`"
                                            >
                                                {{ foodAudienceLabel(food.foodAudience) }}
                                            </span>
                                            <span class="chip" :class="`chip--${acquisitionTagType(food.acquisition)}`">
                                                {{ acquisitionLabel(food.acquisition) }}
                                            </span>
                                            <span
                                                v-if="food.mission && food.acquisition !== 'mission'"
                                                class="chip chip--primary"
                                            >
                                                Mission
                                            </span>
                                            <span v-if="food.tier != null" class="chip">T{{ food.tier }}</span>
                                            <span v-if="food.lifetimeMinutes != null" class="chip chip--info">
                                                {{ food.lifetimeMinutes }}m buff
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="stat-row recovery">
                                    <span v-if="food.foodRecovery" class="stat-pill food">+{{ food.foodRecovery }} Food</span>
                                    <span v-if="food.waterRecovery" class="stat-pill water">+{{ food.waterRecovery }} Water</span>
                                    <span v-if="food.healthRecovery" class="stat-pill health">+{{ food.healthRecovery }} Health</span>
                                    <span v-if="food.staminaRecovery" class="stat-pill stamina">+{{ food.staminaRecovery }} Stamina</span>
                                    <span v-if="food.oxygenRecovery" class="stat-pill oxygen">+{{ food.oxygenRecovery }} Oxygen</span>
                                    <span
                                        v-for="stat in otherInstantStats(food)"
                                        :key="`i-${stat.key}`"
                                        class="stat-pill"
                                        :class="statClass(stat)"
                                    >
                                        {{ stat.display || `${stat.key} ${stat.value}` }}
                                    </span>
                                </div>

                                <div v-if="food.modifierDescription && !food.grantedStats.length" class="buff-desc">
                                    {{ food.modifierDescription }}
                                </div>

                                <ul v-if="food.grantedStats.length" class="buff-list">
                                    <li
                                        v-for="stat in food.grantedStats"
                                        :key="stat.key"
                                        :class="['buff-stat', statClass(stat)]"
                                    >
                                        {{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </li>
                                </ul>

                                <div v-if="food.stationLabels.length" class="stations">
                                    {{ food.stationLabels.join(' · ') }}
                                </div>
                            </article>
                        </div>

                        <div
                            v-if="hasMoreResults"
                            ref="loadMoreSentinel"
                            class="load-more-sentinel"
                            aria-hidden="true"
                        />
                    </template>
                </section>
            </div>
        </n-spin>
    </div>
</template>

<script>
import { h } from 'vue';
import { NButton, NDropdown, NIcon, NImage, NTag, NTooltip } from 'naive-ui';
import { Plus } from '@vicons/fa';
import { mapState, mapGetters, mapActions } from 'pinia';
import { useIcarusStore } from '@/store/icarus';
import { GAME_ASSETS_URL } from '@/constants/common';
import FavoriteStarButton from '@/pages/icarus/components/FavoriteStarButton.vue';
import ItemDetailButton from '@/pages/icarus/components/ItemDetailButton.vue';
import ItemLockBadge from '@/pages/icarus/components/ItemLockBadge.vue';
import { hasItemLocks } from '@/utility/icarusData';
import { getStatEffectClass } from '@/utility/icarusStatPolarity';
import {
    createDefaultExploreFilters,
    exploreQueriesEqual,
    exploreStateToQuery,
    queryToExploreState,
} from '@/utility/exploreQuery';

const DEFAULT_FILTERS = createDefaultExploreFilters;
const RESULTS_PAGE_SIZE = 48;

const compareNullableNumber = (a, b, direction = 1) => {
    const left = a == null ? Number.NEGATIVE_INFINITY : a;
    const right = b == null ? Number.NEGATIVE_INFINITY : b;
    if (left === right) return 0;
    return left < right ? -direction : direction;
};

/** Stomach slot cost is on almost every buff food — skip as its own column / filter limit. */
const SKIP_BUFF_COLUMN_KEYS = new Set(['BaseFoodStomachSlots_+']);

const shortStatLabel = (display, key) => {
    const base = (display || key || '').replace(/^[+-]?\d+%?\s*/, '').trim();
    return base || key;
};

const formatStatCellValue = (key, value) => {
    if (value == null || Number.isNaN(value)) return null;
    if (key.endsWith('_?')) return value ? '✓' : null;
    const isPct = key.includes('%');
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${isPct ? '%' : ''}`;
};

const getGrantedStat = (food, key) => (food.grantedStats || []).find((stat) => stat.key === key) ?? null;

const getBuffValueBounds = (foods, key) => {
    const values = [];
    for (const food of foods) {
        const stat = getGrantedStat(food, key);
        if (stat && typeof stat.value === 'number') {
            values.push(stat.value);
        }
    }
    if (values.length === 0) {
        return { min: 0, max: 1 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max: min === max ? min + 1 : max };
};

export default {
    name: 'FoodExplore',
    components: {
        Plus,
        FavoriteStarButton,
        ItemDetailButton,
        ItemLockBadge,
    },
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
            filters: DEFAULT_FILTERS(),
            viewMode: 'cards',
            sortBy: 'name',
            sortOptions: [
                { label: 'Name', value: 'name' },
                { label: 'Food (high → low)', value: 'foodDesc' },
                { label: 'Water (high → low)', value: 'waterDesc' },
                { label: 'Buff duration', value: 'durationDesc' },
                { label: 'Tier', value: 'tierAsc' },
            ],
            boundsReady: false,
            /** Range keys present in the landing URL (skip overwriting when bounds load). */
            rangeKeysFromQuery: new Set(),
            suppressQuerySync: false,
            querySyncTimer: null,
            resultsShown: RESULTS_PAGE_SIZE,
            hoveredCardId: null,
            cardMenuOpenId: null,
            cardLeaveTimer: null,
            loadMoreObserver: null,
        };
    },
    computed: {
        ...mapState(useIcarusStore, ['foodConsumables', 'isLoadingRecipes', 'recipeData', 'favorites']),
        ...mapGetters(useIcarusStore, ['foodBuffStatOptions', 'planningTabs']),
        addToCalculatorOptions() {
            const tabChildren = this.planningTabs.map((tab) => ({
                label: tab.title || 'Planning',
                key: `tab:${tab.id}`,
            }));
            const options = [];
            if (tabChildren.length > 0) {
                options.push({
                    type: 'group',
                    label: 'Add to existing tab',
                    key: 'existing-group',
                    children: tabChildren,
                });
                options.push({ type: 'divider', key: 'd1' });
            }
            options.push({
                label: 'Add to new tab',
                key: 'new-tab',
            });
            return options;
        },
        foodBounds() {
            const values = this.foodConsumables.map((f) => f.foodRecovery);
            return { min: 0, max: Math.max(50, ...values, 0) };
        },
        waterBounds() {
            const values = this.foodConsumables.map((f) => f.waterRecovery);
            return { min: 0, max: Math.max(50, ...values, 0) };
        },
        durationBounds() {
            const values = this.foodConsumables.map((f) => f.lifetimeMinutes).filter((v) => v != null);
            return { min: 0, max: Math.max(30, ...values, 0) };
        },
        filteredFoods() {
            const search = this.filters.search.trim().toLowerCase();
            const selectedSources = Object.entries(this.filters.sources)
                .filter(([, on]) => on)
                .map(([key]) => key);
            const [tierMin, tierMax] = this.filters.tier;
            const [foodMin, foodMax] = this.filters.food;
            const [waterMin, waterMax] = this.filters.water;
            const [durMin, durMax] = this.filters.duration;
            const buffKeys = this.filters.buffKeys ?? [];

            return this.foodConsumables.filter((food) => {
                const category = food.category === 'medicine' ? 'medicine' : 'food';
                if (!this.filters.categories[category]) return false;

                const audienceKey =
                    food.foodAudience === 'animal' || food.foodAudience === 'prospector'
                        ? food.foodAudience
                        : 'other';
                if (!this.filters.audiences[audienceKey]) return false;

                if (!selectedSources.includes(food.acquisition)) return false;

                const tier = food.tier ?? 0;
                if (tier < tierMin || tier > tierMax) return false;
                if (food.foodRecovery < foodMin || food.foodRecovery > foodMax) return false;
                if (food.waterRecovery < waterMin || food.waterRecovery > waterMax) return false;

                if (this.filters.favoritesOnly) {
                    void this.favorites;
                    const favoriteId = food.staticItemName || food.id;
                    if (!this.isFavorite(favoriteId)) return false;
                }

                if (this.filters.hasBuffOnly && !food.hasBuff) return false;
                if (this.filters.hasNegativeOnly && !food.hasNegativeStat) return false;

                if (this.filters.hasBuffOnly && food.lifetimeMinutes != null) {
                    const cappedMax = durMax >= this.durationBounds.max;
                    if (food.lifetimeMinutes < durMin || (!cappedMax && food.lifetimeMinutes > durMax)) {
                        return false;
                    }
                }

                if (buffKeys.length > 0) {
                    const matchesBuff = (key) => {
                        const stat = getGrantedStat(food, key);
                        if (!stat) return false;
                        const bounds = getBuffValueBounds(this.foodConsumables, key);
                        const range = this.filters.buffLimits[key] ?? [bounds.min, bounds.max];
                        const value = stat.value ?? 0;
                        return value >= range[0] && value <= range[1];
                    };
                    const matchMode = this.filters.buffMatchMode === 'or' ? 'or' : 'and';
                    const ok = matchMode === 'or' ? buffKeys.some(matchesBuff) : buffKeys.every(matchesBuff);
                    if (!ok) return false;
                }

                if (search) {
                    const haystack = [
                        food.label,
                        food.description,
                        food.modifierName,
                        food.modifierDescription,
                        ...food.allStats.map((s) => s.display),
                        ...food.stationLabels,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(search)) return false;
                }

                return true;
            });
        },
        sortedFoods() {
            const list = [...this.filteredFoods];
            switch (this.sortBy) {
                case 'foodDesc':
                    list.sort((a, b) => b.foodRecovery - a.foodRecovery || a.label.localeCompare(b.label));
                    break;
                case 'waterDesc':
                    list.sort((a, b) => b.waterRecovery - a.waterRecovery || a.label.localeCompare(b.label));
                    break;
                case 'durationDesc':
                    list.sort((a, b) => (b.lifetimeMinutes ?? -1) - (a.lifetimeMinutes ?? -1) || a.label.localeCompare(b.label));
                    break;
                case 'tierAsc':
                    list.sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.label.localeCompare(b.label));
                    break;
                default:
                    list.sort((a, b) => a.label.localeCompare(b.label));
            }
            return list;
        },
        pagedFoods() {
            return this.sortedFoods.slice(0, this.resultsShown);
        },
        hasMoreResults() {
            return this.sortedFoods.length > this.resultsShown;
        },
        selectedBuffLimitFilters() {
            const labelByKey = new Map(this.foodBuffStatOptions.map((opt) => [opt.value, opt.label]));
            return (this.filters.buffKeys ?? [])
                .filter((key) => !SKIP_BUFF_COLUMN_KEYS.has(key))
                .map((key) => {
                    const bounds = getBuffValueBounds(this.foodConsumables, key);
                    const span = bounds.max - bounds.min;
                    return {
                        key,
                        label: labelByKey.get(key) || shortStatLabel(null, key),
                        bounds,
                        step: span > 50 ? 5 : 1,
                    };
                });
        },
        /** Per-effect value columns only for selected Buff effects. */
        selectedBuffColumns() {
            const labelByKey = new Map(this.foodBuffStatOptions.map((opt) => [opt.value, opt.label]));
            return (this.filters.buffKeys ?? [])
                .filter((key) => !SKIP_BUFF_COLUMN_KEYS.has(key))
                .map((key) => ({
                    key,
                    label: labelByKey.get(key) || shortStatLabel(null, key),
                }));
        },
        tableScrollX() {
            const fixed = 52 + 200 + 120 + 70 + 80 + 80 + 90 + 260 + 140;
            return fixed + this.selectedBuffColumns.length * 108;
        },
        tableColumns() {
            const gameAssetsUrl = this.gameAssetsUrl;
            const baseColumns = [
                {
                    title: '',
                    key: 'icon',
                    width: 52,
                    fixed: 'left',
                    render: (row) =>
                        h(NImage, {
                            width: 32,
                            src: `${gameAssetsUrl}/ItemIcons/${row.iconPath}.png`,
                            fallbackSrc: `${gameAssetsUrl}/Images/question-mark.png`,
                            previewDisabled: true,
                        }),
                },
                {
                    title: 'Name',
                    key: 'label',
                    sorter: 'default',
                    width: 240,
                    ellipsis: { tooltip: false },
                    fixed: 'left',
                    render: (row) => {
                        const tip = this.foodTooltip(row);
                        const recipeId = this.craftRecipeId(row);
                        const nameNode = h('span', { class: tip ? 'food-name food-name--hoverable' : 'food-name' }, row.label);
                        const labeled = tip
                            ? h(
                                  NTooltip,
                                  { trigger: 'hover', placement: 'top-start' },
                                  {
                                      trigger: () => nameNode,
                                      default: () =>
                                          h('div', { class: 'name-tooltip' }, [
                                              row.description ? h('div', null, row.description) : null,
                                              row.modifierDescription
                                                  ? h('div', { class: row.description ? 'mt-1' : undefined }, row.modifierDescription)
                                                  : null,
                                          ]),
                                  }
                              )
                            : nameNode;

                        const children = [
                            h(FavoriteStarButton, {
                                itemId: row.staticItemName || row.id,
                                label: row.label,
                                size: 'sm',
                            }),
                            labeled,
                            h(ItemLockBadge, {
                                locks: row.locks,
                                itemId: row.staticItemName || row.id,
                                recipeId: row.id,
                                size: 'sm',
                            }),
                            h(ItemDetailButton, {
                                itemId: row.staticItemName || row.id,
                                label: row.label,
                            }),
                        ];
                        if (recipeId) {
                            children.push(
                                h(
                                    NDropdown,
                                    {
                                        trigger: 'click',
                                        placement: 'bottom-start',
                                        options: this.addToCalculatorOptions,
                                        onSelect: (key) => this.onAddToCalculator(key, row),
                                    },
                                    {
                                        default: () =>
                                            h(
                                                NButton,
                                                {
                                                    class: 'add-calc-btn',
                                                    size: 'tiny',
                                                    quaternary: true,
                                                    circle: true,
                                                    type: 'primary',
                                                    onClick: (e) => e.stopPropagation(),
                                                },
                                                {
                                                    default: () => h(NIcon, { size: 12 }, { default: () => h(Plus) }),
                                                }
                                            ),
                                    }
                                )
                            );
                        }

                        return h('div', { class: 'food-name-row' }, children);
                    },
                },
                {
                    title: 'Source',
                    key: 'acquisition',
                    sorter: 'default',
                    width: 160,
                    render: (row) =>
                        h('div', { class: 'table-source-tags' }, [
                            h(
                                NTag,
                                { size: 'small', bordered: false, type: this.categoryTagType(row.category) },
                                { default: () => this.categoryLabel(row.category) }
                            ),
                            row.foodAudience
                                ? h(
                                      NTag,
                                      {
                                          size: 'small',
                                          bordered: false,
                                          type: this.foodAudienceTagType(row.foodAudience),
                                      },
                                      { default: () => this.foodAudienceLabel(row.foodAudience) }
                                  )
                                : null,
                            h(
                                NTag,
                                { size: 'small', bordered: false, type: this.acquisitionTagType(row.acquisition) },
                                { default: () => this.acquisitionLabel(row.acquisition) }
                            ),
                            row.mission && row.acquisition !== 'mission'
                                ? h(NTag, { size: 'small', bordered: false, type: 'primary' }, { default: () => 'Mission' })
                                : null,
                        ]),
                },
                {
                    title: 'Tier',
                    key: 'tier',
                    sorter: (a, b) => compareNullableNumber(a.tier, b.tier),
                    width: 70,
                    render: (row) => (row.tier != null ? `T${row.tier}` : '—'),
                },
                {
                    title: 'Food',
                    key: 'foodRecovery',
                    sorter: (a, b) => a.foodRecovery - b.foodRecovery,
                    width: 80,
                    render: (row) => (row.foodRecovery ? `+${row.foodRecovery}` : '—'),
                },
                {
                    title: 'Water',
                    key: 'waterRecovery',
                    sorter: (a, b) => a.waterRecovery - b.waterRecovery,
                    width: 80,
                    render: (row) => (row.waterRecovery ? `+${row.waterRecovery}` : '—'),
                },
                {
                    title: 'Duration',
                    key: 'lifetimeMinutes',
                    sorter: (a, b) => compareNullableNumber(a.lifetimeMinutes, b.lifetimeMinutes),
                    width: 90,
                    render: (row) => (row.lifetimeMinutes != null ? `${row.lifetimeMinutes}m` : '—'),
                },
                {
                    title: 'Buffs / Debuffs',
                    key: 'grantedStatsText',
                    width: 260,
                    ellipsis: { tooltip: true },
                    sorter: (a, b) => a.grantedStats.length - b.grantedStats.length,
                    render: (row) => {
                        const stats = (row.grantedStats || []).filter((stat) => !SKIP_BUFF_COLUMN_KEYS.has(stat.key));
                        if (!stats.length) {
                            if (row.modifierDescription) {
                                return h('span', { class: 'table-buff-text' }, row.modifierDescription);
                            }
                            return h('span', { class: 'table-muted' }, '—');
                        }
                        return h(
                            'div',
                            { class: 'table-buff-text' },
                            stats.map((stat, index) =>
                                h('span', { class: this.statClass(stat) }, [
                                    index > 0 ? h('span', { class: 'table-buff-sep' }, ' · ') : null,
                                    stat.display || formatStatCellValue(stat.key, stat.value) || stat.key,
                                ])
                            )
                        );
                    },
                },
            ];

            const buffColumns = this.selectedBuffColumns.map(({ key, label }) => ({
                title: () =>
                    h(
                        NTooltip,
                        { trigger: 'hover', placement: 'top' },
                        {
                            trigger: () => h('span', { class: 'buff-col-title' }, label),
                            default: () => label,
                        }
                    ),
                key: `buff:${key}`,
                width: 108,
                ellipsis: { tooltip: true },
                sorter: (a, b) => {
                    const left = getGrantedStat(a, key)?.value ?? null;
                    const right = getGrantedStat(b, key)?.value ?? null;
                    return compareNullableNumber(left, right);
                },
                render: (row) => {
                    const stat = getGrantedStat(row, key);
                    if (!stat) {
                        return h('span', { class: 'table-muted' }, '—');
                    }
                    const text = formatStatCellValue(stat.key, stat.value) ?? '—';
                    return h(
                        NTooltip,
                        { trigger: 'hover', placement: 'top' },
                        {
                            trigger: () => h('span', { class: ['buff-cell', this.statClass(stat)] }, text),
                            default: () => stat.display || text,
                        }
                    );
                },
            }));

            const stationColumn = {
                title: 'Stations',
                key: 'stationLabels',
                width: 140,
                ellipsis: { tooltip: true },
                sorter: (a, b) => (a.stationLabels[0] || '').localeCompare(b.stationLabels[0] || ''),
                render: (row) =>
                    row.stationLabels.length
                        ? h('span', { class: 'table-stations' }, row.stationLabels.join(', '))
                        : h('span', { class: 'table-muted' }, '—'),
            };

            return [...baseColumns, ...buffColumns, stationColumn];
        },
    },
    watch: {
        foodConsumables: {
            immediate: true,
            handler(list) {
                if (!list.length || this.boundsReady) return;
                if (!this.rangeKeysFromQuery.has('food')) {
                    this.filters.food = [this.foodBounds.min, this.foodBounds.max];
                }
                if (!this.rangeKeysFromQuery.has('water')) {
                    this.filters.water = [this.waterBounds.min, this.waterBounds.max];
                }
                if (!this.rangeKeysFromQuery.has('duration')) {
                    this.filters.duration = [this.durationBounds.min, this.durationBounds.max];
                }
                this.boundsReady = true;
                if (this.filters.buffKeys?.length) {
                    this.syncBuffLimits(this.filters.buffKeys);
                }
                this.$nextTick(() => {
                    this.syncFiltersToRoute();
                });
            },
        },
        'filters.buffKeys': {
            handler(keys) {
                this.syncBuffLimits(keys ?? []);
            },
        },
        filters: {
            deep: true,
            handler() {
                this.resetResultsPagination();
                this.scheduleQuerySync(true);
            },
        },
        sortBy() {
            this.resetResultsPagination();
            this.scheduleQuerySync(false);
        },
        viewMode() {
            this.scheduleQuerySync(false);
            this.$nextTick(() => this.setupInfiniteScroll());
        },
        hasMoreResults(hasMore) {
            if (hasMore) {
                this.$nextTick(() => this.setupInfiniteScroll());
            } else {
                this.teardownInfiniteScroll();
            }
        },
    },
    mounted() {
        this.$nextTick(() => this.setupInfiniteScroll());
    },
    created() {
        this.hydrateFromRouteQuery();
    },
    beforeUnmount() {
        if (this.querySyncTimer) {
            clearTimeout(this.querySyncTimer);
            this.querySyncTimer = null;
        }
        if (this.cardLeaveTimer) {
            clearTimeout(this.cardLeaveTimer);
            this.cardLeaveTimer = null;
        }
        this.teardownInfiniteScroll();
    },
    methods: {
        ...mapActions(useIcarusStore, ['addItemToTab', 'openItemInNewTab', 'isFavorite']),
        resetResultsPagination() {
            this.resultsShown = RESULTS_PAGE_SIZE;
            this.hoveredCardId = null;
            this.cardMenuOpenId = null;
        },
        showMoreResults() {
            if (!this.hasMoreResults) return;
            const before = this.resultsShown;
            this.resultsShown = Math.min(this.resultsShown + RESULTS_PAGE_SIZE, this.sortedFoods.length);
            if (this.resultsShown === before) return;
            // Keep filling until the sentinel leaves the viewport (short first pages).
            this.$nextTick(() => this.loadMoreIfSentinelVisible());
        },
        loadMoreIfSentinelVisible() {
            if (!this.hasMoreResults) return;
            const sentinel = this.$refs.loadMoreSentinel;
            if (!sentinel) return;
            const bottomSlack = 320;
            if (sentinel.getBoundingClientRect().top <= window.innerHeight + bottomSlack) {
                this.showMoreResults();
            }
        },
        setupInfiniteScroll() {
            this.teardownInfiniteScroll();
            if (typeof IntersectionObserver === 'undefined') return;
            const sentinel = this.$refs.loadMoreSentinel;
            if (!sentinel) return;

            this.loadMoreObserver = new IntersectionObserver(
                (entries) => {
                    if (!entries.some((entry) => entry.isIntersecting)) return;
                    this.showMoreResults();
                },
                {
                    root: null,
                    rootMargin: '320px 0px',
                    threshold: 0,
                }
            );
            this.loadMoreObserver.observe(sentinel);
        },
        teardownInfiniteScroll() {
            if (!this.loadMoreObserver) return;
            this.loadMoreObserver.disconnect();
            this.loadMoreObserver = null;
        },
        isCardActive(food) {
            return this.hoveredCardId === food.id || this.cardMenuOpenId === food.id;
        },
        cardHasLocks(food) {
            return hasItemLocks(food.locks);
        },
        cardHintFavorite(food) {
            void this.favorites;
            return this.isFavorite(food.staticItemName || food.id);
        },
        onCardEnter(food) {
            if (this.cardLeaveTimer) {
                clearTimeout(this.cardLeaveTimer);
                this.cardLeaveTimer = null;
            }
            this.hoveredCardId = food.id;
        },
        onCardLeave(food) {
            this.cardLeaveTimer = setTimeout(() => {
                this.cardLeaveTimer = null;
                if (this.hoveredCardId === food.id && this.cardMenuOpenId !== food.id) {
                    this.hoveredCardId = null;
                }
            }, 180);
        },
        onCardFocusOut(event, food) {
            const next = event.relatedTarget;
            if (next && event.currentTarget.contains(next)) return;
            this.onCardLeave(food);
        },
        onAddMenuShow(show, food) {
            this.cardMenuOpenId = show ? food.id : null;
            if (show) {
                this.hoveredCardId = food.id;
            }
        },
        onIconError(event) {
            const img = event?.target;
            if (!img || img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = '1';
            img.src = `${this.gameAssetsUrl}/Images/question-mark.png`;
        },
        hydrateFromRouteQuery() {
            this.suppressQuerySync = true;
            const { filters, sortBy, viewMode, rangeKeysFromQuery } = queryToExploreState(this.$route.query, {
                foodBounds: this.foodConsumables.length ? this.foodBounds : null,
                waterBounds: this.foodConsumables.length ? this.waterBounds : null,
                durationBounds: this.foodConsumables.length ? this.durationBounds : null,
            });
            this.filters = filters;
            this.sortBy = sortBy;
            this.viewMode = viewMode;
            this.rangeKeysFromQuery = rangeKeysFromQuery;
            this.$nextTick(() => {
                this.suppressQuerySync = false;
            });
        },
        scheduleQuerySync(debounceSearch) {
            if (this.suppressQuerySync || !this.boundsReady) return;
            if (this.querySyncTimer) {
                clearTimeout(this.querySyncTimer);
                this.querySyncTimer = null;
            }
            const delay = debounceSearch ? 200 : 0;
            this.querySyncTimer = setTimeout(() => {
                this.querySyncTimer = null;
                this.syncFiltersToRoute();
            }, delay);
        },
        syncFiltersToRoute() {
            if (this.suppressQuerySync || !this.boundsReady) return;
            const item = this.$route.query.item;
            const itemId = Array.isArray(item) ? item[0] : item;
            const nextQuery = exploreStateToQuery({
                filters: this.filters,
                sortBy: this.sortBy,
                viewMode: this.viewMode,
                foodBounds: this.foodBounds,
                waterBounds: this.waterBounds,
                durationBounds: this.durationBounds,
                getBuffBounds: (key) => getBuffValueBounds(this.foodConsumables, key),
                itemId: itemId || null,
            });
            if (exploreQueriesEqual(nextQuery, this.$route.query)) return;
            this.$router.replace({ query: nextQuery });
        },
        resetFilters() {
            this.filters = DEFAULT_FILTERS();
            this.filters.food = [this.foodBounds.min, this.foodBounds.max];
            this.filters.water = [this.waterBounds.min, this.waterBounds.max];
            this.filters.duration = [this.durationBounds.min, this.durationBounds.max];
            this.rangeKeysFromQuery = new Set();
            this.boundsReady = true;
            this.sortBy = 'name';
            this.viewMode = 'cards';
            this.resetResultsPagination();
        },
        craftRecipeId(food) {
            if (!food || food.acquisition !== 'craft') {
                return null;
            }
            if (this.recipeData[food.id]) {
                return food.id;
            }
            if (food.staticItemName && this.recipeData[food.staticItemName]) {
                return food.staticItemName;
            }
            return null;
        },
        onAddToCalculator(key, food) {
            const recipeId = this.craftRecipeId(food);
            if (!recipeId) {
                return;
            }
            if (key === 'new-tab') {
                this.openItemInNewTab(recipeId);
                return;
            }
            if (typeof key === 'string' && key.startsWith('tab:')) {
                const tabId = key.slice(4);
                // Tab ids may be numbers (from Date.now) — coerce when possible
                const numericId = Number(tabId);
                this.addItemToTab(recipeId, Number.isNaN(numericId) ? tabId : numericId);
            }
        },
        syncBuffLimits(keys) {
            if (!this.foodConsumables?.length) {
                return;
            }
            const next = { ...this.filters.buffLimits };
            const selected = new Set(keys);
            for (const key of Object.keys(next)) {
                if (!selected.has(key)) {
                    delete next[key];
                }
            }
            for (const key of keys) {
                const bounds = getBuffValueBounds(this.foodConsumables, key);
                const existing = next[key];
                if (!existing || existing.length !== 2) {
                    next[key] = [bounds.min, bounds.max];
                } else {
                    next[key] = [
                        Math.max(bounds.min, Math.min(existing[0], bounds.max)),
                        Math.max(bounds.min, Math.min(existing[1], bounds.max)),
                    ];
                }
            }
            this.filters.buffLimits = next;
        },
        formatBuffLimitDisplay(buff) {
            const range = this.filters.buffLimits[buff.key] ?? [buff.bounds.min, buff.bounds.max];
            const left = formatStatCellValue(buff.key, range[0]) ?? range[0];
            const right = formatStatCellValue(buff.key, range[1]) ?? range[1];
            return `${left} – ${right}`;
        },
        foodTooltip(food) {
            return [food.description, food.modifierDescription].filter(Boolean).join('\n') || '';
        },
        categoryLabel(category) {
            return category === 'medicine' ? 'Medicine' : 'Food';
        },
        categoryTagType(category) {
            return category === 'medicine' ? 'info' : 'success';
        },
        foodAudienceLabel(audience) {
            return audience === 'animal' ? 'Animal' : audience === 'prospector' ? 'Prospector' : null;
        },
        foodAudienceTagType(audience) {
            return audience === 'animal' ? 'warning' : audience === 'prospector' ? 'success' : 'default';
        },
        acquisitionLabel(acquisition) {
            return (
                { craft: 'Craft', gather: 'Gather', mission: 'Mission', shop: 'Shop', workshop: 'Workshop' }[acquisition] ??
                acquisition
            );
        },
        acquisitionTagType(acquisition) {
            return (
                { craft: 'success', gather: 'warning', mission: 'primary', shop: 'info', workshop: 'error' }[acquisition] ??
                'default'
            );
        },
        otherInstantStats(food) {
            return food.instantStats.filter(
                (stat) => !/FoodRecovery|WaterRecovery|HealthRecovery|StaminaRecovery|OxygenRecovery/.test(stat.key)
            );
        },
        statClass(stat) {
            return getStatEffectClass(stat);
        },
    },
};
</script>

<style scoped lang="scss">
.food-explore {
    max-width: 100rem;
    margin: 0 auto;
}

.explore-title {
    font-size: 1.35rem;
    font-weight: 700;
}

.explore-subtitle {
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.9rem;
}

.explore-layout {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    grid-template-areas: 'filters results';
    gap: 1rem;
    align-items: start;
}

.filters-panel {
    grid-area: filters;
    position: sticky;
    top: 3.25rem;
}

.results-panel {
    grid-area: results;
    min-width: 0;
}

.filter-block {
    margin-bottom: 1rem;
}

.filter-label {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.65);
}

.filter-label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.15rem;

    .filter-label {
        margin-bottom: 0;
    }
}

.filter-range-value {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.45);
    font-variant-numeric: tabular-nums;
}

.toggle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem 0.75rem;
}

.buff-match-hint {
    margin-top: 0.35rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
}

.buff-limit-filters {
    margin-top: 0.75rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.buff-limit-block {
    margin-bottom: 0.75rem;

    &:last-child {
        margin-bottom: 0;
    }
}

.toggles .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.55rem;
    font-size: 0.85rem;
}

.sort-select {
    width: 12rem;
}

.empty-state {
    padding: 2rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
}

.page-status {
    display: block;
    font-size: 0.8rem;
}

.load-more-sentinel {
    width: 100%;
    height: 1px;
    margin-top: 0.5rem;
    pointer-events: none;
}

.food-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: 0.75rem;
}

.food-card {
    position: relative;
    padding: 0.85rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;

    &.is-active {
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.045);
    }
}

.food-card-actions,
.food-card-hints {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    z-index: 1;
    gap: 0.1rem;
}

.food-card-hints {
    pointer-events: none;
    opacity: 0.7;
    font-size: 0.75rem;
    line-height: 1;
    gap: 0.25rem;
}

.hint-fav {
    color: #e6c35c;
}

.hint-lock {
    color: #f0a0a0;
    font-weight: 700;
}

.food-icon {
    margin-right: 0.75rem;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
}

.food-name {
    font-weight: 650;
    line-height: 1.25;
    margin-bottom: 0.35rem;
    padding-right: 2.5rem;
    min-width: 0;

    &--hoverable {
        cursor: help;
        border-bottom: 1px dotted rgba(255, 255, 255, 0.35);
        width: fit-content;
        max-width: 100%;
    }
}

.food-name-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.35rem;
    min-width: 0;

    .food-name {
        margin-bottom: 0;
        padding-right: 0;
        min-width: 0;
    }
}

.add-calc-btn {
    flex-shrink: 0;
}

.food-tags {
    gap: 0.3rem;
}

.chip {
    display: inline-flex;
    align-items: center;
    font-size: 0.72rem;
    line-height: 1.2;
    padding: 0.12rem 0.4rem;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.75);
    background: rgba(255, 255, 255, 0.08);

    &--success {
        color: #a8e6a3;
        background: rgba(99, 180, 90, 0.18);
    }

    &--warning {
        color: #e6d48a;
        background: rgba(180, 150, 60, 0.18);
    }

    &--info {
        color: #8ec8f0;
        background: rgba(70, 140, 200, 0.18);
    }

    &--primary {
        color: #b8c4f0;
        background: rgba(90, 110, 200, 0.2);
    }

    &--error {
        color: #f0a0a0;
        background: rgba(200, 80, 80, 0.18);
    }
}

.stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.65rem;
}

.stat-pill {
    font-size: 0.75rem;
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);

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
    }

    &.is-pos {
        color: #a8e6a3;
    }
}

.buff-desc {
    margin-top: 0.55rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.35;
}

.buff-list {
    margin: 0.5rem 0 0;
    padding-left: 1.1rem;
    font-size: 0.8rem;
    line-height: 1.45;

    .is-pos {
        color: #a8e6a3;
    }

    .is-neg {
        color: #f0a0a0;
    }
}

.stations {
    margin-top: 0.55rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.4);
}

.food-table {
    :deep(.n-data-table-th) {
        white-space: nowrap;
    }

    :deep(.food-name) {
        margin-bottom: 0;
    }

    :deep(.food-name-row) {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 0;
    }

    :deep(.add-calc-btn) {
        flex-shrink: 0;
    }

    :deep(.buff-col-title) {
        display: inline-block;
        max-width: 5.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
        font-size: 0.75rem;
        line-height: 1.2;
        white-space: normal;
    }

    :deep(.buff-cell) {
        font-variant-numeric: tabular-nums;
        font-size: 0.8rem;
        font-weight: 600;

        &.is-pos {
            color: #a8e6a3;
        }

        &.is-neg {
            color: #f0a0a0;
        }
    }

    :deep(.table-buff-text) {
        font-size: 0.78rem;
        line-height: 1.35;
        white-space: normal;

        .is-pos {
            color: #a8e6a3;
        }

        .is-neg {
            color: #f0a0a0;
        }
    }

    :deep(.table-buff-sep) {
        color: rgba(255, 255, 255, 0.35);
    }

    :deep(.table-buff-list) {
        margin: 0;
        padding-left: 1rem;
        font-size: 0.78rem;
        line-height: 1.4;

        .is-pos {
            color: #a8e6a3;
        }

        .is-neg {
            color: #f0a0a0;
        }
    }

    :deep(.table-stations) {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.55);
    }

    :deep(.table-source-tags) {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        align-items: center;
    }

    :deep(.table-muted) {
        color: rgba(255, 255, 255, 0.35);
    }
}

.name-tooltip {
    max-width: 20rem;
    line-height: 1.4;
}

@media (max-width: 1200px) {
    .explore-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
            'filters'
            'results';
    }

    .filters-panel {
        position: static;
        max-height: min(50vh, 28rem);
        overflow-y: auto;
    }
}
</style>
