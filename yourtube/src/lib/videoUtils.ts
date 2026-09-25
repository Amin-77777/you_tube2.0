import { getBackendUrl } from "./backendUrl";

/**
 * Curated pool of high-quality, distinct thumbnails across multiple genres
 * Ensures that every video gets its own unique, colorful visual representation.
 */
export const DIVERSE_FALLBACK_THUMBNAILS = [
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80", // Esports & Gaming
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80", // Hardware & Tech
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80", // Web Development
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80", // Film Camera & Cinema
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80", // Music Studio & Audio
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80", // EDM DJ & Concert
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80", // Code & Software
  "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80", // Retro Arcade Gaming
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80", // Tropical Island Travel
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80", // Fitness & Sport
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80", // Cooking & Food
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80", // Space Galaxy Aurora
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80", // Racing & Cars
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80", // Modern AI & Tech
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80", // Education & Books
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop&q=80", // Wilderness & Nature
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80", // Music Festival
  "https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80", // Creative Design
];

/**
 * Returns a deterministic fallback thumbnail from the curated pool
 * based on the string seed (e.g. video ID or title).
 */
export const getUniqueFallbackThumbnail = (seed = ""): string => {
  if (!seed) return DIVERSE_FALLBACK_THUMBNAILS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DIVERSE_FALLBACK_THUMBNAILS.length;
  return DIVERSE_FALLBACK_THUMBNAILS[idx];
};

/**
 * Resolves a video file path or full URL into a browser-playable URL.
 */
export const getVideoSrc = (path?: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  const normalized = path.replace(/\\/g, "/");
  const uploadIdx = normalized.indexOf("uploads/");
  const cleanPath = uploadIdx !== -1 ? normalized.slice(uploadIdx) : normalized.replace(/^\//, "");

  return `${getBackendUrl()}/${cleanPath}`;
};

/**
 * Returns fallback video sources in priority order to guarantee playback.
 */
export const getVideoSources = (path?: string): string[] => {
  if (!path) return [];
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return [path, "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/big_buck_bunny.mp4"];
  }
  const normalized = path.replace(/\\/g, "/");
  const uploadIdx = normalized.indexOf("uploads/");
  const cleanPath = uploadIdx !== -1 ? normalized.slice(uploadIdx) : normalized.replace(/^\//, "");

  const backendFullUrl = `${getBackendUrl()}/${cleanPath}`;
  const relativeProxyUrl = `/${cleanPath}`;

  // Prioritize direct backend URL, with relative Next.js proxy/static fallback, and resilient CDN fallback
  return [
    backendFullUrl,
    relativeProxyUrl,
    "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/big_buck_bunny.mp4",
  ];
};

/**
 * Resolves the thumbnail image URL for a video.
 * If the video has an explicit thumbnail URL (or uploads path), returns it.
 * Otherwise, generates an appropriate, high-quality contextual thumbnail.
 */
export const getThumbnailSrc = (video?: any): string => {
  if (!video) return DIVERSE_FALLBACK_THUMBNAILS[0];

  if (video.thumbnail && typeof video.thumbnail === "string" && video.thumbnail.trim().length > 0) {
    const thumb = video.thumbnail.trim();
    if (
      thumb.startsWith("http://") ||
      thumb.startsWith("https://") ||
      thumb.startsWith("data:") ||
      thumb.startsWith("blob:")
    ) {
      return thumb;
    }
    const normalized = thumb.replace(/\\/g, "/");
    const uploadIdx = normalized.indexOf("uploads/");
    const cleanThumb = uploadIdx !== -1 ? normalized.slice(uploadIdx) : normalized.replace(/^\//, "");
    return `${getBackendUrl()}/${cleanThumb}`;
  }

  // Contextual thumbnail selection based on keywords in title
  const title = (video.videotitle || video.title || "").toLowerCase();
  if (title.includes("bunny") || title.includes("animat")) {
    return "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("jellyfish") || title.includes("ocean") || title.includes("sea") || title.includes("water")) {
    return "https://images.unsplash.com/photo-1548232979-6c557ee14752?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("sintel") || title.includes("dragon") || title.includes("fantasy") || title.includes("story")) {
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("flower") || title.includes("garden") || title.includes("bloom") || title.includes("plant")) {
    return "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("retro") || title.includes("synth") || title.includes("music") || title.includes("audio") || title.includes("song")) {
    return "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("city") || title.includes("night") || title.includes("drive") || title.includes("urban") || title.includes("chrome")) {
    return "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("mountain") || title.includes("sunset") || title.includes("chill") || title.includes("nature") || title.includes("friday")) {
    return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("intro") || title.includes("tutorial") || title.includes("welcome") || title.includes("yourtube")) {
    return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("bag") || title.includes("fashion") || title.includes("style") || title.includes("wear")) {
    return "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("camera") || title.includes("vlog") || title.includes("adventure") || title.includes("action") || title.includes("trail")) {
    return "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("mobile") || title.includes("cinematic") || title.includes("highlight") || title.includes("clip") || title.includes("shoot")) {
    return "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("game") || title.includes("gaming") || title.includes("play")) {
    return "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80";
  }
  if (title.includes("code") || title.includes("dev") || title.includes("tech") || title.includes("program")) {
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80";
  }

  // Deterministic diverse fallback so every video has a unique thumbnail
  const seed = (video._id || video.id || video.videotitle || video.title || "video").toString();
  return getUniqueFallbackThumbnail(seed);
};

/**
 * Formats a view count into a compact string like 1.2M, 45K.
 */
export const formatViews = (views?: number): string => {
  if (typeof views !== "number" || isNaN(views)) return "0 views";
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${views} views`;
};

export const DEFAULT_FALLBACK_VIDEOS = [
  {
    _id: "default-1",
    videotitle: "Big Buck Bunny - Animated 3D Short Film",
    filepath: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/big_buck_bunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    videochanel: "Blender Studio",
    duration: "0:33",
    views: 385000,
    Like: 14200,
  },
  {
    _id: "default-2",
    videotitle: "Deep Ocean Bioluminescent Jellyfish 4K",
    filepath: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4",
    thumbnail: "https://images.unsplash.com/photo-1548232979-6c557ee14752?w=800&auto=format&fit=crop&q=80",
    videochanel: "Wild Nature Explorer",
    duration: "0:10",
    views: 215000,
    Like: 8900,
  },
  {
    _id: "default-3",
    videotitle: "Sintel - Fantasy Dragon Story Short Film",
    filepath: "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    videochanel: "Durian Animation",
    duration: "0:10",
    views: 450000,
    Like: 18200,
  },
  {
    _id: "default-4",
    videotitle: "Timelapse: Blooming Spring Garden & Flowers",
    filepath: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&auto=format&fit=crop&q=80",
    videochanel: "Botanical Wonders",
    duration: "0:05",
    views: 290000,
    Like: 12500,
  },
  {
    _id: "default-5",
    videotitle: "Retro Groove: 80s Synthwave Visuals & Audio",
    filepath: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/echo-hereweare.mp4",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80",
    videochanel: "Sound & Vision Lab",
    duration: "0:45",
    views: 180000,
    Like: 9500,
  },
  {
    _id: "default-6",
    videotitle: "Modern City Night Drive & Lights in 4K",
    filepath: "https://webrtc.github.io/samples/src/video/chrome.mp4",
    thumbnail: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80",
    videochanel: "Urban Motion",
    duration: "0:15",
    views: 154000,
    Like: 7400,
  },
  {
    _id: "default-7",
    videotitle: "Weekend Chill: Peaceful Mountain Sunset",
    filepath: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    videochanel: "Serenity Scenery",
    duration: "0:08",
    views: 245000,
    Like: 11200,
  },
  {
    _id: "default-8",
    videotitle: "Introduction to YourTube",
    filepath: "uploads/2026-09-22T18-17-06.007Z-2025-06-25T06-09-29.296Z-vdo.mp4",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
    videochanel: "Official Channel",
    duration: "0:30",
    views: 226,
    Like: 24,
  },
  {
    _id: "default-9",
    videotitle: "Mobile Cinematic Video & Highlights",
    filepath: "uploads/2026-07-21T16-53-50.655Z-lv_0_20260623153455_processed.mp4",
    thumbnail: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80",
    videochanel: "Creator Studio",
    duration: "0:31",
    views: 310,
    Like: 45,
  },
  {
    _id: "default-10",
    videotitle: "Urban Street Style & Everyday Bag Tour",
    filepath: "uploads/2026-07-21T16-53-50.655Z-lv_0_20260623153455_processed.mp4",
    thumbnail: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80",
    videochanel: "Style & Gear",
    duration: "0:31",
    views: 520,
    Like: 78,
  },
  {
    _id: "default-11",
    videotitle: "Action Camera Adventure & Vlog",
    filepath: "uploads/2026-07-21T16-52-57.468Z-lv_0_20260623153455_processed.mp4",
    thumbnail: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80",
    videochanel: "Adventure Trails",
    duration: "0:31",
    views: 640,
    Like: 92,
  },
];
