import chalk from "chalk";
import type { Provider as ProviderName } from "@/types/index";
import { getProvider } from "@providers/index.ts";

export const showModels = async (
  currentProvider: ProviderName,
  currentModel: string | undefined,
): Promise<void> => {
  const provider = getProvider(currentProvider);
  const models = await provider.getModels();
  const activeModel = currentModel || "auto";
  const isAutoSelected = activeModel === "auto";

  console.log(`\n${chalk.bold(provider.displayName + " Models")}\n`);

  // Show "auto" option first
  const autoMarker = isAutoSelected ? chalk.cyan("→") : " ";
  console.log(
    `${autoMarker} ${chalk.cyan("auto")} - Let API choose the best model`,
  );

  for (const model of models) {
    const isCurrent = model.id === activeModel;
    const marker = isCurrent ? chalk.cyan("→") : " ";

    console.log(`${marker} ${chalk.cyan(model.id)} - ${model.name}`);
  }

  console.log("\n" + chalk.gray("Use /model <name> to switch"));
  console.log();
};
