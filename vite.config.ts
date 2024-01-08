import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "z-animated-signature",
      fileName: "ZAnimatedSignature"
    },
  },
});
