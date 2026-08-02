export type PostCategory = 'professional' | 'casual' | 'hiring' | 'achievement' | 'unknown';

export interface GeneratedComment {
  id: string;
  postId: string;
  authorName: string;
  postContent: string;
  comment1: string;
  comment2: string;
  selectedComment?: string;
  category: PostCategory;
  timestamp: string;
}

export interface Reply {
  id: string;
  originalCommentId: string;
  originalComment: string;
  replyText: string;
  replyAuthor: string;
  timestamp: string;
}

export interface StorageData {
  comments: GeneratedComment[];
  replies: Reply[];
  settings: {
    groqApiKeys: string[];
    currentKeyIndex: number;
    commentTone: 'professional' | 'conversational' | 'auto';
    enabled: boolean;
  };
}

/* --------------------------------------------------------- Admin console */

/** A Supabase auth user, enriched with profile + generation activity. */
export interface AdminUser {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  /** From user_profiles; null when the user has no profile row. */
  name: string | null;
  headline: string | null;
  /** Generation counts within the queried window. */
  generations: number;
  used: number;
  lastGenerationAt: string | null;
}

/** Back-compat alias — the original /api/users response shape. */
export type DashboardUser = Pick<
  AdminUser,
  'id' | 'email' | 'createdAt' | 'lastSignInAt' | 'confirmed'
>;

/** A row of the backend's generation_log table. */
export interface GenerationRow {
  id: string;
  user_id: string;
  post_url: string | null;
  post_id: string | null;
  post_text: string;
  category: string | null;
  stance_1: string | null;
  stance_2: string | null;
  comment_1: string | null;
  comment_2: string | null;
  bmc_used: boolean;
  created_at: string;
  comment_1_liked: boolean | null;
  comment_2_liked: boolean | null;
  used_comment: '1' | '2' | 'edited' | null;
  final_posted_text: string | null;
}

export interface UserProfileRow {
  user_id: string;
  name: string;
  headline: string | null;
  background_json: Record<string, unknown>;
  tone_preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** A generation row joined with the identity of the user who produced it. */
export interface GenerationFeedItem extends GenerationRow {
  userEmail: string | null;
  userName: string | null;
  outcome: 'used' | 'edited' | 'unused';
  like: 'liked' | 'disliked' | null;
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  timestamp: string | null;
}

export interface ServiceStatus {
  id: string;
  label: string;
  state: 'ok' | 'degraded' | 'down' | 'unknown';
  detail: string;
}

export interface OverviewResponse {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  activeUsers7d: number;
  activeUsers30d: number;
  generationsToday: number;
  generationsTotal: number;
  generations30d: number;
  usedRate: number | null;
  likeRate: number | null;
  recentSignups: AdminUser[];
  alerts: SystemAlert[];
  services: ServiceStatus[];
  windowTruncated: boolean;
}

export interface AnalyticsResponse {
  perDay: Array<{ date: string; count: number }>;
  categories: Array<{ key: string; count: number }>;
  stances: Array<{ key: string; count: number }>;
  outcomes: Array<{ key: string; count: number }>;
  bmcUsed: number;
  total: number;
  windowDays: number;
  windowTruncated: boolean;
}
