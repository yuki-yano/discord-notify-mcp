import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/main.ts"],
  format: ["esm"],
  target: "node18",
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
