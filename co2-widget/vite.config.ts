import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    lib: {
      entry: "src/index.tsx",
      name: "Co2Widget",
      fileName: (format) => `co2-widget.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // если будут внешние зависимости — вынесем сюда
      external: [],
    },
  },
});

