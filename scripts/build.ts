#!/usr/bin/env bun
/**
 * Build script for codetyper-cli
 *
 * Uses the @opentui/solid plugin for JSX transformation during bundling.
 */

import solidPlugin from "../node_modules/@opentui/solid/scripts/solid-plugin";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile, writeFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

process.chdir(ROOT_DIR);

// Sync version before building
const syncVersion = async (): Promise<void> => {
  const packageJson = JSON.parse(
    await readFile(join(ROOT_DIR, "package.json"), "utf-8"),
  );
  const { version } = packageJson;

  await writeFile(
    join(ROOT_DIR, "src/version.json"),
    JSON.stringify({ version }, null, 2) + "\n",
  );

  console.log(`Synced version: ${version}`);
};

await syncVersion();

// Build the application
console.log("Building codetyper-cli...");

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  conditions: ["node"],
  plugins: [solidPlugin],
  sourcemap: "external",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Update shebang to use node
const distPath = join(ROOT_DIR, "dist/index.js");
let distContent = await readFile(distPath, "utf-8");
distContent = distContent.replace(/^#!.*\n/, "#!/usr/bin/env node\n");
await writeFile(distPath, distContent);

console.log("Build completed successfully!");
