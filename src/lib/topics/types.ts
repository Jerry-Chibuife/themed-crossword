import { z } from "zod";

export const TOPIC_CATEGORIES = [
  "entertainment",
  "literature",
  "music",
  "places",
  "science",
  "culture",
] as const;

export const TOPIC_SPARK_COUNT = TOPIC_CATEGORIES.length;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export const topicSparkSchema = z.object({
  label: z.string().trim().min(3).max(40),
  category: z.enum(TOPIC_CATEGORIES),
  hook: z.string().trim().max(60).optional().default(""),
});

export const topicSparksResponseSchema = z.object({
  sparks: z.array(topicSparkSchema).length(TOPIC_SPARK_COUNT),
});

export type TopicSpark = z.infer<typeof topicSparkSchema>;

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  entertainment: "Entertainment",
  literature: "Literature",
  music: "Music",
  places: "Places",
  science: "Science",
  culture: "Culture",
};
