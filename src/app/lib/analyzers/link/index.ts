import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { LinkAnalyzerResult, DomainStats, LinkPost, TrackedLink, LinkCategory } from './types';

/**
 * Analyzer for finding and categorizing links in posts
 */
export class LinkAnalyzer extends BaseAnalyzer<LinkAnalyzerResult> {
  name = 'link';
  description = 'Tracks most common domains and most replied-to posts containing links';

  // Maximum number of top domains to track
  private static MAX_TOP_DOMAINS = 10;
  // Maximum number of random links to track
  private static MAX_RANDOM_LINKS = 10;

  /**
   * Extract domain from URL
   */
  private getDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.startsWith('www.') ? domain.slice(4) : domain;
    } catch {
      return url; // Return original if URL parsing fails
    }
  }

  /**
   * Check if a domain is a YouTube domain
   */
  private isYoutubeLink(domain: string): boolean {
    return domain === 'youtube.com' || domain === 'youtu.be';
  }

  /**
   * Categorize a link based on its domain and URL
   */
  private categorizeLink(url: string, domain: string): LinkCategory {
    // News sites
    if (domain.includes('news') || domain.endsWith('.news')) {
      return LinkCategory.NEWS;
    }

    // Image hosts
    if (domain.includes('imgur') || domain.includes('image')) {
      return LinkCategory.IMAGE;
    }

    // Social media
    if (domain.includes('twitter') || domain.includes('facebook')) {
      return LinkCategory.SOCIAL;
    }

    // Archive sites
    if (domain.includes('archive')) {
      return LinkCategory.ARCHIVE;
    }

    // Reference sites
    if (domain.includes('wiki') || domain.includes('docs')) {
      return LinkCategory.REFERENCE;
    }

    return LinkCategory.OTHER;
  }

  /**
   * Extract links from post content
   */
  private extractLinks(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    return content.match(urlRegex) || [];
  }

  /**
   * Process a post to track its links
   */
  private processPost(
    post: Post, 
    domainMap: Map<string, DomainStats>,
    linkPosts: LinkPost[],
    thread: Thread
  ): void {
    if (!post.com) return;

    const links = this.extractLinks(post.com);
    
    for (const url of links) {
      const domain = this.getDomain(url);
      
      // Skip YouTube links
      if (this.isYoutubeLink(domain)) continue;
      
      // Skip if this is an OP post
      if (post.no === thread.no) continue;

      // Update domain stats
      const stats = domainMap.get(domain) || { domain, count: 0, lastSeen: 0 };
      stats.count++;
      stats.lastSeen = Date.now();
      domainMap.set(domain, stats);

      // Create tracked link
      const trackedLink: TrackedLink = {
        url,
        domain,
        category: this.categorizeLink(url, domain)
      };

      // Create link post (without reply tracking)
      const linkPost: LinkPost = {
        sourcePost: post,
        link: trackedLink,
        threadId: thread.no,
        timestamp: post.time * 1000 // Convert to milliseconds
      };

      // Add to link posts array
      linkPosts.push(linkPost);
    }
  }

  /**
   * Analyze threads for links
   */
  async analyze(threads: Thread[]): Promise<LinkAnalyzerResult[]> {
    console.log('Starting link analysis...');
    
    const domainMap = new Map<string, DomainStats>();
    const linkPosts: LinkPost[] = [];
    let excludedYoutubeLinks = 0;
    let excludedOpLinks = 0;
    let totalLinksFound = 0;

    // Process each thread
    for (const thread of threads) {
      // Skip if thread has no posts
      if (!thread.posts) continue;

      // Process OP separately to count excluded links
      if (thread.com) {
        const opLinks = this.extractLinks(thread.com);
        excludedOpLinks += opLinks.length;
        totalLinksFound += opLinks.length;
      }

      // Process each post in thread
      for (const post of thread.posts) {
        if (!post.com) continue;

        const links = this.extractLinks(post.com);
        totalLinksFound += links.length;

        // Count YouTube links before skipping
        for (const url of links) {
          if (this.isYoutubeLink(this.getDomain(url))) {
            excludedYoutubeLinks++;
          }
        }

        this.processPost(post, domainMap, linkPosts, thread);
      }
    }

    // Sort and limit domains
    const topDomains = Array.from(domainMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, LinkAnalyzer.MAX_TOP_DOMAINS);

    // Get random selection of link posts
    const randomLinkPosts = linkPosts
      .sort(() => Math.random() - 0.5) // Shuffle array
      .slice(0, LinkAnalyzer.MAX_RANDOM_LINKS);

    console.log(`Found ${topDomains.length} domains and selected ${randomLinkPosts.length} random links`);

    // Single result with all the data
    return [{
      timestamp: Date.now(),
      threadId: randomLinkPosts[0]?.threadId || 0,
      postId: randomLinkPosts[0]?.sourcePost.no || 0,
      topDomains,
      randomLinks: randomLinkPosts,
      metadata: {
        totalLinksFound,
        uniqueDomains: domainMap.size,
        excludedYoutubeLinks,
        excludedOpLinks
      }
    }];
  }
} 