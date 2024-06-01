import path from "path";
import { defineConfig } from "vite";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import typescript from "@rollup/plugin-typescript";
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
    build: {
        minify: true,
        reportCompressedSize: true,
        lib: {
            entry: path.resolve(__dirname, "src/index.ts"),
            name: "log-panel",
            fileName: (format) => `index.${format}.js`,
            formats: ["es", "cjs"],    
        },
        rollupOptions: {
            external: [],
            plugins: [
                cssInjectedByJsPlugin(),
                typescriptPaths({
                    preserveExtensions: true
                }),
                typescript(
                    {
                        sourceMap: false,
                        declaration: true,
                        outDir: "dist",
                    }
                ),
                // dts()
            ],
        },
        //Clears the output directory before building.
        emptyOutDir: true,
    },
});