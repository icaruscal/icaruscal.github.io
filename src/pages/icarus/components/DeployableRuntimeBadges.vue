<template>
    <div v-if="badges.length" class="deployable-runtime">
        <div
            v-for="badge in badges"
            :key="badge.key"
            class="deployable-row"
            :class="badgeClass(badge)"
            :style="{ '--badge-accent': badge.accent }"
        >
            <div class="deployable-row-main">
                <span class="deployable-row-icon">
                    <img
                        v-if="badge.iconPath && !iconFailed[badge.key]"
                        class="deployable-row-img"
                        :src="`${gameAssetsUrl}/ItemIcons/${badge.iconPath}.png`"
                        alt=""
                        @error="onIconError(badge.key)"
                    />
                    <n-icon v-else class="deployable-row-vicon" :size="14">
                        <component :is="viconFor(badge.vicon)" />
                    </n-icon>
                </span>
                <span class="deployable-row-label">{{ badge.label }}</span>
                <span class="deployable-row-status">{{ statusText(badge) }}</span>
                <span v-if="amountText(badge)" class="deployable-row-amount">{{ amountText(badge) }}</span>
                <span v-if="badge.hint" class="deployable-row-hint">{{ badge.hint }}</span>
            </div>
            <div v-if="badge.fuelItems?.length" class="deployable-fuels">
                <div
                    v-for="fuel in badge.fuelItems"
                    :key="fuel.id"
                    class="deployable-fuel"
                >
                    <n-image
                        width="18"
                        height="18"
                        class="deployable-fuel-icon"
                        :src="
                            fuel.iconPath
                                ? `${gameAssetsUrl}/ItemIcons/${fuel.iconPath}.png`
                                : `${gameAssetsUrl}/Images/question-mark.png`
                        "
                        :fallback-src="`${gameAssetsUrl}/Images/question-mark.png`"
                        :preview-disabled="true"
                    />
                    <span class="deployable-fuel-name">{{ fuel.displayName }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ArrowUp, Bolt, Box, Fire, Home, Industry, Tint, Wind } from '@vicons/fa';

import { GAME_ASSETS_URL } from '@/constants/common';

const VICON_MAP = {
    Bolt,
    Tint,
    Fire,
    Home,
    Wind,
    Industry,
    ArrowUp,
    Box,
};

const STATUS_TEXT = {
    required: 'Required',
    optional: 'Optional',
    produces: 'Produces',
    storage: 'Storage',
    internal: 'Internal',
};

export default {
    name: 'DeployableRuntimeBadges',
    props: {
        badges: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            gameAssetsUrl: GAME_ASSETS_URL,
            iconFailed: {},
        };
    },
    methods: {
        viconFor(name) {
            return VICON_MAP[name] ?? Box;
        },
        badgeClass(badge) {
            return {
                [`deployable-row--${badge.status}`]: Boolean(badge.status),
            };
        },
        statusText(badge) {
            return STATUS_TEXT[badge.status] ?? badge.status ?? '';
        },
        amountText(badge) {
            if (!badge.shortLabel) return '';
            return badge.unit ? `${badge.shortLabel}${badge.unit}` : badge.shortLabel;
        },
        onIconError(key) {
            this.iconFailed[key] = true;
        },
    },
};
</script>

<style scoped lang="scss">
.deployable-runtime {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.45rem;
    max-width: min(20rem, 46vw);
    text-align: right;
}

.deployable-row {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.28rem;
    width: 100%;
}

.deployable-row-main {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 0.35rem 0.45rem;
    padding: 0.2rem 0.55rem 0.2rem 0.4rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.22);
    color: rgba(255, 255, 255, 0.88);
    font-size: 0.78rem;
    line-height: 1.25;
}

.deployable-row--optional .deployable-row-main {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.14);
}

.deployable-row--internal .deployable-row-main {
    border-color: rgba(255, 255, 255, 0.12);
}

.deployable-row-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.05rem;
    height: 1.05rem;
    flex-shrink: 0;
}

.deployable-row-img {
    width: 1.05rem;
    height: 1.05rem;
    object-fit: contain;
}

.deployable-row-vicon {
    color: var(--badge-accent, rgba(255, 255, 255, 0.75));
}

.deployable-row-label {
    font-weight: 650;
    color: rgba(255, 255, 255, 0.92);
}

.deployable-row-status {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.62);
}

.deployable-row-amount {
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    color: var(--badge-accent, rgba(255, 255, 255, 0.85));
}

.deployable-row-hint {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.72rem;
}

.deployable-fuels {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.3rem;
    max-width: 100%;
}

.deployable-fuel {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    padding: 0.12rem 0.4rem 0.12rem 0.22rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.deployable-fuel-icon {
    border-radius: 4px;
    flex-shrink: 0;
}

.deployable-fuel-name {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.72);
    white-space: nowrap;
}
</style>
