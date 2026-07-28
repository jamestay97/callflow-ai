import "dotenv/config";
import { createDailyVideo } from "../src/pipeline.js";

const r = await createDailyVideo(true);
console.log("DONE", r.videoPath);
