import { fileURLToPath } from "node:url";

export default {
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/background.ts", import.meta.url)),
      formats: ["iife"],
      name: "SignBridgeBackground",
      fileName: () => "background.js",
    },
    minify: false,
    outDir: fileURLToPath(new URL("./", import.meta.url)),
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
};
