import { RouteName } from '@/constants/router';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        name: RouteName.ICARUS,
        path: '/',
        title: 'Icarus',
        component: () => import('@/pages/icarus/Icarus.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
