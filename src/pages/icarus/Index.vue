<template>
    <n-config-provider :theme="darkTheme">
        <div>
            <Header></Header>
            <router-view></router-view>
        </div>
        <n-global-style></n-global-style>
    </n-config-provider>
</template>

<script>
import { NConfigProvider, NGlobalStyle, darkTheme } from 'naive-ui';

import Header from '@/pages/icarus/components/Header.vue';
import { useIcarusStore } from '@/store/icarus';

export default {
    name: 'App',
    components: {
        NConfigProvider,
        NGlobalStyle,
        Header,
    },
    data() {
        return {
            darkTheme,
        };
    },
    created() {
        useIcarusStore().loadRecipeData();
    },
};
</script>

<style lang="scss"></style>
