import { fileURLToPath } from "node:url";

export default {
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/content.ts", import.meta.url)),
      formats: ["iife"],
      name: "SignBridgeContent",
      fileName: () => "content.js",
    },
    minify: false,
    outDir: fileURLToPath(new URL("./", import.meta.url)),
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
};
