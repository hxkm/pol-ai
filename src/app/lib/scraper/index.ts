/**
 * 4chan /pol/ Scraper
 * 
 * This module handles fetching thread data from 4chan's API
 * following their rate limiting and API requirements.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Readable } from 'stream';
import { ensureDirectories, paths } from '../utils/paths';
import { Thread, Post, isAxiosError } from '../../types/interfaces';
import { initializeAnalyzers, analyzeThreads, purgeOldResults } from '../analyzers';

// Base URL for 4chan API
const API_BASE_URL = 'https://a.4cdn.org/pol';
const MEDIA_BASE_URL = 'https://i.4cdn.org/pol';

// Configuration
const MAX_THREADS_PER_CATEGORY = 20;
const MAX_THREAD_AGE_DAYS = 3;

// User agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];

/**
 * Get a random user agent from our list
 */
function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

/**
 * Sleep for a random amount of time between min and max milliseconds
 */
async function randomSleep(minMs = 250, maxMs = 750): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create axios instance with proper headers
 */
function createApiClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'User-Agent': getRandomUserAgent()
    }
  });
}

/**
 * Fetch data from 4chan API with proper headers and error handling
 */
async function fetchFromApi<T>(endpoint: string): Promise<T> {
  const client = createApiClient();
  
  try {
    console.log(`Fetching: ${endpoint}`);
    const response = await client.get<T>(endpoint);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 30 seconds...');
        await randomSleep(30, 40);
        return fetchFromApi(endpoint);
      }
    }
    throw error;
  }
}

/**
 * Download OP image for a thread
 */
async function downloadOpImage(thread: Thread): Promise<void> {
  // Only proceed if thread has an image
  if (!thread.tim || !thread.ext) {
    return;
  }

  // Skip video files
  const videoExtensions = ['.webm', '.mp4', '.mov', '.avi', '.wmv', '.flv'];
  if (videoExtensions.includes(thread.ext.toLowerCase())) {
    console.log(`Skipping video file for thread ${thread.no} (${thread.ext})`);
    return;
  }

  const imageUrl = `${MEDIA_BASE_URL}/${thread.tim}${thread.ext}`;
  const imagePath = path.join(paths.dataDir, 'media', 'OP', `${thread.no}${thread.ext}`);

  // Create media directory if it doesn't exist
  const mediaDir = path.join(paths.dataDir, 'media', 'OP');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  try {
    const response = await axios<Readable>({
      method: 'get',
      url: imageUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(imagePath);
    const stream = response.data;
    
    stream.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading image for thread ${thread.no}:`, error);
  }
}

/**
 * Get catalog and extract threads we want to track
 */
async function getTargetThreads(): Promise<Thread[]> {
  interface CatalogPage {
    page: number;
    threads: Thread[];
  }

  try {
    // Fetch the catalog
    const catalog = await fetchFromApi<CatalogPage[]>('/catalog.json');
    
    // Flatten all threads from all pages
    const allThreads = catalog.flatMap(page => page.threads)
      .filter(thread => !thread.sticky); // Exclude stickied threads
    
    // Get top threads by replies
    const topThreads = [...allThreads]
      .sort((a, b) => b.replies - a.replies)
      .slice(0, MAX_THREADS_PER_CATEGORY);
    
    // Get newest threads
    const newestThreads = [...allThreads]
      .sort((a, b) => b.no - a.no)
      .slice(0, MAX_THREADS_PER_CATEGORY);
    
    // Combine and deduplicate threads
    const uniqueThreads = Array.from(new Map(
      [...topThreads, ...newestThreads].map(thread => [thread.no, thread])
    ).values());
    
    // Sort by post number (descending)
    return uniqueThreads.sort((a, b) => b.no - a.no);
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return [];
  }
}

/**
 * Fetch full thread data including all replies
 */
async function fetchFullThread(threadId: number): Promise<Thread | null> {
  try {
    interface ThreadResponse {
      posts: (Post & Partial<Thread>)[];
    }
    
    const data = await fetchFromApi<ThreadResponse>(`/thread/${threadId}.json`);
    
    // First post is always the OP
    const [op, ...replies] = data.posts;
    
    // Construct full thread object
    const thread: Thread = {
      ...op,
      no: op.no,
      time: op.time,
      name: op.name,
      replies: replies.length,
      images: replies.filter(post => post.tim).length,
      posts: replies,
      lastModified: Date.now() / 1000
    };
    
    return thread;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      console.log(`Thread ${threadId} was pruned`);
      return null;
    }
    throw error;
  }
}

/**
 * Save thread data to disk
 */
function saveThread(thread: Thread): void {
  const filePath = paths.threadFile(thread.no.toString());
  
  try {
    // Write to temporary file first
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(thread, null, 2));
    
    // Rename to final path (atomic operation)
    fs.renameSync(tempPath, filePath);
    
    console.log(`Thread ${thread.no} saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving thread ${thread.no}:`, error);
    throw error;
  }
}

/**
 * Main scraper function
 */
async function scrape(): Promise<void> {
  console.log('Starting 4chan /pol/ scraper...');
  
  // Ensure our data directories exist
  ensureDirectories();
  
  try {
    // Initialize analyzers
    await initializeAnalyzers();
    
    // Get target threads from catalog
    const targetThreads = await getTargetThreads();
    console.log(`Found ${targetThreads.length} threads to process`);
    
    // Collect all thread data first
    const collectedThreads: Thread[] = [];
    
    // Process each thread
    for (const thread of targetThreads) {
      console.log(`Processing thread ${thread.no}...`);
      
      try {
        // Fetch full thread data
        const fullThread = await fetchFullThread(thread.no);
        if (!fullThread) continue;
        
        // Download OP image
        await downloadOpImage(fullThread);
        
        // Save thread data
        saveThread(fullThread);
        
        // Add to collected threads
        collectedThreads.push(fullThread);
        
        // Sleep before next request
        await randomSleep();
      } catch (error) {
        console.error(`Error processing thread ${thread.no}:`, error);
        // Continue with next thread
      }
    }
    
    console.log('Thread collection complete. Running analyzers...');
    
    // Run analyzers on all collected threads
    try {
      await analyzeThreads(collectedThreads);
    } catch (error) {
      console.error('Error analyzing threads:', error);
    }
    
    // Clean up old analysis results
    await purgeOldResults();
    
    console.log('Scraping and analysis complete!');
  } catch (error) {
    console.error('Scraper failed:', error);
    throw error;
  }
}

// If this file is run directly (not imported)
if (require.main === module) {
  scrape()
    .then(() => console.log('Scraper finished successfully'))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

// Export for use in other modules
export { scrape }; 