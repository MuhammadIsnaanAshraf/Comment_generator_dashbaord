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
