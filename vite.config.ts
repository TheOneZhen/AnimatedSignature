import { resolve } from "node:path";
import { UserConfig, defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const config: UserConfig = {};
  if (command === "serve") {
    config.root = resolve(__dirname, "site");
    config.server = {
      fs: {
        allow: [__dirname],
      },
    };
  }

  if (command === "build") {
    config.build = {
      lib: {
        entry: resolve(__dirname, "src/animatedSignature.ts"),
        name: "animated-signature",
        fileName: "AnimatedSignature",
      },
    };
  }

  return config;
});
