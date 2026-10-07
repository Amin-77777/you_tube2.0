/**
 * Real-time timed subtitle cues for videos
 */

export interface CaptionCue {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface VideoCaptionTrack {
  videoIdOrKeyword: string;
  language: string;
  label: string;
  cues: CaptionCue[];
}

export const REALTIME_CAPTION_TRACKS: VideoCaptionTrack[] = [
  // 1. Urban Street Style & Everyday Bag Tour (and nature/movie sample)
  {
    videoIdOrKeyword: "urban",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 4, text: "Welcome back! Today we are exploring urban everyday style and gear." },
      { start: 4, end: 8, text: "Taking a closer look at premium materials, water resistance, and craftsmanship." },
      { start: 8, end: 13, text: "Notice the attention to stitching along the edges and reinforced straps." },
      { start: 13, end: 18, text: "It easily fits a 15-inch laptop, camera gear, and your daily essentials." },
      { start: 18, end: 24, text: "The ergonomic design ensures balanced weight distribution while commuting." },
      { start: 24, end: 31, text: "Check out the description for full specifications and styling tips." },
    ],
  },
  {
    videoIdOrKeyword: "urban",
    language: "es",
    label: "Español",
    cues: [
      { start: 0, end: 4, text: "¡Bienvenidos! Hoy exploramos el estilo urbano y accesorios cotidianos." },
      { start: 4, end: 8, text: "Echemos un vistazo a los materiales premium y la resistencia al agua." },
      { start: 8, end: 13, text: "Observa la atención a las costuras a lo largo de los bordes reforzados." },
      { start: 13, end: 18, text: "Cabe fácilmente una laptop de 15 pulgadas y artículos esenciales." },
      { start: 18, end: 24, text: "El diseño ergonómico asegura comodidad durante el viaje diario." },
      { start: 24, end: 31, text: "Consulta la descripción para ver todos los detalles y especificaciones." },
    ],
  },

  // 2. Big Buck Bunny
  {
    videoIdOrKeyword: "bunny",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 4, text: "[Upbeat playful orchestral music playing]" },
      { start: 4, end: 9, text: "A peaceful morning in the forest as the sun rises gently." },
      { start: 9, end: 15, text: "Big Buck Bunny emerges from his burrow to enjoy the blooming flowers." },
      { start: 15, end: 22, text: "A vibrant butterfly flutters through the green meadow." },
      { start: 22, end: 28, text: "Suddenly, mischievous critters appear up in the branches!" },
      { start: 28, end: 33, text: "[Dramatic brass fanfare and cheerful nature sounds]" },
    ],
  },
  {
    videoIdOrKeyword: "bunny",
    language: "es",
    label: "Español",
    cues: [
      { start: 0, end: 4, text: "[Música orquestal alegre sonando]" },
      { start: 4, end: 9, text: "Una mañana pacífica en el bosque mientras sale el sol." },
      { start: 9, end: 15, text: "Big Buck Bunny sale de su madriguera para disfrutar de las flores." },
      { start: 15, end: 22, text: "Una colorida mariposa vuela por el verde prado." },
      { start: 22, end: 28, text: "¡De repente, traviesas criaturas aparecen en los árboles!" },
      { start: 28, end: 33, text: "[Fanfarria dramática y sonidos de la naturaleza]" },
    ],
  },

  // 3. Deep Ocean Bioluminescent Jellyfish
  {
    videoIdOrKeyword: "jellyfish",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 3, text: "[Atmospheric ambient deep ocean sounds]" },
      { start: 3, end: 7, text: "Witness the mesmerizing glow of bioluminescent jellyfish drifting in the abyss." },
      { start: 7, end: 10, text: "These creatures produce natural illumination through specialized chemical reactions." },
    ],
  },

  // 4. Sintel
  {
    videoIdOrKeyword: "sintel",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 4, text: "Through the freezing mountain passes, a solitary wanderer battles the storm." },
      { start: 4, end: 8, text: "Searching tirelessly across uncharted lands for a lost companion." },
      { start: 8, end: 10, text: "[Distant roar echoes across the snowy peaks]" },
    ],
  },

  // 5. Retro Groove: 80s Synthwave
  {
    videoIdOrKeyword: "retro",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 6, text: "[Analog synthesizer arpeggios pulsing]" },
      { start: 6, end: 15, text: "Cruising down the neon highway into the retro digital horizon." },
      { start: 15, end: 25, text: "[Heavy 80s drum groove drops with bassline]" },
      { start: 25, end: 35, text: "Vibrant laser grids and nostalgic synth melodies reverberating." },
      { start: 35, end: 45, text: "[Fading synthesizer chords and rhythmic beats]" },
    ],
  },

  // 6. Introduction to YourTube
  {
    videoIdOrKeyword: "intro",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 5, text: "Welcome to YourTube 2.0, the next-generation video streaming platform!" },
      { start: 5, end: 12, text: "Enjoy seamless 4K playback, customized HTML5 controls, and offline downloads." },
      { start: 12, end: 20, text: "Support your favorite channels, save watch history, and connect with creators." },
      { start: 20, end: 30, text: "Start streaming your favorite content today!" },
    ],
  },

  // 7. Modern City Night Drive
  {
    videoIdOrKeyword: "city",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 5, text: "Navigating downtown boulevards surrounded by towering illuminated skyscrapers." },
      { start: 5, end: 10, text: "Golden headlights and neon signs reflecting off the fresh rain." },
      { start: 10, end: 15, text: "The unending energetic rhythm of city night life." },
    ],
  },

  // 8. Blooming Spring Garden
  {
    videoIdOrKeyword: "flower",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 2, text: "[Gentle morning garden ambiance]" },
      { start: 2, end: 5, text: "Delicate spring petals unfurling under the warmth of the early morning sun." },
    ],
  },

  // 9. Weekend Chill: Mountain Sunset
  {
    videoIdOrKeyword: "mountain",
    language: "en",
    label: "English",
    cues: [
      { start: 0, end: 4, text: "[Acoustic melody and evening mountain wind]" },
      { start: 4, end: 8, text: "Golden hour casting vivid amber rays across the mountain ridges." },
    ],
  },
];

/**
 * Finds the matching caption cue for a given video title / ID at a specific timestamp.
 */
export function getCaptionCueAtTime(
  videoTitleOrId: string,
  currentTime: number,
  language = "en"
): string | null {
  const query = (videoTitleOrId || "").toLowerCase();

  // Find exact or keyword match track for the requested language
  let match = REALTIME_CAPTION_TRACKS.find(
    (t) => t.language === language && query.includes(t.videoIdOrKeyword)
  );

  // Fallback to English if language not found
  if (!match && language !== "en") {
    match = REALTIME_CAPTION_TRACKS.find(
      (t) => t.language === "en" && query.includes(t.videoIdOrKeyword)
    );
  }

  // If still no keyword match, use generic timed captions for any video
  if (!match) {
    const cycle = Math.floor(currentTime) % 24;
    if (cycle >= 0 && cycle < 6) {
      return `Streaming "${videoTitleOrId || "Video"}" in high-definition audio and video.`;
    } else if (cycle >= 6 && cycle < 12) {
      return "[High fidelity digital audio track playing]";
    } else if (cycle >= 12 && cycle < 18) {
      return "Experience customized playback controls, speed, and real-time captions.";
    } else if (cycle >= 18 && cycle < 24) {
      return "[Background music and ambient sound]";
    }
    return null;
  }

  const activeCue = match.cues.find(
    (cue) => currentTime >= cue.start && currentTime <= cue.end
  );

  return activeCue ? activeCue.text : null;
}
