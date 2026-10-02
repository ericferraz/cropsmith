import { defineConfig } from "tsup";
import { readFile, writeFile } from "node:fs/promises";

/**
 * O editor é um Client Component. Bundlers removem a diretiva "use client" do
 * código-fonte ao empacotar, então a reinjetamos no topo dos arquivos do cliente
 * após o build — garantindo que o Next.js (App Router) a reconheça.
 */
async function injectUseClient() {
  for (const file of ["dist/index.js", "dist/index.cjs"]) {
    const code = await readFile(file, "utf8");
    if (!/^['"]use client['"]/.test(code)) {
      await writeFile(file, `"use client";\n${code}`);
    }
  }
}

const shared = {
  format: ["esm", "cjs"] as const,
  dts: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
};

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    clean: true,
    external: ["react", "react-dom", "cropperjs"],
    onSuccess: injectUseClient,
  },
  {
    ...shared,
    entry: { "server/index": "src/server/index.ts" },
    clean: false,
    external: ["sharp"],
  },
]);
