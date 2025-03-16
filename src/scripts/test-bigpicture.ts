import { loadEnvConfig } from '@next/env';
import { BigPictureGenerator } from '../app/lib/analyzers/BigPictureGenerator';
import { Thread } from '../app/types/interfaces';
import { ArticleAnalysis } from '../app/types/article';

// Load environment variables
loadEnvConfig(process.cwd());

// Sample thread data for testing
const sampleThreads: Thread[] = [
  {
    no: 1,
    time: Date.now() / 1000,
    name: "Anonymous",
    replies: 10,
    images: 0,
    posts: [
      {
        no: 1,
        com: "Global elites control the media and banking systems. They're pushing mass immigration to destroy our culture. Wake up!",
        time: Date.now() / 1000,
        name: "Anonymous",
        resto: 0
      }
    ]
  },
  {
    no: 2,
    time: Date.now() / 1000,
    name: "Anonymous",
    replies: 15,
    images: 0,
    posts: [
      {
        no: 2,
        com: "The military industrial complex profits from endless wars. Our foreign policy is controlled by corporate interests.",
        time: Date.now() / 1000,
        name: "Anonymous",
        resto: 0
      }
    ]
  },
  {
    no: 3,
    time: Date.now() / 1000,
    name: "Anonymous",
    replies: 8,
    images: 0,
    posts: [
      {
        no: 3,
        com: "Tech companies are censoring truth-tellers while promoting globalist propaganda. Big Tech must be stopped.",
        time: Date.now() / 1000,
        name: "Anonymous",
        resto: 0
      }
    ]
  }
];

// Sample article data for testing
const sampleArticles: ArticleAnalysis[] = [
  {
    threadId: 1,
    headline: "Global Elite Control Narrative Emerges",
    article: "Users express strong views about alleged control of global institutions by elite groups. Discussion centers on media manipulation, financial systems, and immigration policies. Multiple posts suggest coordinated efforts to influence public opinion and policy decisions.",
    antisemiticStats: {
      analyzedComments: 100,
      antisemiticComments: 25,
      percentage: 25.0
    },
    metadata: {
      totalPosts: 300,
      analyzedPosts: 100,
      generatedAt: Date.now()
    }
  },
  {
    threadId: 2,
    headline: "Military Industrial Complex Criticism",
    article: "Discussion focuses on the role of defense contractors in perpetuating conflicts. Users argue that corporate profits drive foreign policy decisions. Several posts examine the relationship between weapons manufacturers and policy makers.",
    antisemiticStats: {
      analyzedComments: 80,
      antisemiticComments: 15,
      percentage: 18.75
    },
    metadata: {
      totalPosts: 250,
      analyzedPosts: 80,
      generatedAt: Date.now()
    }
  },
  {
    threadId: 3,
    headline: "Tech Censorship Debate",
    article: "Users discuss perceived censorship by major technology companies. Claims of selective content moderation and bias in algorithm design feature prominently. Discussion includes calls for regulation of social media platforms.",
    antisemiticStats: {
      analyzedComments: 90,
      antisemiticComments: 10,
      percentage: 11.11
    },
    metadata: {
      totalPosts: 280,
      analyzedPosts: 90,
      generatedAt: Date.now()
    }
  }
];

async function main() {
  try {
    // Check API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    console.log('✓ DeepSeek API key found');

    // Initialize big picture generator
    console.log('Initializing big picture generator...');
    const generator = new BigPictureGenerator(apiKey);

    // Run analysis
    console.log('Running big picture analysis...');
    const analysis = await generator.analyze(sampleThreads, sampleArticles);

    // Log results
    console.log('\nAnalysis Results:');
    console.log('\nOverview Article:');
    console.log(analysis.overview.article);
    console.log('\nThemes:', analysis.themes);
    console.log('\nSentiments:', analysis.sentiments);

  } catch (error) {
    console.error('Error running big picture test:', error);
    process.exit(1);
  }
}

// Run the test
main(); 