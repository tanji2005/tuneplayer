import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import AutoImport from "unplugin-auto-import/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";
import wasm from "vite-plugin-wasm";

const webPort = Number(process.env["VITE_WEB_PORT"] || 14558);

export default {
  root: ".",
  plugins: [
    vue(),
    AutoImport({
      imports: [
        "vue",
        "vue-router",
        "@vueuse/core",
        {
          "naive-ui": ["useDialog", "useMessage", "useNotification", "useLoadingBar"],
        },
      ],
      eslintrc: {
        enabled: true,
        filepath: "./auto-eslint.mjs",
      },
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    viteCompression(),
    wasm(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/"),
      "@emi": resolve(__dirname, "../native/external-media-integration"),
      "@shared": resolve(__dirname, "src/types/shared"),
      "@opencc": resolve(__dirname, "src/shims/opencc"),
      "@native": resolve(__dirname, "../native"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  server: {
    port: webPort,
  },
  preview: {
    port: webPort,
  },
  build: {
    outDir: "dist",
    minify: "terser",
    publicDir: resolve(__dirname, "public"),
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        loading: resolve(__dirname, "web/loading/index.html"),
      },
      output: {
        manualChunks: {
          stores: ["src/stores/data.ts", "src/stores/index.ts"],
        },
      },
    },
    terserOptions: {
      compress: {
        pure_funcs: ["console.log"],
      },
    },
    sourcemap: false,
  },
};
