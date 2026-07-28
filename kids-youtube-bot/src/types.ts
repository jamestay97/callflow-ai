import { z } from "zod";

export const SceneMoodSchema = z.enum(["intro", "lesson", "story", "celebrate", "outro"]);
export const MusicTrackSchema = z.enum(["upbeat", "calm", "celebrate", "none"]);
export const CharacterIdSchema = z.enum([
  "bunny",
  "panda",
  "dolphin",
  "owl",
  "fox",
  "turtle",
  "koala",
  "buddy",
  "duck",
  "star",
]);

export const SceneSchema = z.object({
  text: z.string(),
  emoji: z.string().optional(),
  backgroundColor: z.string().optional(),
  character: CharacterIdSchema.optional(),
  mood: SceneMoodSchema.optional(),
  music: MusicTrackSchema.optional(),
  /** Optional AI image/video prompt override for this scene */
  visualPrompt: z.string().optional(),
});

export const VideoScriptSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  scenes: z.array(SceneSchema).min(3),
});

export type SceneMood = z.infer<typeof SceneMoodSchema>;
export type MusicTrack = z.infer<typeof MusicTrackSchema>;
export type CharacterId = z.infer<typeof CharacterIdSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;

export function resolveSceneMusic(scene: Scene): MusicTrack {
  if (scene.music) return scene.music;
  switch (scene.mood) {
    case "intro":
    case "outro":
      return "upbeat";
    case "celebrate":
      return "celebrate";
    case "lesson":
    case "story":
      return "calm";
    default:
      return "none";
  }
}

export function shouldAnimateScene(scene: Scene): boolean {
  return scene.mood !== "lesson";
}

export function animalToCharacter(animal: string): CharacterId {
  const key = animal.toLowerCase() as CharacterId;
  if (CharacterIdSchema.safeParse(key).success) return key;
  return "buddy";
}
