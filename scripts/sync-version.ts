import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, "..");
const PACKAGE_JSON_PATH = join(ROOT_DIR, "package.json");
const VERSION_JSON_PATH = join(ROOT_DIR, "src/version.json");

const syncVersion = async (): Promise<void> => {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, "utf-8"));
  const { version } = packageJson;

  const versionJson = { version };

  await writeFile(
    VERSION_JSON_PATH,
    JSON.stringify(versionJson, null, 2) + "\n",
  );

  console.log(`Synced version: ${version}`);
};

syncVersion().catch((error) => {
  console.error("Failed to sync version:", error);
  process.exit(1);
});
