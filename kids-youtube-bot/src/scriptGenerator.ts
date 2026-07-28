import { VideoScript, VideoScriptSchema, animalToCharacter } from "./types.js";

const COLORS = ["#FFE066", "#FF9F69", "#6BCB77", "#4D96FF", "#C490E4", "#FF6B9D"];

const SHARING_TEMPLATE = {
  topic: "sharing",
  title: (animal: string) => `Learn to Share with ${animal}!`,
  hook: (animal: string) =>
    `Hi friends! Today we're going to learn about sharing with ${animal}!`,
  lesson: "Sharing makes everyone happy. When we share, we show kindness to our friends.",
  example: (animal: string) =>
    `${animal} had two yummy snacks. A friend came over with nothing to eat. So ${animal} shared one snack. Now both friends are smiling!`,
  recap: "Remember: sharing is caring. Try sharing something nice with someone you love today!",
};

const KINDNESS_TEMPLATE = {
  topic: "kindness",
  title: (animal: string) => `${animal} Learns Kindness`,
  hook: (animal: string) =>
    `Hello little learners! Let's follow ${animal} on a kindness adventure!`,
  lesson: "Kind words and kind actions can brighten someone's whole day.",
  example: (animal: string) =>
    `${animal} saw a friend feeling sad. ${animal} gave a hug and said, 'You are awesome!' The friend started to smile.`,
  recap: "You can be kind too! Say something nice or help someone today.",
};

const COLOR_TEMPLATE = {
  topic: "colors",
  title: (color: string) => `Let's Learn the Color ${color}!`,
  hook: (color: string) =>
    `Hey kids! Can you say ${color}? Let's explore everything that is ${color.toLowerCase()}!`,
  lesson: (color: string) =>
    `${color} is a beautiful color. Look around — can you spot something ${color.toLowerCase()}?`,
  example: (color: string) =>
    `A bright ${color.toLowerCase()} balloon floats in the sky. A ${color.toLowerCase()} flower grows in the garden. ${color} is everywhere!`,
  recap: (color: string) =>
    `Great job learning ${color}! Point to something ${color.toLowerCase()} near you right now!`,
};

const COUNTING_TEMPLATE = {
  topic: "counting",
  title: (n: number) => `Count to ${n} with Us!`,
  hook: (n: number) => `Ready to count? Let's count all the way to ${n} together!`,
  lesson: (_n: number) => `Counting helps us know how many things we have. Let's go!`,
  example: (n: number) => {
    const items = ["apple", "star", "duck", "ball", "flower", "cloud", "fish", "tree"];
    return Array.from({ length: n }, (_, i) => {
      const item = items[i % items.length];
      return `${i + 1} ${item}${i + 1 > 1 ? "s" : ""}!`;
    }).join(" ");
  },
  recap: (n: number) => `You counted to ${n}! Clap ${Math.min(n, 5)} times to celebrate!`,
};

const ANIMALS = ["Bunny", "Panda", "Dolphin", "Owl", "Fox", "Turtle", "Koala"];
const COLORS_LIST = ["Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function colorForIndex(i: number): string {
  return COLORS[i % COLORS.length]!;
}

function animalVisual(subject: string, action: string, background: string): string {
  return `cute ${subject.toLowerCase()} cartoon character ${action}, ${background}, chibi kids cartoon, bright colors`;
}

function buildSharingOrKindness(
  template: typeof SHARING_TEMPLATE | typeof KINDNESS_TEMPLATE,
  subject: string
): VideoScript {
  const lesson = template.lesson;
  const example = template.example(subject);
  const recap = template.recap;
  const character = animalToCharacter(subject);

  return {
    title: template.title(subject),
    description: `${lesson} A fun, educational story for preschoolers and toddlers. Made for kids.`,
    tags: ["kids", "learning", "preschool", "kindergarten", template.topic, "educational", "animals"],
    scenes: [
      {
        text: template.hook(subject),
        emoji: "👋",
        backgroundColor: colorForIndex(0),
        character,
        mood: "intro",
        visualPrompt: animalVisual(subject, "waving hello happily", "bright sunny playground with rainbow"),
      },
      {
        text: lesson,
        emoji: "💡",
        backgroundColor: colorForIndex(1),
        character,
        mood: "lesson",
        music: "none",
        visualPrompt: animalVisual(subject, "teaching kids cheerfully", "colorful classroom garden"),
      },
      {
        text: example,
        emoji: "⭐",
        backgroundColor: colorForIndex(2),
        character,
        mood: "story",
        visualPrompt: animalVisual(subject, "sharing snacks with a friend animal", "magical candy-colored forest"),
      },
      {
        text: recap,
        emoji: "🎉",
        backgroundColor: colorForIndex(3),
        character,
        mood: "celebrate",
        visualPrompt: animalVisual(subject, "jumping for joy with confetti", "party meadow with balloons"),
      },
      {
        text: "Thanks for watching! Don't forget to ask a grown-up to subscribe for more learning fun!",
        emoji: "❤️",
        backgroundColor: colorForIndex(4),
        character,
        mood: "outro",
        visualPrompt: animalVisual(subject, "waving goodbye warmly", "golden sunset hill with flowers"),
      },
    ],
  };
}

function buildColorVideo(color: string): VideoScript {
  const template = COLOR_TEMPLATE;
  return {
    title: template.title(color),
    description: `Learn the color ${color} with bright examples and simple words. Perfect for toddlers and preschoolers.`,
    tags: ["colors", "kids", "learning", color.toLowerCase(), "preschool", "toddlers", "animals"],
    scenes: [
      {
        text: template.hook(color),
        emoji: "🎨",
        backgroundColor: colorForIndex(0),
        character: "star",
        mood: "intro",
        visualPrompt: `cute glowing star character waving, lots of ${color.toLowerCase()} toys and balloons, bright kids cartoon`,
      },
      {
        text: template.lesson(color),
        emoji: "👀",
        backgroundColor: colorForIndex(1),
        character: "star",
        mood: "lesson",
        music: "none",
        visualPrompt: `cute star character pointing at ${color.toLowerCase()} objects, colorful classroom, kids cartoon`,
      },
      {
        text: template.example(color),
        emoji: "🌈",
        backgroundColor: colorForIndex(2),
        character: "duck",
        mood: "story",
        visualPrompt: `cute yellow duckling with ${color.toLowerCase()} balloons and flowers, bright playground, kids cartoon`,
      },
      {
        text: template.recap(color),
        emoji: "✨",
        backgroundColor: colorForIndex(3),
        character: "bunny",
        mood: "celebrate",
        visualPrompt: `cute bunny celebrating with ${color.toLowerCase()} confetti, party meadow, bright kids cartoon`,
      },
      {
        text: "See you next time, color explorers!",
        emoji: "👋",
        backgroundColor: colorForIndex(4),
        character: "buddy",
        mood: "outro",
        visualPrompt: `friendly blue cartoon mascot waving goodbye, ${color.toLowerCase()} sunset sky, kids cartoon`,
      },
    ],
  };
}

function buildCountingVideo(n: number): VideoScript {
  const template = COUNTING_TEMPLATE;
  return {
    title: template.title(n),
    description: `Practice counting to ${n} with fun objects. Educational math for young children.`,
    tags: ["counting", "numbers", "math", "kids", "preschool", "learning", "animals"],
    scenes: [
      {
        text: template.hook(n),
        emoji: "🔢",
        backgroundColor: colorForIndex(0),
        character: "duck",
        mood: "intro",
        visualPrompt: `cute yellow duckling waving near big number ${n}, bright playground, kids cartoon`,
      },
      {
        text: template.lesson(n),
        emoji: "👉",
        backgroundColor: colorForIndex(1),
        character: "duck",
        mood: "lesson",
        music: "none",
        visualPrompt: `cute duckling teaching counting with colorful blocks, kids classroom, bright cartoon`,
      },
      {
        text: template.example(n),
        emoji: "🍎",
        backgroundColor: colorForIndex(2),
        character: "duck",
        mood: "story",
        visualPrompt: `cute duckling counting ${n} colorful apples and stars, candy forest, kids cartoon`,
      },
      {
        text: template.recap(n),
        emoji: "👏",
        backgroundColor: colorForIndex(3),
        character: "duck",
        mood: "celebrate",
        visualPrompt: `cute duckling celebrating counting to ${n} with confetti, party meadow, kids cartoon`,
      },
      {
        text: "Keep counting every day — you're doing amazing!",
        emoji: "🌟",
        backgroundColor: colorForIndex(4),
        character: "duck",
        mood: "outro",
        visualPrompt: `cute duckling waving goodbye under starry sunset, bright kids cartoon`,
      },
    ],
  };
}

function generateFromTemplates(): VideoScript {
  const roll = Math.random();
  if (roll < 0.35) {
    return buildSharingOrKindness(SHARING_TEMPLATE, pick(ANIMALS));
  }
  if (roll < 0.65) {
    return buildSharingOrKindness(KINDNESS_TEMPLATE, pick(ANIMALS));
  }
  if (roll < 0.85) {
    return buildColorVideo(pick(COLORS_LIST));
  }
  return buildCountingVideo(pick([5, 6, 7, 8]));
}

async function generateWithGemini(apiKey: string): Promise<VideoScript | null> {
  const prompt = `Create a short educational video script for kids ages 3-6.
Return ONLY valid JSON with this shape:
{
  "title": "string (max 60 chars)",
  "description": "string (YouTube description, mention it's for kids)",
  "tags": ["array", "of", "strings"],
  "scenes": [
    {
      "text": "narration (1-3 short sentences)",
      "emoji": "single emoji",
      "backgroundColor": "#hex color",
      "character": "bunny|panda|dolphin|owl|fox|turtle|koala|buddy|duck|star",
      "mood": "intro|lesson|story|celebrate|outro",
      "music": "upbeat|calm|celebrate|none (optional)",
      "visualPrompt": "short visual description of a cute animal cartoon scene (bright colors, kids show)"
    }
  ]
}
Requirements:
- 4 to 6 scenes
- Positive, age-appropriate content only
- Simple vocabulary
- No brands, violence, or scary content
- Each scene text should take about 8-15 seconds to read aloud`;

  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`Gemini (${model}): quota exceeded — using built-in templates instead.`);
        } else {
          console.warn(`Gemini (${model}): request failed (${res.status}).`);
        }
        continue;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) continue;

      const parsed = VideoScriptSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        console.log(`Script generated with Gemini (${model}).`);
        return parsed.data;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function generateScript(geminiApiKey?: string): Promise<VideoScript> {
  if (geminiApiKey) {
    const aiScript = await generateWithGemini(geminiApiKey);
    if (aiScript) return aiScript;
  } else {
    console.log("No GEMINI_API_KEY set — using built-in templates.");
  }
  console.log("Using built-in story template.");
  return generateFromTemplates();
}
