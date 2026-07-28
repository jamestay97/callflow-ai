import "dotenv/config";
import { authenticateYouTube, printStatus, runDailyJob, runSetupCheck, startAutomation } from "./automation.js";
import { startDashboard } from "./dashboard.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "app";
  const force = process.argv.includes("--force");

  switch (command) {
    case "app":
    case "dashboard":
      await startDashboard();
      break;

    case "test:launch":
      {
        const { runTestLaunch } = await import("./testLaunch.js");
        await runTestLaunch();
      }
      break;

    case "test:prepare":
      {
        const { prepareTestLaunch } = await import("./testLaunch.js");
        await prepareTestLaunch(force);
      }
      break;

    case "create": {
      const { createDailyVideo } = await import("./pipeline.js");
      await createDailyVideo(force);
      break;
    }

    case "upload": {
      const { uploadTodayVideo } = await import("./pipeline.js");
      await uploadTodayVideo(force);
      break;
    }

    case "run": {
      const result = await runDailyJob({ force });
      if (result.status === "failed") process.exit(1);
      break;
    }

    case "start":
      await startAutomation();
      break;

    case "auth":
      await authenticateYouTube();
      break;

    case "setup": {
      const ok = await runSetupCheck();
      if (!ok) process.exit(1);
      break;
    }

    case "status":
      await printStatus();
      break;

    default:
      console.log(`
Kids YouTube Studio

  npm run app        Open the visual app (recommended)
  npm run run        Create + upload once from terminal
  npm start          Full daily automation
  npm run auth       Connect YouTube from terminal
  npm run setup      Check configuration
  npm run status     Show connection status
`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
