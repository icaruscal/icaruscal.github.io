import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import alias from '@rollup/plugin-alias';
import { resolve } from 'path';
import { dataCatalogPlugin } from './scripts/vite-data-catalog-plugin.js';

const outDir = resolve(__dirname, 'dist');
const projectRootDir = resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), alias(), dataCatalogPlugin()],
    resolve: {
        alias: {
            '@': resolve(projectRootDir, 'src'),
        },
    },
    build: {
        outDir,
        emptyOutDir: true,
    },
});
