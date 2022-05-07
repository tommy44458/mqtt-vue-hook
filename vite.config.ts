import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from './plugins/dts'

export default defineConfig({
    plugins: [
        dts(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, resolve('src')),
            mqtt: 'mqtt/dist/mqtt.js',
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/mqtt-vue-hook.ts'),
            name: 'mqtt-vue-hook',
            formats: ['es'],
            fileName: 'mqtt-vue-hook',
        },
        rollupOptions: {
        },
    },
})
