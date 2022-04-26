import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [vue(), dts()],
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
