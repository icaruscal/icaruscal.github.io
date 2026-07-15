import { RouteName } from '@/constants/router';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        name: RouteName.CALCULATOR,
        path: '/',
        component: () => import('@/pages/icarus/Icarus.vue'),
    },
    {
        name: RouteName.EXPLORE,
        path: '/explore',
        component: () => import('@/pages/icarus/FoodExplore.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
