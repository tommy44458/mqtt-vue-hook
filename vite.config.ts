import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            mqtt: 'mqtt/dist/mqtt.js',
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'mqtt-vue-hook.ts'),
            name: 'mqtt-vue-hook',
            formats: ['es'],
            fileName: 'mqtt-vue-hook',
        },
        rollupOptions: {
            external: ['vue'],
        },
    },
})
