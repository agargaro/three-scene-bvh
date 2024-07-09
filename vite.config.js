import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    build: {
        minify: 'esbuild',
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'BVH',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['three'],
        },
    },
    plugins: [dts()]
})
