const POSITIVE_CORRELATION_STAT_KEYS = new Set([
    'BaseArcticMovementSpeed_+%',
    'BaseAttackSpeed_+%',
    'BaseCaveHealthRegen_+%',
    'BaseCaveStaminaRegen_+%',
    'BaseChanceToReturnDamage_%',
    'BaseChargeSpeed_+%',
    'BaseColdResistance_%',
    'BaseCollisionDamageResistance_+%',
    'BaseCraftingSpeed_+%',
    'BaseCriticalDamage_+%',
    'BaseDamageReturned_%',
    'BaseDeepWoundResistance_%',
    'BaseDesertMovementSpeed_+%',
    'BaseExperience_+%',
    'BaseExplosiveDamage_+%',
    'BaseExposureResistance_+%',
    'BaseFallDamageResistance_%',
    'BaseFellingDamage_+%',
    'BaseFellingRewards_+%',
    'BaseFireDamageResistance_%',
    'BaseFireDamageResistanceWhileInLava_%',
    'BaseFoodModifierDuration_+%',
    'BaseFoodRecovery_+',
    'BaseForagingHarvestingRewards_+%',
    'BaseFrostDamageResistance_%',
    'BaseFrostbiteResistance_%',
    'BaseFruitAndVegeModifierEffectiveness_+%',
    'BaseHealthRecovery_+',
    'BaseHealthRegen_+%',
    'BaseHealthRegenPerMinute_+',
    'BaseHeatResistance_%',
    'BaseHeatstrokeResistance_%',
    'BaseHyperthermiaResistance_%',
    'BaseHypothermiaResistance_%',
    'BaseInfectedBarkPerWoodChopped_%',
    'BaseKnifeProjectileSpeed_+%',
    'BaseMaximumHealth_+',
    'BaseMaximumHealth_+%',
    'BaseMaximumStamina_+',
    'BaseMaximumStamina_+%',
    'BaseMeatHarvestedFromAnimals_+%',
    'BaseMeleeDamage_+%',
    'BaseMeleeDamageResistance_%',
    'BaseMiningRadius_+',
    'BaseMiningRewards_+%',
    'BaseMovementSpeed_+%',
    'BaseOxygenRecovery_+',
    'BasePhysicalDamageResistance_%',
    'BasePhysicalDamageResistance_+%',
    'BasePneumoniaResistance_%',
    'BasePoisonResistance_%',
    'BaseProjectileDamage_+%',
    'BaseProjectileDamageResistance_+%',
    'BasePyriticCrustPerMinedResource_%',
    'BaseReloadSpeed_+%',
    'BaseSharedExperience_+%',
    'BaseShieldBlock_+%',
    'BaseSpearProjectileSpeed_+%',
    'BaseSprintSpeed_+%',
    'BaseStaminaRecovery_+',
    'BaseStaminaRegen_+%',
    'BaseTamedCreatureExperience_+%',
    'BaseUnitsConsumed_+',
    'BaseVolcanicExposureResistance_+%',
    'BaseVolcanicHealthRegen_+%',
    'BaseVoxelChanceToHarvestSecondaryResource_%',
    'BaseWaterRecovery_+',
    'BaseWeightCapacity_+',
    'BaseWoundResistance_%',
    'GrantedAuraTamingSpeed_?',
]);

const NEGATIVE_CORRELATION_STAT_KEYS = new Set([
    'BaseAnimalThreatModifier_+%',
    'BaseBacterialModifierDuration_+%',
    'BaseFoodConsumption_+%',
    'BaseJumpingStaminaActionCost_+%',
    'BaseOverencumberedPenalty_+%',
    'BaseOxygenConsumption_+%',
    'BaseParasiticModifierDuration_+%',
    'BasePhysicalTraumaModifierDuration_+%',
    'BasePoisonModifierDuration_+%',
    'BaseStaminaActionCost_+%',
    'BaseStaminaRegenDelay_+%',
    'BaseToolStaminaActionCost_+%',
    'BaseWaterConsumption_+%',
]);

const NEUTRAL_STAT_KEYS = new Set([
    'BaseFoodStomachSlots_+',
    'BaseInternalTemperatureModification_+',
]);

export function getStatPolarity(key) {
    if (POSITIVE_CORRELATION_STAT_KEYS.has(key)) return 1;
    if (NEGATIVE_CORRELATION_STAT_KEYS.has(key)) return -1;
    if (NEUTRAL_STAT_KEYS.has(key)) return 0;
    return null;
}

export function hasStatPolarity(key) {
    return getStatPolarity(key) != null;
}

export function getStatEffectClass(stat) {
    const polarity = getStatPolarity(stat?.key);
    if (polarity == null || polarity === 0 || typeof stat?.value !== 'number') return '';

    const effect = stat.value * polarity;
    if (effect > 0) return 'is-pos';
    if (effect < 0) return 'is-neg';
    return '';
}
