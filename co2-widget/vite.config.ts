import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Co2Widget",
      fileName: (format) => `co2-widget.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // В библиотеке обычно нет внешних зависимостей; если появятся — вынести сюда
      external: [],
    },
  },
});
