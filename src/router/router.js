import { RouteName } from '@/constants/router';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        name: RouteName.CALCULATOR,
        path: '/',
        component: () => import('@/pages/icarus/Icarus.vue'),
    },
    {
        name: RouteName.CONSUMABLES,
        path: '/consumables',
        component: () => import('@/pages/icarus/ConsumablesExplore.vue'),
    },
    {
        name: RouteName.GEAR,
        path: '/gear',
        component: () => import('@/pages/icarus/GearExplore.vue'),
    },
    {
        path: '/explore',
        redirect: (to) => ({ path: '/consumables', query: to.query }),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
