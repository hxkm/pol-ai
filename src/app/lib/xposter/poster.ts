import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { X_CONFIG, X_API, PATHS } from './config';
import { PostResult, PostedArticle } from './types';
import {
  readArticles,
  readPostedArticles,
  savePostedArticle,
  formatTweet,
  sortArticlesByReplies,
  filterUnpostedArticles,
} from './utils';

class XPoster {
  private oauth: OAuth;
  private lastPostTime: number = 0;

  constructor() {
    this.oauth = new OAuth({
      consumer: {
        key: X_CONFIG.apiKey,
        secret: X_CONFIG.apiKeySecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto
          .createHmac('sha1', key)
          .update(baseString)
          .digest('base64');
      },
      realm: 'https://api.twitter.com'
    });
  }

  private async postTweet(text: string): Promise<PostResult> {
    try {
      const endpointUrl = `${X_API.baseUrl}${X_API.tweetEndpoint}`;
      
      // Respect rate limits
      const now = Date.now();
      const timeSinceLastPost = now - this.lastPostTime;
      if (timeSinceLastPost < X_API.rateLimit.windowMs / X_API.rateLimit.tweetsPerWindow) {
        const delay = (X_API.rateLimit.windowMs / X_API.rateLimit.tweetsPerWindow) - timeSinceLastPost;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const requestData = {
        url: endpointUrl,
        method: 'POST',
        data: { text },
        includeBodyHash: true
      };

      const token = {
        key: X_CONFIG.accessToken,
        secret: X_CONFIG.accessTokenSecret,
      };

      const authorization = this.oauth.authorize(requestData, token);
      const authHeader = this.oauth.toHeader(authorization);

      const headers = {
        ...authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'pol-ai-bot/1.0.0'
      };

      console.log('Request URL:', endpointUrl);
      console.log('Request headers:', headers);
      console.log('Request body:', JSON.stringify({ text }));

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text })
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        return { success: false, error: `X API error: ${responseText}` };
      }

      const responseData = JSON.parse(responseText);
      this.lastPostTime = Date.now();
      
      return {
        success: true,
        tweetId: responseData.data.id,
      };
    } catch (error) {
      console.error('Full error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async postNextArticle(): Promise<PostResult> {
    try {
      // Read articles and posted history
      const articles = await readArticles(PATHS.articlesJson);
      const posted = await readPostedArticles(PATHS.postedJson);

      // Filter and sort articles
      const unposted = filterUnpostedArticles(articles, posted);
      const sorted = sortArticlesByReplies(unposted);

      if (sorted.length === 0) {
        return { success: false, error: 'No unposted articles available' };
      }

      // Get the article with fewest replies
      const article = sorted[0];
      const tweetText = formatTweet(article);

      // Post to X
      const result = await this.postTweet(tweetText);

      if (result.success && result.tweetId) {
        // Save to posted history
        const postedArticle: PostedArticle = {
          threadId: article.threadId,
          timestamp: Date.now(),
          tweetId: result.tweetId,
        };
        await savePostedArticle(PATHS.postedJson, postedArticle);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const xPoster = new XPoster(); 