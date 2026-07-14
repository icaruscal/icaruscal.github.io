<template>
    <div class="quantity-stepper flex align-items-center">
        <button
            type="button"
            class="step-btn"
            :disabled="modelValue <= min"
            aria-label="Decrease count"
            :title="`Decrease (Shift: -${shiftStep})`"
            @click.stop="adjust($event, -1)"
        >
            <n-icon size="10">
                <Minus />
            </n-icon>
        </button>
        <input
            class="quantity-input"
            type="text"
            inputmode="numeric"
            :value="modelValue"
            @change="onInputCommit"
            @keydown.enter.prevent="onInputCommit"
        />
        <button
            type="button"
            class="step-btn"
            :disabled="modelValue >= max"
            aria-label="Increase count"
            :title="`Increase (Shift: +${shiftStep})`"
            @click.stop="adjust($event, 1)"
        >
            <n-icon size="10">
                <Plus />
            </n-icon>
        </button>
    </div>
</template>

<script>
import { Minus, Plus } from '@vicons/fa';

export default {
    name: 'QuantityStepper',
    components: {
        Minus,
        Plus,
    },
    props: {
        modelValue: {
            type: Number,
            required: true,
        },
        min: {
            type: Number,
            default: 0,
        },
        max: {
            type: Number,
            default: 100000,
        },
        step: {
            type: Number,
            default: 1,
        },
        shiftStep: {
            type: Number,
            default: 5,
        },
    },
    emits: ['update:modelValue'],
    methods: {
        clamp(value) {
            const parsed = Number.isFinite(value) ? Math.trunc(value) : this.min;
            return Math.min(Math.max(this.min, parsed), this.max);
        },
        emitValue(value) {
            this.$emit('update:modelValue', this.clamp(value));
        },
        adjust(event, direction) {
            const amount = event.shiftKey ? this.shiftStep : this.step;
            this.emitValue(this.modelValue + direction * amount);
        },
        onInputCommit(event) {
            const parsed = Number.parseInt(event.target?.value, 10);
            const next = this.clamp(Number.isFinite(parsed) ? parsed : this.min);
            this.emitValue(next);
            event.target.value = String(next);
        },
    },
};
</script>

<style scoped lang="scss">
.quantity-stepper {
    height: 1.4rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    overflow: hidden;
    color: inherit;
}

.step-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.15rem;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.85;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
        opacity: 0.35;
        cursor: default;
    }
}

.quantity-input {
    width: 2.5rem;
    height: 100%;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.14);
    border-right: 1px solid rgba(255, 255, 255, 0.14);
    background: transparent;
    color: inherit;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
    outline: none;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
}
</style>
