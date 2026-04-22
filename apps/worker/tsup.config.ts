import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  target: "node20",
  outDir: "dist",
  clean: true,
  noExternal: [/@agent-control-plane\//]
});
