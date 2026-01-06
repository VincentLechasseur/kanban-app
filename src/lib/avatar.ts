// Jira-like avatar colors - vibrant but professional
const AVATAR_COLORS = [
  { bg: "#6366f1", fg: "#ffffff" }, // Indigo
  { bg: "#8b5cf6", fg: "#ffffff" }, // Violet
  { bg: "#ec4899", fg: "#ffffff" }, // Pink
  { bg: "#ef4444", fg: "#ffffff" }, // Red
  { bg: "#f97316", fg: "#ffffff" }, // Orange
  { bg: "#eab308", fg: "#1f2937" }, // Yellow
  { bg: "#22c55e", fg: "#ffffff" }, // Green
  { bg: "#14b8a6", fg: "#ffffff" }, // Teal
  { bg: "#06b6d4", fg: "#ffffff" }, // Cyan
  { bg: "#3b82f6", fg: "#ffffff" }, // Blue
  { bg: "#a855f7", fg: "#ffffff" }, // Purple
  { bg: "#f43f5e", fg: "#ffffff" }, // Rose
];

/**
 * Generate a consistent color for a user based on their ID
 * Same ID always returns same color
 */
export function getAvatarColor(userId: string): { bg: string; fg: string } {
  // Simple hash function to get consistent index from ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get initials from a name (1-2 characters)
 * Falls back to email's first letter if name is not provided
 */
export function getInitials(
  name: string | undefined | null,
  email?: string | null
): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "?";
}
