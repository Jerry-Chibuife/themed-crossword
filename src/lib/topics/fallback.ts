import {
  TOPIC_CATEGORIES,
  type TopicCategory,
  type TopicSpark,
} from "@/lib/topics/types";

const FALLBACK_BANK: Record<TopicCategory, TopicSpark[]> = {
  entertainment: [
    {
      label: "Marvel street-level heroes",
      category: "entertainment",
      hook: "Daredevil, Jessica Jones, and Hell's Kitchen lore",
    },
    {
      label: "Studio Ghibli deep cuts",
      category: "entertainment",
      hook: "Spirits, baths, and quiet adventures beyond Totoro",
    },
    {
      label: "90s sitcom catchphrases",
      category: "entertainment",
      hook: "Friends, Seinfeld, Fresh Prince, and living-room legends",
    },
    {
      label: "Red Rising series trivia",
      category: "entertainment",
      hook: "Golds, Howlers, and the Rising on Mars",
    },
    {
      label: "Pixar villains & sidekicks",
      category: "entertainment",
      hook: "Syndrome, Lotso, and the ones who steal scenes",
    },
  ],
  literature: [
    {
      label: "Stormlight Archive names",
      category: "literature",
      hook: "Radiants, spren, and Alethi highprinces",
    },
    {
      label: "Shakespearean tragedies",
      category: "literature",
      hook: "Hamlet, Macbeth, and fatal flaws in blank verse",
    },
    {
      label: "Greek myth antiheroes",
      category: "literature",
      hook: "Odysseus, Medea, and gods who meddle",
    },
    {
      label: "Detective fiction classics",
      category: "literature",
      hook: "Holmes, Poirot, and locked-room puzzles",
    },
    {
      label: "Dune houses & planets",
      category: "literature",
      hook: "Atreides, Harkonnen, Arrakis, and the spice",
    },
  ],
  music: [
    {
      label: "Billboard pop anthems",
      category: "music",
      hook: "Chart-topping titles from the streaming era",
    },
    {
      label: "Jazz age legends",
      category: "music",
      hook: "Armstrong, Ella, Duke, and speakeasy standards",
    },
    {
      label: "Afrobeats heavyweights",
      category: "music",
      hook: "Wizkid, Burna, Davido, and dancefloor hits",
    },
    {
      label: "Classical composers quiz",
      category: "music",
      hook: "Mozart to Stravinsky in crossword-sized names",
    },
    {
      label: "Hip-hop origin cities",
      category: "music",
      hook: "Bronx to Atlanta — scenes, crews, and classics",
    },
  ],
  places: [
    {
      label: "World capitals oddities",
      category: "places",
      hook: "Capitals that surprise, relocate, or share names",
    },
    {
      label: "National parks of the US",
      category: "places",
      hook: "Yosemite, Zion, and wild protected lands",
    },
    {
      label: "Italian cities & regions",
      category: "places",
      hook: "From Venice canals to Sicilian coasts",
    },
    {
      label: "African rivers & lakes",
      category: "places",
      hook: "Nile, Niger, Victoria, and the Great Rift",
    },
    {
      label: "Pacific island nations",
      category: "places",
      hook: "Fiji, Samoa, Tonga, and ocean archipelagos",
    },
  ],
  science: [
    {
      label: "Periodic table oddballs",
      category: "science",
      hook: "Elements with weird names, uses, or stories",
    },
    {
      label: "Space missions & probes",
      category: "science",
      hook: "Apollo, Voyager, JWST, and robotic explorers",
    },
    {
      label: "Human body systems",
      category: "science",
      hook: "Organs, bones, and the machinery of life",
    },
    {
      label: "Famous scientists' surnames",
      category: "science",
      hook: "Curie, Darwin, Turing, and paradigm shifters",
    },
    {
      label: "Weather & climate terms",
      category: "science",
      hook: "Fronts, jets, El Niño, and storm vocabulary",
    },
  ],
  culture: [
    {
      label: "Korean street food lore",
      category: "culture",
      hook: "Tteokbokki, banchan, and late-night market bites",
    },
    {
      label: "Yoruba festivals & rites",
      category: "culture",
      hook: "Odun, orisha, and celebration vocabulary",
    },
    {
      label: "Japanese tea ceremony",
      category: "culture",
      hook: "Matcha, chawan, and quiet ritual details",
    },
    {
      label: "Carnival costume traditions",
      category: "culture",
      hook: "Rio, Trinidad, and masquerade craft",
    },
    {
      label: "Scandinavian hygge rituals",
      category: "culture",
      hook: "Candles, saunas, and cozy winter customs",
    },
  ],
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Stable first-of-each-category slate (SSR-safe). */
export function defaultFallbackSparks(): TopicSpark[] {
  return TOPIC_CATEGORIES.map((category) => FALLBACK_BANK[category][0]!);
}

/** One spark per category from the static bank (randomized). */
export function pickFallbackSparks(): TopicSpark[] {
  return TOPIC_CATEGORIES.map((category) => pickOne(FALLBACK_BANK[category]));
}
