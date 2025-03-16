import { Thread } from '../types/interfaces';
import { ArticleGenerator } from './ArticleGenerator';
import { ArticleBatch } from '../types/article';

export class Summarizer {
  private articleGenerator: ArticleGenerator;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.articleGenerator = new ArticleGenerator(apiKey);
  }

  async analyze(threads: Thread[]): Promise<ArticleBatch> {
    console.log(`Starting analysis of ${threads.length} threads...`);
    
    let completedThreads = 0;
    const totalThreads = threads.length;
    
    const articleBatch = await this.articleGenerator.generateArticles(threads, (threadId) => {
      completedThreads++;
      console.log(`Progress: ${completedThreads}/${totalThreads} - Completed thread ${threadId}`);
    });
    
    console.log('\nAnalysis complete:');
    console.log(`- Analyzed ${articleBatch.batchStats.totalAnalyzedPosts} posts across ${articleBatch.batchStats.totalThreads} threads`);
    console.log(`- Average antisemitic content: ${articleBatch.batchStats.averageAntisemiticPercentage.toFixed(2)}%\n`);
    
    return articleBatch;
  }
} 