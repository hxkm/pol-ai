import { Thread } from '../types/interfaces';
import { randomSample } from './array';

export interface ThreadSelection {
  topByPosts: Thread[];
  mediumHighPosts: Thread[];
  mediumPosts: Thread[];
  lowPosts: Thread[];
}

export function selectThreads(threads: Thread[]): ThreadSelection {
  console.log('\nThread Selection Process:');
  console.log(`Total threads available: ${threads.length}`);

  // Sort threads by number of posts
  const sortedThreads = [...threads].sort((a, b) => (b.posts?.length || 0) - (a.posts?.length || 0));
  
  // Get top 3 threads by post count
  const topByPosts = sortedThreads.slice(0, 3);
  console.log('\nTop 3 threads by post count:');
  topByPosts.forEach(t => {
    console.log(`- Thread ${t.no}: ${t.posts?.length || 0} posts`);
  });
  
  // Remove selected threads from pool to avoid duplicates
  let remainingThreads = sortedThreads.filter(t => !topByPosts.includes(t));
  
  // Filter threads by post count ranges
  const range200to300 = remainingThreads.filter(t => {
    const postCount = t.posts?.length || 0;
    return postCount >= 200 && postCount <= 300;
  });
  
  // Select medium-high posts and remove them from remaining pool
  const mediumHighPosts = randomSample(range200to300, Math.min(3, range200to300.length));
  remainingThreads = remainingThreads.filter(t => !mediumHighPosts.includes(t));
  
  const range100to200 = remainingThreads.filter(t => {
    const postCount = t.posts?.length || 0;
    return postCount >= 100 && postCount < 200;
  });
  
  // Select medium posts and remove them from remaining pool
  const mediumPosts = randomSample(range100to200, Math.min(3, range100to200.length));
  remainingThreads = remainingThreads.filter(t => !mediumPosts.includes(t));
  
  // Now get all threads with 50+ posts that haven't been selected yet
  const range50Plus = remainingThreads.filter(t => {
    const postCount = t.posts?.length || 0;
    return postCount >= 50;
  });

  console.log('\nAvailable threads in each range:');
  console.log(`- 200-300 posts: ${range200to300.length} threads`);
  console.log(`- 100-200 posts: ${range100to200.length} threads`);
  console.log(`- 50+ posts: ${range50Plus.length} threads`);
  
  // Get random samples from each range
  const lowPosts = randomSample(range50Plus, Math.min(3, range50Plus.length));

  // Log selected threads from each range
  console.log('\nSelected threads from 200-300 range:');
  mediumHighPosts.forEach(t => {
    console.log(`- Thread ${t.no}: ${t.posts?.length || 0} posts`);
  });

  console.log('\nSelected threads from 100-200 range:');
  mediumPosts.forEach(t => {
    console.log(`- Thread ${t.no}: ${t.posts?.length || 0} posts`);
  });

  console.log('\nSelected threads from 50+ range:');
  lowPosts.forEach(t => {
    console.log(`- Thread ${t.no}: ${t.posts?.length || 0} posts`);
  });

  const totalSelected = topByPosts.length + mediumHighPosts.length + 
                       mediumPosts.length + lowPosts.length;

  if (totalSelected < 12) {
    console.warn('\n⚠️ WARNING: Could not find enough threads matching criteria!');
    console.warn(`Only found ${totalSelected} threads instead of 12`);
    console.warn('Attempting to fill remaining slots with available threads...');

    // Get all remaining threads with 50+ posts that haven't been selected
    const availableThreads = remainingThreads.filter(t => 
      (t.posts?.length || 0) >= 50 &&
      !topByPosts.includes(t) &&
      !mediumHighPosts.includes(t) &&
      !mediumPosts.includes(t) &&
      !lowPosts.includes(t)
    );

    if (availableThreads.length > 0) {
      const additionalThreads = randomSample(availableThreads, 12 - totalSelected);
      console.log('\nAdditional threads selected to reach 12:');
      additionalThreads.forEach(t => {
        console.log(`- Thread ${t.no}: ${t.posts?.length || 0} posts`);
        lowPosts.push(t);
      });
    }
  }
  
  return {
    topByPosts,
    mediumHighPosts,
    mediumPosts,
    lowPosts
  };
} 