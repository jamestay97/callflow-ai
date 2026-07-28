import { createDailyVideo } from "../src/pipeline.ts";

createDailyVideo(true)
  .then((r) => {
    console.log("DONE", r.videoPath);
  })
  .catch((e) => {
    console.error("FAIL", e);
    process.exitCode = 1;
  });
