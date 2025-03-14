import { AnalyzerResult, Post } from '../../../types/interfaces';

/**
 * Result structure for Reply analysis
 */
export interface ReplyAnalyzerResult extends AnalyzerResult {
  sourcePost: Post;           // The post that received replies
  replyCount: number;         // Number of replies to this post
  replies: Post[];            // Array of posts that replied to this post
  threadSubject: string;      // Subject of the thread containing this post
  isOp: boolean;              // Whether this post is the OP (should be false for this analyzer)
} 