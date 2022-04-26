import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            mqtt: 'mqtt/dist/mqtt.js',
            '@': resolve(__dirname, resolve('src')),
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            name: 'mqtt-vue3-hook',
            fileName: (format) => `mqtt-vue3-hook.${format}.js`,
        },
        rollupOptions: {
            external: ['vue', 'mqtt'],
        },
    },
})
