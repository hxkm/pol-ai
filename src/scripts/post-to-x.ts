import { xPoster } from '../app/lib/xposter/poster';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const result = dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});

console.log('Dotenv config result:', result);
console.log('Environment variables:', {
  X_API_KEY: process.env.X_API_KEY,
  X_API_KEY_SECRET: process.env.X_API_KEY_SECRET,
  X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET
});

async function main() {
  try {
    console.log('Posting next article to X...');
    const result = await xPoster.postNextArticle();
    
    if (result.success) {
      console.log(`Successfully posted tweet with ID: ${result.tweetId}`);
    } else {
      console.error(`Failed to post tweet: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 