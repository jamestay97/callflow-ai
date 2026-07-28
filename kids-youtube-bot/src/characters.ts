import type { CharacterId, SceneMood } from "./types.js";

const WIDTH = 1280;
const HEIGHT = 720;

export interface AnimationState {
  bodyY: number;
  bodyRotate: number;
  armRotate: number;
  scale: number;
  blink: boolean;
  sparkle: boolean;
}

export function getAnimationState(mood: SceneMood, progress: number): AnimationState {
  const t = progress * Math.PI * 2;

  switch (mood) {
    case "intro":
      return {
        bodyY: Math.sin(t * 2) * 18,
        bodyRotate: Math.sin(t) * 4,
        armRotate: -25 + Math.sin(t * 3) * 18,
        scale: 1 + Math.sin(t * 2) * 0.04,
        blink: progress % 0.15 < 0.02,
        sparkle: false,
      };
    case "celebrate":
      return {
        bodyY: Math.abs(Math.sin(t * 3)) * -28,
        bodyRotate: Math.sin(t * 2) * 8,
        armRotate: -55 + Math.sin(t * 4) * 35,
        scale: 1 + Math.sin(t * 3) * 0.06,
        blink: false,
        sparkle: true,
      };
    case "outro":
      return {
        bodyY: Math.sin(t * 1.5) * 10,
        bodyRotate: Math.sin(t) * 3,
        armRotate: -40 + Math.sin(t * 2) * 22,
        scale: 1,
        blink: progress % 0.2 < 0.02,
        sparkle: false,
      };
    case "story":
      return {
        bodyY: Math.sin(t * 1.2) * 8,
        bodyRotate: Math.sin(t * 1.5) * 6,
        armRotate: Math.sin(t * 2) * 12,
        scale: 1,
        blink: progress % 0.18 < 0.02,
        sparkle: false,
      };
    default:
      return {
        bodyY: Math.sin(t) * 5,
        bodyRotate: 0,
        armRotate: 8,
        scale: 1,
        blink: progress % 0.22 < 0.02,
        sparkle: false,
      };
  }
}

function characterLayers(id: CharacterId): {
  body: string;
  accent: string;
  feature: string;
} {
  switch (id) {
    case "bunny":
      return { body: "#F5F0E8", accent: "#FFB6C1", feature: "#FFE066" };
    case "panda":
      return { body: "#FFFFFF", accent: "#2D2D2D", feature: "#90EE90" };
    case "dolphin":
      return { body: "#7EC8E3", accent: "#4A90A4", feature: "#B8F2FF" };
    case "owl":
      return { body: "#C4A882", accent: "#5D4037", feature: "#FFD54F" };
    case "fox":
      return { body: "#FF8C42", accent: "#FFFFFF", feature: "#FF6B35" };
    case "turtle":
      return { body: "#6BCB77", accent: "#2E7D32", feature: "#A5D6A7" };
    case "koala":
      return { body: "#B0BEC5", accent: "#78909C", feature: "#ECEFF1" };
    case "duck":
      return { body: "#FFE066", accent: "#FF9F69", feature: "#FF6B6B" };
    case "star":
      return { body: "#FFD93D", accent: "#FF6B9D", feature: "#6BCB77" };
    default:
      return { body: "#4D96FF", accent: "#FFFFFF", feature: "#FFE066" };
  }
}

function drawCharacter(id: CharacterId, anim: AnimationState): string {
  const colors = characterLayers(id);
  const cx = 640;
  const cy = 250 + anim.bodyY;
  const scale = anim.scale;
  const eyeOpen = anim.blink ? 1 : 6;
  const arm = anim.armRotate;

  const transform = `translate(${cx} ${cy}) scale(${scale}) rotate(${anim.bodyRotate})`;

  const ears: Record<CharacterId, string> = {
    bunny: `<ellipse cx="-35" cy="-72" rx="16" ry="42" fill="${colors.body}" stroke="${colors.accent}" stroke-width="3"/>
            <ellipse cx="35" cy="-72" rx="16" ry="42" fill="${colors.body}" stroke="${colors.accent}" stroke-width="3"/>`,
    panda: `<circle cx="-38" cy="-58" r="24" fill="${colors.accent}"/><circle cx="38" cy="-58" r="24" fill="${colors.accent}"/>`,
    dolphin: `<path d="M 0 -85 Q 25 -55 0 -35" fill="${colors.accent}" opacity="0.8"/>`,
    owl: `<polygon points="-30,-78 -18,-98 -6,-78" fill="${colors.accent}"/>
          <polygon points="6,-78 18,-98 30,-78" fill="${colors.accent}"/>`,
    fox: `<polygon points="-34,-76 -22,-98 -8,-76" fill="${colors.body}"/>
          <polygon points="8,-76 22,-98 34,-76" fill="${colors.body}"/>
          <polygon points="48,20 78,8 58,38" fill="${colors.accent}"/>`,
    turtle: `<ellipse cx="0" cy="-10" rx="78" ry="58" fill="${colors.accent}" opacity="0.35"/>
            <circle cx="-30" cy="-18" r="8" fill="${colors.feature}" opacity="0.5"/>
            <circle cx="20" cy="2" r="8" fill="${colors.feature}" opacity="0.5"/>
            <circle cx="35" cy="-22" r="8" fill="${colors.feature}" opacity="0.5"/>`,
    koala: `<circle cx="-42" cy="-62" r="26" fill="${colors.accent}"/><circle cx="42" cy="-62" r="26" fill="${colors.accent}"/>`,
    duck: `<ellipse cx="0" cy="-70" rx="18" ry="10" fill="${colors.accent}"/>`,
    star: `<polygon points="0,-88 18,-28 82,-28 28,8 48,68 0,32 -48,68 -28,8 -82,-28 -18,-28" fill="${colors.feature}" opacity="0.85"/>`,
    buddy: `<circle cx="-50" cy="-40" r="12" fill="${colors.feature}" opacity="0.5"/>
            <circle cx="50" cy="-40" r="12" fill="${colors.feature}" opacity="0.5"/>`,
  };

  const snout: Record<CharacterId, string> = {
    bunny: `<ellipse cx="0" cy="12" rx="10" ry="8" fill="${colors.accent}"/>`,
    panda: `<ellipse cx="0" cy="14" rx="14" ry="10" fill="${colors.accent}"/>`,
    dolphin: `<ellipse cx="0" cy="8" rx="18" ry="10" fill="${colors.accent}"/>`,
    owl: `<polygon points="-8,18 0,28 8,18" fill="${colors.accent}"/>`,
    fox: `<polygon points="-10,16 0,26 10,16" fill="${colors.accent}"/>`,
    turtle: `<circle cx="0" cy="48" r="22" fill="${colors.body}"/>`,
    koala: `<ellipse cx="0" cy="16" rx="16" ry="12" fill="${colors.accent}"/>`,
    duck: `<polygon points="-12,14 0,24 12,14" fill="${colors.accent}"/>`,
    star: "",
    buddy: `<circle cx="0" cy="12" r="10" fill="${colors.accent}"/>`,
  };

  const sparkles = anim.sparkle
    ? `<text x="-120" y="-40" font-size="36" opacity="0.9">✨</text>
       <text x="100" y="-20" font-size="28" opacity="0.8">⭐</text>
       <text x="130" y="40" font-size="32" opacity="0.85">🎉</text>`
    : "";

  return `
    <g transform="${transform}">
      ${ears[id] ?? ""}
      <ellipse cx="0" cy="20" rx="58" ry="64" fill="${colors.body}" stroke="${colors.accent}" stroke-width="4"/>
      <circle cx="0" cy="-38" r="48" fill="${colors.body}" stroke="${colors.accent}" stroke-width="4"/>
      <circle cx="-18" cy="-44" r="7" fill="#1a1a2e"/>
      <circle cx="18" cy="-44" r="7" fill="#1a1a2e"/>
      <ellipse cx="-18" cy="-46" rx="3" ry="${eyeOpen}" fill="#1a1a2e"/>
      <ellipse cx="18" cy="-46" rx="3" ry="${eyeOpen}" fill="#1a1a2e"/>
      <path d="M -16 -24 Q 0 -12 16 -24" fill="none" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round"/>
      ${snout[id] ?? ""}
      <g transform="rotate(${arm} 42 8)">
        <ellipse cx="58" cy="8" rx="16" ry="10" fill="${colors.body}" stroke="${colors.accent}" stroke-width="3"/>
      </g>
      <g transform="rotate(${-arm * 0.5} -42 8)">
        <ellipse cx="-58" cy="8" rx="16" ry="10" fill="${colors.body}" stroke="${colors.accent}" stroke-width="3"/>
      </g>
    </g>
    ${sparkles}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapText(text: string, maxChars = 40): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export function buildAnimatedFrameSvg(options: {
  backgroundColor: string;
  lines: string[];
  emoji: string;
  character: CharacterId;
  mood: SceneMood;
  progress: number;
}): string {
  const anim = getAnimationState(options.mood, options.progress);
  const textBlocks = options.lines
    .map(
      (line, i) =>
        `<text x="640" y="${470 + i * 48}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#1a1a2e">${escapeXml(line)}</text>`
    )
    .join("\n");

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${options.backgroundColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.25"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="180" cy="120" r="50" fill="white" opacity="0.2"/>
  <circle cx="1100" cy="580" r="70" fill="white" opacity="0.15"/>
  ${drawCharacter(options.character, anim)}
  <text x="1080" y="90" font-size="64">${options.emoji}</text>
  ${textBlocks}
</svg>`;
}

export const FRAME_WIDTH = WIDTH;
export const FRAME_HEIGHT = HEIGHT;
