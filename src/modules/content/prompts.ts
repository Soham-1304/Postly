export const PLATFORM_LIMITS = {
  twitter: { maxChars: 280, hashtags: "2-3" },
  linkedin: { maxChars: 1300, hashtags: "3-5" },
  instagram: { maxChars: null, hashtags: "10-15" },
  threads: { maxChars: 500, hashtags: "2-3" }
} as const;
