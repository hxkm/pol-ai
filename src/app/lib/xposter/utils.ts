import { Article, PostedArticle } from './types';
import { TWEET_CONFIG } from './config';
import fs from 'fs/promises';
import path from 'path';

export async function readArticles(filePath: string): Promise<Article[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.articles;
  } catch (error) {
    console.error('Error reading articles:', error);
    return [];
  }
}

export async function readPostedArticles(filePath: string): Promise<PostedArticle[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, create directory and return empty array
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '[]', 'utf-8');
      return [];
    }
    console.error('Error reading posted articles:', error);
    return [];
  }
}

export async function savePostedArticle(filePath: string, article: PostedArticle): Promise<void> {
  try {
    const posted = await readPostedArticles(filePath);
    posted.push(article);
    await fs.writeFile(filePath, JSON.stringify(posted, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving posted article:', error);
    throw error;
  }
}

export function formatTweet(article: Article): string {
  const threadUrl = `${TWEET_CONFIG.threadUrlBase}${article.threadId}`;
  const suffixLength = TWEET_CONFIG.suffix.length + TWEET_CONFIG.urlLength + 1; // +1 for space before URL
  const maxTextLength = TWEET_CONFIG.maxLength - suffixLength;
  
  let text = article.article;
  if (text.length > maxTextLength) {
    text = text.substring(0, maxTextLength - 3) + '...';
  }
  
  return `${text} ${threadUrl}${TWEET_CONFIG.suffix}`;
}

export function sortArticlesByReplies(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => a.metadata.totalPosts - b.metadata.totalPosts);
}

export function filterUnpostedArticles(articles: Article[], posted: PostedArticle[]): Article[] {
  const postedIds = new Set(posted.map(p => p.threadId));
  return articles.filter(article => !postedIds.has(article.threadId));
} 