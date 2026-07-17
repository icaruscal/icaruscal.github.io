<template>
    <div class="gear-explore p-2 pt-3">
        <div class="explore-header mb-3 mx-2">
            <h1 class="explore-title m-0">Gear Explorer</h1>
            <p class="explore-subtitle mt-1 mb-0">
                Browse armor, weapons, tools, ammo, attachments, and equippable modules.
            </p>
        </div>

        <n-spin :show="isLoadingRecipes">
            <div class="explore-layout mx-2" :class="`layout-${pageLayout}`">
                <aside class="filters-panel">
                    <n-card size="small" title="Filters" content-style="padding-top: 0.5rem;">
                        <div class="filter-block">
                            <label class="filter-label">Search</label>
                            <n-input v-model:value="filters.search" placeholder="Name, set, stat…" clearable />
                        </div>

                        <div class="filter-block">
                            <label class="filter-label">Type</label>
                            <div class="toggle-grid">
                                <n-checkbox v-model:checked="filters.categories.armor">Armor</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.weapon">Weapon</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.tool">Tool</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.ammo">Ammo</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.attachment">Attachment</n-checkbox>
                                <n-checkbox v-model:checked="filters.categories.module">Module</n-checkbox>
                            </div>
                        </div>

                        <div v-if="filters.categories.armor" class="filter-block">
                            <label class="filter-label">Armor slot</label>
                            <n-select
                                v-model:value="filters.slots"
                                multiple
                                filterable
                                clearable
                                placeholder="Any slot…"
                                :options="slotOptions"
                                :max-tag-count="2"
                            />
                        </div>

                        <div v-if="filters.categories.armor" class="filter-block">
                            <label class="filter-label">Armor set</label>
                            <n-select
                                v-model:value="filters.sets"
                                multiple
                                filterable
                                clearable
                                placeholder="Any set…"
                                :options="setOptions"
                                :max-tag-count="2"
                            />
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
                                <label class="filter-label">Physical resist</label>
                                <span class="filter-range-value">{{ filters.phys[0] }} – {{ filters.phys[1] }}</span>
                            </div>
                            <n-slider v-model:value="filters.phys" range :min="physBounds.min" :max="physBounds.max" :step="1" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Melee damage</label>
                                <span class="filter-range-value">{{ filters.melee[0] }} – {{ filters.melee[1] }}</span>
                            </div>
                            <n-slider v-model:value="filters.melee" range :min="meleeBounds.min" :max="meleeBounds.max" :step="5" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Damage multiplier</label>
                                <span class="filter-range-value">{{ filters.mult[0] }}× – {{ filters.mult[1] }}×</span>
                            </div>
                            <n-slider v-model:value="filters.mult" range :min="multBounds.min" :max="multBounds.max" :step="0.05" />
                        </div>

                        <div class="filter-block">
                            <div class="filter-label-row">
                                <label class="filter-label">Stat effects</label>
                                <n-button-group v-if="filters.statKeys.length > 1" size="tiny">
                                    <n-button
                                        :type="filters.statMatchMode === 'and' ? 'primary' : 'default'"
                                        secondary
                                        @click="filters.statMatchMode = 'and'"
                                    >
                                        And
                                    </n-button>
                                    <n-button
                                        :type="filters.statMatchMode === 'or' ? 'primary' : 'default'"
                                        secondary
                                        @click="filters.statMatchMode = 'or'"
                                    >
                                        Or
                                    </n-button>
                                </n-button-group>
                            </div>
                            <n-select
                                v-model:value="filters.statKeys"
                                multiple
                                filterable
                                clearable
                                placeholder="Any stat…"
                                :options="gearStatOptions"
                                :max-tag-count="2"
                            />
                            <div v-if="filters.statKeys.length > 1" class="stat-match-hint">
                                {{ filters.statMatchMode === 'or' ? 'Match any selected stat' : 'Match all selected stats' }}
                            </div>
                            <div v-if="selectedStatLimitFilters.length" class="stat-limit-filters">
                                <div v-for="stat in selectedStatLimitFilters" :key="stat.key" class="stat-limit-block">
                                    <div class="filter-label-row">
                                        <label class="filter-label">{{ stat.label }}</label>
                                        <span class="filter-range-value">{{ formatStatLimitDisplay(stat) }}</span>
                                    </div>
                                    <n-slider
                                        v-model:value="filters.statLimits[stat.key]"
                                        range
                                        :min="stat.bounds.min"
                                        :max="stat.bounds.max"
                                        :step="stat.step"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="filter-block toggles">
                            <div class="toggle-row">
                                <span>Favorites only</span>
                                <n-switch v-model:value="filters.favoritesOnly" size="small" />
                            </div>
                        </div>

                        <n-button class="mt-2" block secondary @click="resetFilters">Reset filters</n-button>
                    </n-card>
                </aside>

                <section class="results-panel">
                    <div class="results-toolbar flex align-items-center justify-content-between mb-2 gap-2">
                        <n-text depth="3">{{ filteredGear.length }} of {{ gearItems.length }} gear items</n-text>
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

                    <div v-if="filteredGear.length === 0" class="empty-state">No gear matches these filters.</div>

                    <template v-else>
                        <n-text v-if="hasMoreResults" depth="3" class="page-status mb-2">
                            Showing {{ pagedGear.length }} of {{ sortedGear.length }}
                        </n-text>

                        <n-data-table
                            v-if="viewMode === 'table'"
                            class="gear-table"
                            size="small"
                            :bordered="false"
                            :single-line="false"
                            :columns="tableColumns"
                            :data="pagedGear"
                            :row-key="(row) => row.id"
                            :scroll-x="tableScrollX"
                        />

                        <div v-else class="gear-grid">
                            <article
                                v-for="gear in pagedGear"
                                :key="gear.id"
                                class="gear-card"
                                :class="{ 'is-active': isCardActive(gear) }"
                                @pointerenter="onCardEnter(gear)"
                                @pointerleave="onCardLeave(gear)"
                                @focusin="onCardEnter(gear)"
                                @focusout="onCardFocusOut($event, gear)"
                            >
                                <div
                                    v-if="isCardActive(gear)"
                                    class="gear-card-actions flex align-items-center"
                                >
                                    <favorite-star-button
                                        :item-id="gear.id"
                                        :label="gear.label"
                                        size="sm"
                                    />
                                    <item-lock-badge
                                        v-if="cardHasLocks(gear)"
                                        :locks="gear.locks"
                                        :item-id="gear.id"
                                        :recipe-id="gear.recipeId || gear.id"
                                        size="sm"
                                    />
                                    <item-detail-button
                                        :item-id="gear.id"
                                        :label="gear.label"
                                    />
                                    <n-dropdown
                                        v-if="craftRecipeIdFor(gear)"
                                        trigger="click"
                                        placement="bottom-start"
                                        :options="addToCalculatorOptions"
                                        @select="(key) => onAddToCalculator(key, gear)"
                                        @update:show="(show) => onAddMenuShow(show, gear)"
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
                                    v-else-if="cardHintFavorite(gear) || cardHasLocks(gear)"
                                    class="gear-card-hints flex align-items-center"
                                    aria-hidden="true"
                                >
                                    <span v-if="cardHintFavorite(gear)" class="hint-fav">★</span>
                                    <span v-if="cardHasLocks(gear)" class="hint-lock">!</span>
                                </div>

                                <div class="gear-card-top flex">
                                    <img
                                        class="gear-icon"
                                        width="48"
                                        height="48"
                                        loading="lazy"
                                        decoding="async"
                                        alt=""
                                        :src="`${gameAssetsUrl}/ItemIcons/${gear.iconPath}.png`"
                                        @error="onIconError"
                                    />
                                    <div class="gear-meta flex-1">
                                        <div
                                            class="gear-name"
                                            :class="{ 'gear-name--hoverable': gear.description }"
                                            :title="gear.description || undefined"
                                        >
                                            {{ gear.label }}
                                        </div>
                                        <div class="gear-tags flex flex-wrap">
                                            <span class="chip" :class="`chip--${categoryTagType(gear.category)}`">
                                                {{ categoryLabel(gear.category) }}
                                            </span>
                                            <span v-if="gear.armourType" class="chip chip--info">
                                                {{ slotLabel(gear.armourType) }}
                                            </span>
                                            <span v-if="gear.setLabel" class="chip">{{ gear.setLabel }}</span>
                                            <span class="chip" :class="`chip--${acquisitionTagType(gear.acquisition)}`">
                                                {{ acquisitionLabel(gear.acquisition) }}
                                            </span>
                                            <span
                                                v-if="gear.mission && gear.acquisition !== 'mission'"
                                                class="chip chip--primary"
                                            >
                                                Mission
                                            </span>
                                            <span v-if="gear.tier != null" class="chip">T{{ gear.tier }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="gear.combatRows.length" class="stat-row">
                                    <span
                                        v-for="row in gear.combatRows"
                                        :key="`c-${row.key}`"
                                        class="stat-pill combat"
                                    >
                                        {{ row.display }}
                                    </span>
                                </div>

                                <ul v-if="gear.armourStats.length" class="stat-list">
                                    <li
                                        v-for="stat in gear.armourStats"
                                        :key="`a-${stat.key}`"
                                        :class="['gear-stat', statClass(stat)]"
                                    >
                                        {{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </li>
                                </ul>

                                <ul v-if="gear.equipGrantedStats.length" class="stat-list">
                                    <li
                                        v-for="stat in gear.equipGrantedStats"
                                        :key="`e-${stat.key}`"
                                        :class="['gear-stat', statClass(stat)]"
                                    >
                                        {{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </li>
                                </ul>

                                <div v-if="gear.setBonus" class="set-bonus">
                                    Set bonus ({{ gear.setBonus.requiredGear }} pieces):
                                    <span
                                        v-for="(stat, index) in gear.setBonus.stats"
                                        :key="`sb-${stat.key}`"
                                        :class="statClass(stat)"
                                    >
                                        <template v-if="index > 0"> · </template>{{ stat.display || `${stat.key}: ${stat.value}` }}
                                    </span>
                                </div>

                                <div v-if="gear.stationLabels.length" class="stations">
                                    {{ gear.stationLabels.join(' · ') }}
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
import { NButton, NDropdown, NIcon, NTag, NTooltip } from 'naive-ui';
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
    createDefaultGearFilters,
    gearQueriesEqual,
    gearStateToQuery,
    queryToGearState,
} from '@/utility/gearQuery';

const DEFAULT_FILTERS = createDefaultGearFilters;
const RESULTS_PAGE_SIZE = 48;

const compareNullableNumber = (a, b, direction = 1) => {
    const left = a == null ? Number.NEGATIVE_INFINITY : a;
    const right = b == null ? Number.NEGATIVE_INFINITY : b;
    if (left === right) return 0;
    return left < right ? -direction : direction;
};

const CATEGORY_LABELS = {
    armor: 'Armor',
    weapon: 'Weapon',
    tool: 'Tool',
    ammo: 'Ammo',
    attachment: 'Attachment',
    module: 'Module',
};

const CATEGORY_TAG_TYPES = {
    armor: 'info',
    weapon: 'error',
    tool: 'warning',
    ammo: 'default',
    attachment: 'primary',
    module: 'success',
};

const shortStatLabel = (display, key) => {
    const base = (display || key || '').replace(/^[+-]?\d+(?:\.\d+)?%?\s*/, '').trim();
    return base || key;
};

const formatStatCellValue = (key, value) => {
    if (value == null || Number.isNaN(value)) return null;
    if (key.endsWith('_?')) return value ? '✓' : null;
    const isPct = key.includes('%');
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${isPct ? '%' : ''}`;
};

const getGearStat = (gear, key) => (gear.gearStats || []).find((stat) => stat.key === key) ?? null;

const getStatValueBounds = (gearList, key) => {
    const values = [];
    for (const gear of gearList) {
        const stat = getGearStat(gear, key);
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
    name: 'GearExplore',
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
                { label: 'Tier', value: 'tierAsc' },
                { label: 'Physical resist (high → low)', value: 'physDesc' },
                { label: 'Melee damage (high → low)', value: 'meleeDesc' },
                { label: 'Damage multiplier (high → low)', value: 'multDesc' },
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
        ...mapState(useIcarusStore, ['gearItems', 'isLoadingRecipes', 'recipeData', 'favorites']),
        ...mapGetters(useIcarusStore, ['gearStatOptions', 'planningTabs', 'pageLayout']),
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
        slotOptions() {
            const slots = new Set();
            for (const gear of this.gearItems) {
                if (gear.armourType) slots.add(gear.armourType);
            }
            return [...slots]
                .sort((a, b) => a.localeCompare(b))
                .map((slot) => ({ value: slot, label: this.slotLabel(slot) }));
        },
        setOptions() {
            const sets = new Map();
            for (const gear of this.gearItems) {
                if (gear.setId && !sets.has(gear.setId)) {
                    sets.set(gear.setId, gear.setLabel || gear.setId);
                }
            }
            return [...sets.entries()]
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label));
        },
        physBounds() {
            const values = this.gearItems.map((g) => g.physicalResist);
            return { min: 0, max: Math.max(10, ...values, 0) };
        },
        meleeBounds() {
            const values = this.gearItems.map((g) => g.meleeDamage);
            return { min: 0, max: Math.max(50, ...values, 0) };
        },
        multBounds() {
            const values = this.gearItems.map((g) => g.damageMultiplier);
            const max = Math.max(1, ...values, 0);
            return { min: 0, max: Math.ceil(max * 20) / 20 };
        },
        filteredGear() {
            const search = this.filters.search.trim().toLowerCase();
            const selectedSources = Object.entries(this.filters.sources)
                .filter(([, on]) => on)
                .map(([key]) => key);
            const [tierMin, tierMax] = this.filters.tier;
            const [physMin, physMax] = this.filters.phys;
            const [meleeMin, meleeMax] = this.filters.melee;
            const [multMin, multMax] = this.filters.mult;
            const statKeys = this.filters.statKeys ?? [];
            const slots = this.filters.slots ?? [];
            const sets = this.filters.sets ?? [];

            return this.gearItems.filter((gear) => {
                if (!this.filters.categories[gear.category]) return false;

                if (slots.length > 0 && (!gear.armourType || !slots.includes(gear.armourType))) return false;
                if (sets.length > 0 && (!gear.setId || !sets.includes(gear.setId))) return false;

                if (!selectedSources.includes(gear.acquisition)) return false;

                const tier = gear.tier ?? 0;
                if (tier < tierMin || tier > tierMax) return false;
                if (gear.physicalResist < physMin || gear.physicalResist > physMax) return false;
                if (gear.meleeDamage < meleeMin || gear.meleeDamage > meleeMax) return false;
                if (gear.damageMultiplier < multMin || gear.damageMultiplier > multMax) return false;

                if (this.filters.favoritesOnly) {
                    void this.favorites;
                    if (!this.isFavorite(gear.id)) return false;
                }

                if (statKeys.length > 0) {
                    const matchesStat = (key) => {
                        const stat = getGearStat(gear, key);
                        if (!stat) return false;
                        const bounds = getStatValueBounds(this.gearItems, key);
                        const range = this.filters.statLimits[key] ?? [bounds.min, bounds.max];
                        const value = stat.value ?? 0;
                        return value >= range[0] && value <= range[1];
                    };
                    const matchMode = this.filters.statMatchMode === 'or' ? 'or' : 'and';
                    const ok = matchMode === 'or' ? statKeys.some(matchesStat) : statKeys.every(matchesStat);
                    if (!ok) return false;
                }

                if (search) {
                    const haystack = [
                        gear.label,
                        gear.description,
                        gear.setLabel,
                        ...gear.gearStats.map((s) => s.display),
                        ...gear.combatRows.map((r) => r.display),
                        ...gear.stationLabels,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(search)) return false;
                }

                return true;
            });
        },
        sortedGear() {
            const list = [...this.filteredGear];
            switch (this.sortBy) {
                case 'tierAsc':
                    list.sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.label.localeCompare(b.label));
                    break;
                case 'physDesc':
                    list.sort((a, b) => b.physicalResist - a.physicalResist || a.label.localeCompare(b.label));
                    break;
                case 'meleeDesc':
                    list.sort((a, b) => b.meleeDamage - a.meleeDamage || a.label.localeCompare(b.label));
                    break;
                case 'multDesc':
                    list.sort((a, b) => b.damageMultiplier - a.damageMultiplier || a.label.localeCompare(b.label));
                    break;
                default:
                    list.sort((a, b) => a.label.localeCompare(b.label));
            }
            return list;
        },
        pagedGear() {
            return this.sortedGear.slice(0, this.resultsShown);
        },
        hasMoreResults() {
            return this.sortedGear.length > this.resultsShown;
        },
        selectedStatLimitFilters() {
            const labelByKey = new Map(this.gearStatOptions.map((opt) => [opt.value, opt.label]));
            return (this.filters.statKeys ?? []).map((key) => {
                const bounds = getStatValueBounds(this.gearItems, key);
                const span = bounds.max - bounds.min;
                return {
                    key,
                    label: labelByKey.get(key) || shortStatLabel(null, key),
                    bounds,
                    step: span > 50 ? 5 : 1,
                };
            });
        },
        /** Per-stat value columns only for selected Stat effects. */
        selectedStatColumns() {
            const labelByKey = new Map(this.gearStatOptions.map((opt) => [opt.value, opt.label]));
            return (this.filters.statKeys ?? []).map((key) => ({
                key,
                label: labelByKey.get(key) || shortStatLabel(null, key),
            }));
        },
        tableScrollX() {
            const fixed = 220 + 160 + 130 + 70 + 80 + 80 + 80 + 260 + 140;
            return fixed + this.selectedStatColumns.length * 108;
        },
        tableColumns() {
            const baseColumns = [
                {
                    title: 'Name',
                    key: 'label',
                    sorter: 'default',
                    width: 220,
                    ellipsis: { tooltip: true },
                    fixed: 'left',
                    render: (row) => {
                        const tip = row.description;
                        const recipeId = this.craftRecipeIdFor(row);
                        const nameNode = h(
                            'span',
                            {
                                class: tip ? 'gear-name gear-name--hoverable table-name-label' : 'gear-name table-name-label',
                                title: row.label,
                            },
                            row.label
                        );
                        const labeled = tip
                            ? h(
                                  NTooltip,
                                  { trigger: 'hover', placement: 'top-start' },
                                  {
                                      trigger: () => nameNode,
                                      default: () => h('div', { class: 'name-tooltip' }, row.description),
                                  }
                              )
                            : nameNode;

                        const actions = [
                            h(FavoriteStarButton, {
                                itemId: row.id,
                                label: row.label,
                                size: 'sm',
                            }),
                            h(ItemLockBadge, {
                                locks: row.locks,
                                itemId: row.id,
                                recipeId: row.recipeId || row.id,
                                size: 'sm',
                            }),
                            h(ItemDetailButton, {
                                itemId: row.id,
                                label: row.label,
                            }),
                        ];
                        if (recipeId) {
                            actions.push(
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

                        return h('div', { class: 'gear-name-row' }, [
                            labeled,
                            h('div', { class: 'table-name-actions' }, actions),
                        ]);
                    },
                },
                {
                    title: 'Type',
                    key: 'category',
                    sorter: 'default',
                    width: 160,
                    render: (row) =>
                        h('div', { class: 'table-source-tags' }, [
                            h(
                                NTag,
                                { size: 'small', bordered: false, type: this.categoryTagType(row.category) },
                                { default: () => this.categoryLabel(row.category) }
                            ),
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
                    title: 'Slot / Set',
                    key: 'armourType',
                    width: 130,
                    sorter: (a, b) => (a.armourType || '').localeCompare(b.armourType || ''),
                    render: (row) => {
                        if (!row.armourType && !row.setLabel) return h('span', { class: 'table-muted' }, '—');
                        const parts = [this.slotLabel(row.armourType), row.setLabel].filter(Boolean);
                        return h('span', { class: 'table-slot' }, parts.join(' · '));
                    },
                },
                {
                    title: 'Tier',
                    key: 'tier',
                    sorter: (a, b) => compareNullableNumber(a.tier, b.tier),
                    width: 70,
                    render: (row) => (row.tier != null ? `T${row.tier}` : '—'),
                },
                {
                    title: 'Melee',
                    key: 'meleeDamage',
                    sorter: (a, b) => a.meleeDamage - b.meleeDamage,
                    width: 80,
                    render: (row) => (row.meleeDamage ? `${row.meleeDamage}` : '—'),
                },
                {
                    title: 'Dmg ×',
                    key: 'damageMultiplier',
                    sorter: (a, b) => a.damageMultiplier - b.damageMultiplier,
                    width: 80,
                    render: (row) => (row.damageMultiplier ? `${row.damageMultiplier}×` : '—'),
                },
                {
                    title: 'Phys',
                    key: 'physicalResist',
                    sorter: (a, b) => a.physicalResist - b.physicalResist,
                    width: 80,
                    render: (row) => (row.physicalResist ? `+${row.physicalResist}` : '—'),
                },
                {
                    title: 'Stats',
                    key: 'gearStatsText',
                    width: 260,
                    ellipsis: { tooltip: true },
                    sorter: (a, b) => a.gearStats.length - b.gearStats.length,
                    render: (row) => {
                        const parts = [];
                        for (const combatRow of row.combatRows) {
                            parts.push(h('span', { key: `c-${combatRow.key}` }, combatRow.display));
                        }
                        for (const stat of row.gearStats) {
                            parts.push(
                                h(
                                    'span',
                                    { key: `s-${stat.key}`, class: this.statClass(stat) },
                                    stat.display || formatStatCellValue(stat.key, stat.value) || stat.key
                                )
                            );
                        }
                        if (!parts.length) {
                            return h('span', { class: 'table-muted' }, '—');
                        }
                        return h(
                            'div',
                            { class: 'table-stat-text' },
                            parts.flatMap((node, index) =>
                                index > 0 ? [h('span', { class: 'table-stat-sep' }, ' · '), node] : [node]
                            )
                        );
                    },
                },
            ];

            const statColumns = this.selectedStatColumns.map(({ key, label }) => ({
                title: () =>
                    h(
                        NTooltip,
                        { trigger: 'hover', placement: 'top' },
                        {
                            trigger: () => h('span', { class: 'stat-col-title' }, label),
                            default: () => label,
                        }
                    ),
                key: `stat:${key}`,
                width: 108,
                ellipsis: { tooltip: true },
                sorter: (a, b) => {
                    const left = getGearStat(a, key)?.value ?? null;
                    const right = getGearStat(b, key)?.value ?? null;
                    return compareNullableNumber(left, right);
                },
                render: (row) => {
                    const stat = getGearStat(row, key);
                    if (!stat) {
                        return h('span', { class: 'table-muted' }, '—');
                    }
                    const text = formatStatCellValue(stat.key, stat.value) ?? '—';
                    return h(
                        NTooltip,
                        { trigger: 'hover', placement: 'top' },
                        {
                            trigger: () => h('span', { class: ['stat-cell', this.statClass(stat)] }, text),
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

            return [...baseColumns, ...statColumns, stationColumn];
        },
    },
    watch: {
        gearItems: {
            immediate: true,
            handler(list) {
                if (!list.length || this.boundsReady) return;
                if (!this.rangeKeysFromQuery.has('phys')) {
                    this.filters.phys = [this.physBounds.min, this.physBounds.max];
                }
                if (!this.rangeKeysFromQuery.has('melee')) {
                    this.filters.melee = [this.meleeBounds.min, this.meleeBounds.max];
                }
                if (!this.rangeKeysFromQuery.has('mult')) {
                    this.filters.mult = [this.multBounds.min, this.multBounds.max];
                }
                this.boundsReady = true;
                if (this.filters.statKeys?.length) {
                    this.syncStatLimits(this.filters.statKeys);
                }
                this.$nextTick(() => {
                    this.syncFiltersToRoute();
                });
            },
        },
        'filters.statKeys': {
            handler(keys) {
                this.syncStatLimits(keys ?? []);
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
            this.resultsShown = Math.min(this.resultsShown + RESULTS_PAGE_SIZE, this.sortedGear.length);
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
        isCardActive(gear) {
            return this.hoveredCardId === gear.id || this.cardMenuOpenId === gear.id;
        },
        cardHasLocks(gear) {
            return hasItemLocks(gear.locks);
        },
        cardHintFavorite(gear) {
            void this.favorites;
            return this.isFavorite(gear.id);
        },
        onCardEnter(gear) {
            if (this.cardLeaveTimer) {
                clearTimeout(this.cardLeaveTimer);
                this.cardLeaveTimer = null;
            }
            this.hoveredCardId = gear.id;
        },
        onCardLeave(gear) {
            this.cardLeaveTimer = setTimeout(() => {
                this.cardLeaveTimer = null;
                if (this.hoveredCardId === gear.id && this.cardMenuOpenId !== gear.id) {
                    this.hoveredCardId = null;
                }
            }, 180);
        },
        onCardFocusOut(event, gear) {
            const next = event.relatedTarget;
            if (next && event.currentTarget.contains(next)) return;
            this.onCardLeave(gear);
        },
        onAddMenuShow(show, gear) {
            this.cardMenuOpenId = show ? gear.id : null;
            if (show) {
                this.hoveredCardId = gear.id;
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
            const { filters, sortBy, viewMode, rangeKeysFromQuery } = queryToGearState(this.$route.query, {
                physBounds: this.gearItems.length ? this.physBounds : null,
                meleeBounds: this.gearItems.length ? this.meleeBounds : null,
                multBounds: this.gearItems.length ? this.multBounds : null,
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
            const nextQuery = gearStateToQuery({
                filters: this.filters,
                sortBy: this.sortBy,
                viewMode: this.viewMode,
                physBounds: this.physBounds,
                meleeBounds: this.meleeBounds,
                multBounds: this.multBounds,
                getStatBounds: (key) => getStatValueBounds(this.gearItems, key),
                itemId: itemId || null,
            });
            if (gearQueriesEqual(nextQuery, this.$route.query)) return;
            this.$router.replace({ query: nextQuery });
        },
        resetFilters() {
            this.filters = DEFAULT_FILTERS();
            this.filters.phys = [this.physBounds.min, this.physBounds.max];
            this.filters.melee = [this.meleeBounds.min, this.meleeBounds.max];
            this.filters.mult = [this.multBounds.min, this.multBounds.max];
            this.rangeKeysFromQuery = new Set();
            this.boundsReady = true;
            this.sortBy = 'name';
            this.viewMode = 'cards';
            this.resetResultsPagination();
        },
        craftRecipeIdFor(gear) {
            if (!gear?.craftRecipeId) {
                return null;
            }
            if (this.recipeData[gear.craftRecipeId]) {
                return gear.craftRecipeId;
            }
            if (this.recipeData[gear.id]) {
                return gear.id;
            }
            return null;
        },
        onAddToCalculator(key, gear) {
            const recipeId = this.craftRecipeIdFor(gear);
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
        syncStatLimits(keys) {
            if (!this.gearItems?.length) {
                return;
            }
            const next = { ...this.filters.statLimits };
            const selected = new Set(keys);
            for (const key of Object.keys(next)) {
                if (!selected.has(key)) {
                    delete next[key];
                }
            }
            for (const key of keys) {
                const bounds = getStatValueBounds(this.gearItems, key);
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
            this.filters.statLimits = next;
        },
        formatStatLimitDisplay(stat) {
            const range = this.filters.statLimits[stat.key] ?? [stat.bounds.min, stat.bounds.max];
            const left = formatStatCellValue(stat.key, range[0]) ?? range[0];
            const right = formatStatCellValue(stat.key, range[1]) ?? range[1];
            return `${left} – ${right}`;
        },
        categoryLabel(category) {
            return CATEGORY_LABELS[category] ?? category;
        },
        categoryTagType(category) {
            return CATEGORY_TAG_TYPES[category] ?? 'default';
        },
        slotLabel(slot) {
            return slot ? String(slot).replace(/_/g, ' ') : null;
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
        statClass(stat) {
            return getStatEffectClass(stat);
        },
    },
};
</script>

<style scoped lang="scss">
.gear-explore {
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

    &.layout-top {
        grid-template-columns: 1fr;
        grid-template-areas:
            'filters'
            'results';

        .filters-panel {
            position: sticky;
            top: 3.25rem;
            z-index: 40;
            max-height: min(50vh, 28rem);
            overflow-y: auto;
        }
    }
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

.stat-match-hint {
    margin-top: 0.35rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.45);
}

.stat-limit-filters {
    margin-top: 0.75rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-limit-block {
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
    width: 14rem;
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

.gear-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: 0.75rem;
}

.gear-card {
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

.gear-card-actions,
.gear-card-hints {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    z-index: 1;
    gap: 0.1rem;
}

.gear-card-hints {
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

.gear-icon {
    margin-right: 0.75rem;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
}

.gear-name {
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

.gear-name-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.35rem;
    min-width: 0;

    .gear-name {
        margin-bottom: 0;
        padding-right: 0;
        min-width: 0;
    }
}

.add-calc-btn {
    flex-shrink: 0;
}

.gear-tags {
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

    &.combat {
        color: #e6d48a;
        background: rgba(180, 150, 60, 0.15);
    }
}

.stat-list {
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

.set-bonus {
    margin-top: 0.55rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.4;

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

.gear-table {
    :deep(.n-data-table-th),
    :deep(.n-data-table-td) {
        padding: 0.2rem 0.45rem;
    }

    :deep(.n-data-table-th) {
        white-space: nowrap;
    }

    :deep(.gear-name) {
        margin-bottom: 0;
    }

    :deep(.gear-name-row) {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        margin-bottom: 0;
        min-width: 0;
    }

    :deep(.table-name-label) {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 0;
    }

    :deep(.table-name-actions) {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 0.1rem;
    }

    :deep(.add-calc-btn) {
        flex-shrink: 0;
    }

    :deep(.stat-col-title) {
        display: inline-block;
        max-width: 5.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
        font-size: 0.75rem;
        line-height: 1.2;
        white-space: normal;
    }

    :deep(.stat-cell) {
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

    :deep(.table-stat-text) {
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

    :deep(.table-stat-sep) {
        color: rgba(255, 255, 255, 0.35);
    }

    :deep(.table-slot) {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.7);
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
</style>
