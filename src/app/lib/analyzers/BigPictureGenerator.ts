import { DeepSeekClient } from '../deepseek';
import { Thread } from '../../types/interfaces';
import { ArticleAnalysis } from '../../types/article';
import { BigPictureAnalysis, Theme, Sentiment } from '../../types/bigpicture';
import { paths } from '../../utils/paths';
import path from 'path';
import fs from 'fs/promises';

export class BigPictureGenerator {
  private client: DeepSeekClient;
  private outputPath: string;

  constructor(apiKey: string) {
    this.client = new DeepSeekClient(apiKey);
    this.outputPath = path.resolve(paths.dataDir, 'analysis', 'big-picture.json');
  }

  private async generateOverview(threads: Thread[]): Promise<string> {
    // Extract OP comments from threads
    const opComments = threads
      .map(thread => thread.posts?.[0]?.com)
      .filter((content): content is string => Boolean(content))
      .join('\n\n');

    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are an objective academic researcher documenting current events through the lens of online discourse.
Your task is to analyze multiple thread-starting posts and generate a comprehensive overview.
Write a cohesive article between 175-200 words that captures the key topics, patterns, and viewpoints.
Discern any significant events that are being discussed and present them as the main topic.
Present information neutrally and professionally.
Do not mention that these are from online posts or discussions.
Focus on the actual content and perspectives being expressed.`
        },
        {
          role: 'user',
          content: `Generate a 175-200 word overview article that captures the key topics and viewpoints expressed in these posts:\n\n${opComments}`
        }
      ],
      temperature: 0.7
    });

    return response.choices[0].message.content;
  }

  private async generateThemes(articles: ArticleAnalysis[]): Promise<Theme[]> {
    const articlesContent = articles
      .map(a => `${a.headline}\n${a.article}`)
      .join('\n\n');

    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are an academic researcher analyzing content patterns.
Your task is to identify exactly 5 dominant themes (excluding antisemitism).
For each theme:
1. Provide a clear, specific name
2. List 3-5 relevant keywords
3. Note frequency (percentage of content this theme appears in)
Format your response as JSON matching this structure:
{
  "themes": [
    {
      "name": "theme name",
      "frequency": number,
      "keywords": ["word1", "word2", "word3"]
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Analyze these articles and identify exactly 5 dominant themes (excluding antisemitism):\n\n${articlesContent}`
        }
      ],
      temperature: 0.3
    });

    let jsonContent = response.choices[0].message.content;
    if (jsonContent.includes("```json")) {
      jsonContent = jsonContent.split("```json")[1].split("```")[0].trim();
    }

    const data = JSON.parse(jsonContent);
    return data.themes;
  }

  private async generateSentiments(articles: ArticleAnalysis[]): Promise<Sentiment[]> {
    const articlesContent = articles
      .map(a => `${a.headline}\n${a.article}`)
      .join('\n\n');

    const response = await this.client.chat({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are an academic researcher analyzing sentiment patterns.
Your task is to identify exactly 5 significant sentiments (excluding antisemitism).
For each sentiment:
1. Provide a clear, specific name
2. List 3-5 relevant keywords
3. Note intensity on a scale of 0-100
Format your response as JSON matching this structure:
{
  "sentiments": [
    {
      "name": "sentiment name",
      "intensity": number,
      "keywords": ["word1", "word2", "word3"]
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Analyze these articles and identify exactly 5 significant sentiments (excluding antisemitism):\n\n${articlesContent}`
        }
      ],
      temperature: 0.3
    });

    let jsonContent = response.choices[0].message.content;
    if (jsonContent.includes("```json")) {
      jsonContent = jsonContent.split("```json")[1].split("```")[0].trim();
    }

    const data = JSON.parse(jsonContent);
    return data.sentiments;
  }

  async analyze(threads: Thread[], articles: ArticleAnalysis[]): Promise<BigPictureAnalysis> {
    console.log('\nGenerating big picture analysis...');

    try {
      // Run all analysis steps in parallel
      const [article, themes, sentiments] = await Promise.all([
        this.generateOverview(threads),
        this.generateThemes(articles),
        this.generateSentiments(articles)
      ]);

      const analysis: BigPictureAnalysis = {
        overview: {
          article,
          generatedAt: Date.now()
        },
        themes,
        sentiments
      };

      // Always overwrite the previous analysis
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
      await fs.writeFile(
        this.outputPath,
        JSON.stringify(analysis, null, 2),
        'utf-8'
      );

      return analysis;
    } catch (error) {
      console.error('Error in big picture analysis:', error);
      throw error;
    }
  }
} 