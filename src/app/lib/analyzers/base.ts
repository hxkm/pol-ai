import fs from 'fs';
import path from 'path';
import { paths } from '@/app/utils/paths';
import { Thread, AnalyzerResult, AnalyzerStorage, Analyzer } from '../../types/interfaces';

// Configuration constants
const MAX_RESULT_AGE_DAYS = 3;
const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk
const MIN_DISK_SPACE = 500 * 1024 * 1024; // 500MB minimum free space
const MAX_CHUNKS = 5; // Maximum number of chunk files to keep

/**
 * Base class for all analyzers
 */
export abstract class BaseAnalyzer<T extends AnalyzerResult> implements Analyzer<T> {
  abstract name: string;
  abstract description: string;
  abstract analyze(threads: Thread[]): Promise<T[]>;

  protected get storagePath(): string {
    return path.resolve(paths.dataDir, 'analysis', this.name);
  }

  protected get storageFile(): string {
    return path.resolve(this.storagePath, 'results.json');
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      // On Windows, statfs is not available, so we'll skip the check
      if (process.platform === 'win32') {
        return true;
      }

      const stats = await fs.promises.statfs(this.storagePath);
      const freeSpace = stats.bfree * stats.bsize;
      return freeSpace >= MIN_DISK_SPACE;
    } catch (error) {
      console.warn(`Could not check disk space: ${error}`);
      return true; // Assume space is available if check fails
    }
  }

  /**
   * Get chunk file path
   */
  private getChunkPath(index: number): string {
    return path.resolve(this.storagePath, `chunk_${index}.json`);
  }

  /**
   * Rotate chunk files
   */
  private async rotateChunks(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      // Remove oldest chunks if we have too many
      while (chunkFiles.length >= MAX_CHUNKS) {
        const oldestChunk = chunkFiles.shift();
        if (oldestChunk) {
          await fs.promises.unlink(path.resolve(this.storagePath, oldestChunk));
        }
      }
    } catch (error) {
      console.error(`Error rotating chunks for ${this.name}:`, error);
    }
  }

  /**
   * Write data to a new chunk file
   */
  private async writeChunk(data: T[]): Promise<void> {
    await this.rotateChunks();

    const files = await fs.promises.readdir(this.storagePath);
    const chunkFiles = files.filter(f => f.startsWith('chunk_') && f.endsWith('.json'));
    const nextChunkIndex = chunkFiles.length;
    const chunkPath = this.getChunkPath(nextChunkIndex);

    const tempFile = `${chunkPath}.tmp`;
    try {
      const chunk = {
        timestamp: Date.now(),
        data
      };

      await fs.promises.writeFile(tempFile, JSON.stringify(chunk, null, 2));

      // Set proper permissions on temp file in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        await fs.promises.chmod(tempFile, '666');
      }

      await fs.promises.rename(tempFile, chunkPath);

      // Set proper permissions on final file in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        await fs.promises.chmod(chunkPath, '666');
      }
    } catch (error) {
      if (fs.existsSync(tempFile)) {
        await fs.promises.unlink(tempFile).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Validate a result before saving
   */
  protected validateResult(result: T): boolean {
    if (!result.timestamp || result.threadId === 0 || result.postId === 0) {
      console.error(`Invalid result in ${this.name}:`, result);
      return false;
    }
    return true;
  }

  /**
   * Initialize storage for this analyzer
   */
  protected async initStorage(): Promise<void> {
    try {
      // Ensure the analyzer's directory exists
      if (!fs.existsSync(this.storagePath)) {
        await fs.promises.mkdir(this.storagePath, { recursive: true });
        // Set directory permissions in Railway environment
        if (process.env.RAILWAY_ENVIRONMENT === 'production') {
          await fs.promises.chmod(this.storagePath, '777');
        }
      }

      // Create empty storage if it doesn't exist
      if (!fs.existsSync(this.storageFile)) {
        const emptyStorage: AnalyzerStorage<T> = {
          lastUpdated: Date.now(),
          results: []
        };
        const tempFile = `${this.storageFile}.tmp`;
        await fs.promises.writeFile(tempFile, JSON.stringify(emptyStorage, null, 2));
        
        // Set proper permissions on temp file in Railway environment
        if (process.env.RAILWAY_ENVIRONMENT === 'production') {
          await fs.promises.chmod(tempFile, '666');
        }

        await fs.promises.rename(tempFile, this.storageFile);
        
        // Set proper permissions on final file in Railway environment
        if (process.env.RAILWAY_ENVIRONMENT === 'production') {
          await fs.promises.chmod(this.storageFile, '666');
        }
      }
    } catch (error) {
      console.error(`Error initializing storage for ${this.name}:`, error);
      throw new Error(`Storage initialization failed for ${this.name}`);
    }
  }

  /**
   * Read the current storage state
   */
  protected async readStorage(): Promise<AnalyzerStorage<T>> {
    try {
      await this.initStorage();
      
      // Read main storage file
      const data = await fs.promises.readFile(this.storageFile, 'utf-8');
      const storage = JSON.parse(data) as AnalyzerStorage<T>;
      
      // Validate storage structure
      if (!storage.lastUpdated || !Array.isArray(storage.results)) {
        throw new Error('Invalid storage format');
      }
      
      return storage;
    } catch (error) {
      console.error(`Error reading storage for ${this.name}:`, error);
      return { lastUpdated: Date.now(), results: [] };
    }
  }

  /**
   * Write storage state to disk with chunking
   */
  protected async writeStorage(storage: AnalyzerStorage<T>): Promise<void> {
    // Check disk space
    if (!await this.checkDiskSpace()) {
      throw new Error('Insufficient disk space');
    }

    const tempFile = `${this.storageFile}.tmp`;
    try {
      // If data is too large, chunk it
      const dataString = JSON.stringify(storage, null, 2);
      if (dataString.length > MAX_CHUNK_SIZE) {
        // Split results into chunks
        const chunkSize = Math.ceil(storage.results.length / MAX_CHUNKS);
        const chunks = [];
        for (let i = 0; i < storage.results.length; i += chunkSize) {
          chunks.push(storage.results.slice(i, i + chunkSize));
        }

        // Write each chunk
        for (const chunk of chunks) {
          await this.writeChunk(chunk);
        }

        // Write main file with metadata only
        const metadataOnly = {
          lastUpdated: storage.lastUpdated,
          results: [], // Empty results in main file
          chunked: true
        };
        await fs.promises.writeFile(tempFile, JSON.stringify(metadataOnly, null, 2));
      } else {
        // Write normally if data is small enough
        await fs.promises.writeFile(tempFile, dataString);
      }

      // Set proper permissions on temp file in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        await fs.promises.chmod(tempFile, '666');
      }

      await fs.promises.rename(tempFile, this.storageFile);

      // Set proper permissions on final file in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        await fs.promises.chmod(this.storageFile, '666');
      }
    } catch (error) {
      console.error(`Error writing storage for ${this.name}:`, error);
      if (fs.existsSync(tempFile)) {
        await fs.promises.unlink(tempFile).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Save new results to storage
   */
  async saveResults(results: T[]): Promise<void> {
    try {
      // Validate results before saving
      const validResults = results.filter(result => this.validateResult(result));
      
      if (validResults.length !== results.length) {
        console.warn(`${this.name}: ${results.length - validResults.length} invalid results were filtered out`);
      }

      // Check disk space
      if (!await this.checkDiskSpace()) {
        throw new Error('Insufficient disk space');
      }

      // If results are too large, write directly to a new chunk
      if (JSON.stringify(validResults).length > MAX_CHUNK_SIZE) {
        await this.writeChunk(validResults);
        return;
      }

      // Otherwise, update main storage
      const storage = await this.readStorage();
      storage.results = [...storage.results, ...validResults];
      storage.lastUpdated = Date.now();
      
      await this.writeStorage(storage);
    } catch (error) {
      console.error(`Error saving results for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Load all current results
   */
  async loadResults(): Promise<T[]> {
    try {
      const storage = await this.readStorage();
      let results = [...storage.results];

      // Load chunks if they exist
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = await fs.promises.readFile(
            path.resolve(this.storagePath, chunkFile),
            'utf-8'
          );
          const chunk = JSON.parse(chunkData);
          if (Array.isArray(chunk.data)) {
            results = results.concat(chunk.data);
          }
        } catch (error) {
          console.error(`Error loading chunk ${chunkFile}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error(`Error loading results for ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Remove results older than MAX_RESULT_AGE_DAYS
   */
  async purgeOldResults(): Promise<void> {
    try {
      // Check disk space
      if (!await this.checkDiskSpace()) {
        throw new Error('Insufficient disk space');
      }

      const storage = await this.readStorage();
      const cutoff = Date.now() - (MAX_RESULT_AGE_DAYS * 24 * 60 * 60 * 1000);
      
      const originalCount = storage.results.length;
      storage.results = storage.results.filter(result => result.timestamp >= cutoff);
      storage.lastUpdated = Date.now();
      
      const purgedCount = originalCount - storage.results.length;
      if (purgedCount > 0) {
        console.log(`${this.name}: Purged ${purgedCount} old results`);
      }
      
      // Also purge old chunks
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      for (const chunkFile of chunkFiles) {
        try {
          const chunkPath = path.resolve(this.storagePath, chunkFile);
          const chunkData = await fs.promises.readFile(chunkPath, 'utf-8');
          const chunk = JSON.parse(chunkData);
          
          if (chunk.timestamp < cutoff) {
            await fs.promises.unlink(chunkPath);
            console.log(`${this.name}: Purged old chunk ${chunkFile}`);
          }
        } catch (error) {
          console.error(`Error purging chunk ${chunkFile}:`, error);
        }
      }

      await this.writeStorage(storage);
    } catch (error) {
      console.error(`Error purging results for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Remove specified files from storage
   */
  async removeFiles(files: string[]): Promise<void> {
    try {
      for (const file of files) {
        const filePath = path.resolve(this.storagePath, file);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (error) {
      console.error(`Error removing files for ${this.name}:`, error);
      throw error;
    }
  }
} 