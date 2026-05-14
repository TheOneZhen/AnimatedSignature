import { resolve } from "node:path";
import { UserConfig, defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const config: UserConfig = {
    resolve: {
      alias: {
        "signature_pad/src/bezier": resolve(
          __dirname,
          "node_modules/signature_pad/src/bezier.ts"
        ),
        "signature_pad/src/point": resolve(
          __dirname,
          "node_modules/signature_pad/src/point.ts"
        ),
        "signature_pad/src/signature_event_target": resolve(
          __dirname,
          "node_modules/signature_pad/src/signature_event_target.ts"
        ),
        "signature_pad/src/throttle": resolve(
          __dirname,
          "node_modules/signature_pad/src/throttle.ts"
        ),
      },
    },
  };
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
