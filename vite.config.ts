import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from './plugins/dts'
import * as istanbul from 'vite-plugin-istanbul'

export default defineConfig({
    plugins: [
        vue(),
        dts(),
        istanbul({
            include: 'src/*',
            exclude: ['node_modules', 'test/'],
            extension: ['.js', '.ts', '.vue', '.mjs'],
            requireEnv: true,
        }),
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
            external: ['vue'],
        },
    },
})
