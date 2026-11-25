const { spawnSync } = require("child_process");

const VALID_PLATFORMS = ["crazygames", "web"];
const VALID_COMMANDS = ["dev", "build", "start"];

function run() {
  const [, , platformArg, commandArg, ...extraArgs] = process.argv;

  if (!VALID_PLATFORMS.includes(platformArg)) {
    console.error(
      `Invalid platform "${platformArg ?? ""}". Expected one of: ${VALID_PLATFORMS.join(", ")}`
    );
    process.exit(1);
  }

  if (!VALID_COMMANDS.includes(commandArg)) {
    console.error(
      `Invalid command "${commandArg ?? ""}". Expected one of: ${VALID_COMMANDS.join(", ")}`
    );
    process.exit(1);
  }

  const nextBin = require.resolve("next/dist/bin/next");
  const result = spawnSync(process.execPath, [nextBin, commandArg, ...extraArgs], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_PLATFORM: platformArg,
    },
  });

  if (result.error) {
    console.error("Failed to launch Next.js CLI:", result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

run();
