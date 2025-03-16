import fs from 'fs';
import path from 'path';
import { paths } from '../utils/paths';
import { Thread, AnalyzerResult, AnalyzerStorage, Analyzer } from '../../types/interfaces';

// Configuration constants
const MAX_RESULT_AGE_DAYS = 3;
const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk
const MIN_DISK_SPACE = 500 * 1024 * 1024; // 500MB minimum free space
const MAX_CHUNKS = 5; // Maximum number of chunk files to keep

type LogDataValue = string | number | boolean | Error | fs.Stats | Date | null | undefined;
type LogDataRecord = Record<string, unknown>;

interface BaseLogData {
  category: string;
  message: string;
  data?: LogDataRecord;
}

interface DiskSpaceData {
  type: 'disk';
  required: number;
  available: number;
  sufficient: boolean;
}

interface ChunkData {
  type: 'chunk';
  remainingChunks: number;
  dataSize?: number;
  recordCount?: number;
}

interface StorageData {
  type: 'storage';
  lastUpdated: string | Date;
  resultCount: number;
  totalResults?: number;
  newResults?: number;
}

interface DirectoryData {
  type: 'directory';
  stats: fs.Stats;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
}

interface ErrorData {
  type: 'error';
  error: Error | string;
  context?: Record<string, string | number>;
}

interface ValidationData {
  type: 'validation';
  result: unknown;
  isValid: boolean;
  threadId?: number;
  postId?: number;
}

interface PurgeData {
  type: 'purge';
  originalCount: number;
  remainingCount: number;
  purgedCount: number;
}

type LogData = 
  | DiskSpaceData 
  | ChunkData 
  | StorageData 
  | DirectoryData 
  | ErrorData 
  | ValidationData 
  | PurgeData;

/**
 * Enhanced logging function for analyzers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logAnalyzer(analyzer: string, category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${analyzer.toUpperCase()}:${category}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(`[${timestamp}] [${analyzer.toUpperCase()}:${category}:DATA]`, data);
  }
}

/**
 * Base class for all analyzers
 */
export abstract class BaseAnalyzer<T extends AnalyzerResult> implements Analyzer<T> {
  abstract name: string;
  abstract description: string;
  abstract analyze(threads: Thread[]): Promise<T[]>;

  protected get storagePath(): string {
    return path.join(paths.dataDir, 'analysis', this.name);
  }

  protected get storageFile(): string {
    return path.join(this.storagePath, 'results.json');
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      logAnalyzer(this.name, 'DISK', `Checking disk space for ${this.storagePath}`);
      const stats = await fs.promises.statfs(this.storagePath);
      const freeSpace = stats.bfree * stats.bsize;
      const freeSpaceMB = Math.floor(freeSpace / (1024 * 1024));
      
      logAnalyzer(this.name, 'DISK', `Available space: ${freeSpaceMB}MB`, {
        required: Math.floor(MIN_DISK_SPACE / (1024 * 1024)),
        available: freeSpaceMB,
        sufficient: freeSpace >= MIN_DISK_SPACE
      });
      
      return freeSpace >= MIN_DISK_SPACE;
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', 'Could not check disk space:', error);
      return true; // Assume space is available if check fails
    }
  }

  /**
   * Get chunk file path
   */
  private getChunkPath(index: number): string {
    return path.join(this.storagePath, `chunk_${index}.json`);
  }

  /**
   * Rotate chunk files
   */
  private async rotateChunks(): Promise<void> {
    try {
      logAnalyzer(this.name, 'CHUNKS', 'Starting chunk rotation');
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      logAnalyzer(this.name, 'CHUNKS', `Found ${chunkFiles.length} chunk files`);

      // Remove oldest chunks if we have too many
      while (chunkFiles.length >= MAX_CHUNKS) {
        const oldestChunk = chunkFiles.shift();
        if (oldestChunk) {
          logAnalyzer(this.name, 'CHUNKS', `Removing old chunk: ${oldestChunk}`);
          await fs.promises.unlink(path.join(this.storagePath, oldestChunk));
        }
      }
      
      logAnalyzer(this.name, 'CHUNKS', 'Chunk rotation complete', {
        remainingChunks: chunkFiles.length
      });
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error rotating chunks:`, error);
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

    logAnalyzer(this.name, 'WRITE', `Creating new chunk file: ${chunkPath}`, {
      dataSize: JSON.stringify(data).length,
      recordCount: data.length
    });

    const tempFile = `${chunkPath}.tmp`;
    try {
      const chunk = {
        timestamp: Date.now(),
        data
      };

      await fs.promises.writeFile(tempFile, JSON.stringify(chunk, null, 2));
      await fs.promises.rename(tempFile, chunkPath);
      logAnalyzer(this.name, 'WRITE', `✓ Successfully wrote chunk file: ${chunkPath}`);
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Failed to write chunk file: ${chunkPath}`, error);
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
      logAnalyzer(this.name, 'VALIDATE', `Invalid result detected:`, result);
      return false;
    }
    return true;
  }

  /**
   * Initialize storage for this analyzer
   */
  protected async initStorage(): Promise<void> {
    try {
      logAnalyzer(this.name, 'INIT', `Initializing storage at ${this.storagePath}`);
      
      // Ensure the analyzer's directory exists
      if (!fs.existsSync(this.storagePath)) {
        logAnalyzer(this.name, 'INIT', `Creating analyzer directory: ${this.storagePath}`);
        await fs.promises.mkdir(this.storagePath, { recursive: true });
      }

      // Create empty storage if it doesn't exist
      if (!fs.existsSync(this.storageFile)) {
        logAnalyzer(this.name, 'INIT', `Creating empty storage file: ${this.storageFile}`);
        const emptyStorage: AnalyzerStorage<T> = {
          lastUpdated: Date.now(),
          results: []
        };
        await this.writeStorage(emptyStorage);
      }
      
      logAnalyzer(this.name, 'INIT', '✓ Storage initialization complete');
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Storage initialization failed:`, error);
      throw new Error(`Storage initialization failed for ${this.name}`);
    }
  }

  /**
   * Read the current storage state
   */
  protected async readStorage(): Promise<AnalyzerStorage<T>> {
    try {
      await this.initStorage();
      
      logAnalyzer(this.name, 'READ', `Reading storage file: ${this.storageFile}`);
      
      // Read main storage file
      const data = await fs.promises.readFile(this.storageFile, 'utf-8');
      const storage = JSON.parse(data) as AnalyzerStorage<T>;
      
      // Validate storage structure
      if (!storage.lastUpdated || !Array.isArray(storage.results)) {
        throw new Error('Invalid storage format');
      }
      
      logAnalyzer(this.name, 'READ', `✓ Successfully read storage`, {
        lastUpdated: new Date(storage.lastUpdated).toISOString(),
        resultCount: storage.results.length
      });
      
      return storage;
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error reading storage:`, error);
      return { lastUpdated: Date.now(), results: [] };
    }
  }

  /**
   * Write storage state to disk with chunking
   */
  protected async writeStorage(storage: AnalyzerStorage<T>): Promise<void> {
    logAnalyzer(this.name, 'WRITE', 'Writing storage state');
    
    // Check disk space
    if (!await this.checkDiskSpace()) {
      throw new Error('Insufficient disk space');
    }

    const tempFile = `${this.storageFile}.tmp`;
    try {
      // If data is too large, chunk it
      const dataString = JSON.stringify(storage, null, 2);
      if (dataString.length > MAX_CHUNK_SIZE) {
        logAnalyzer(this.name, 'WRITE', 'Data exceeds chunk size limit, splitting into chunks', {
          size: dataString.length,
          limit: MAX_CHUNK_SIZE
        });
        
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
        logAnalyzer(this.name, 'WRITE', '✓ Successfully wrote chunked storage');
      } else {
        // Write normally if data is small enough
        await fs.promises.writeFile(tempFile, dataString);
        logAnalyzer(this.name, 'WRITE', '✓ Successfully wrote storage file');
      }
      await fs.promises.rename(tempFile, this.storageFile);
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error writing storage:`, error);
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
      logAnalyzer(this.name, 'SAVE', `Saving ${results.length} new results`);
      
      // Validate results before saving
      const validResults = results.filter(result => this.validateResult(result));
      
      if (validResults.length !== results.length) {
        logAnalyzer(this.name, 'WARN', `${results.length - validResults.length} invalid results were filtered out`);
      }

      // Check disk space
      if (!await this.checkDiskSpace()) {
        throw new Error('Insufficient disk space');
      }

      // If results are too large, write directly to a new chunk
      if (JSON.stringify(validResults).length > MAX_CHUNK_SIZE) {
        logAnalyzer(this.name, 'SAVE', 'Results exceed chunk size, writing to new chunk');
        await this.writeChunk(validResults);
        return;
      }

      // Otherwise, update main storage
      const storage = await this.readStorage();
      storage.results = [...storage.results, ...validResults];
      storage.lastUpdated = Date.now();
      
      await this.writeStorage(storage);
      logAnalyzer(this.name, 'SAVE', '✓ Successfully saved results', {
        newResults: validResults.length,
        totalResults: storage.results.length
      });
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error saving results:`, error);
      throw error;
    }
  }

  /**
   * Load all current results
   */
  async loadResults(): Promise<T[]> {
    try {
      logAnalyzer(this.name, 'LOAD', 'Loading all results');
      const storage = await this.readStorage();
      let results = [...storage.results];

      // Load chunks if they exist
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      if (chunkFiles.length > 0) {
        logAnalyzer(this.name, 'LOAD', `Loading ${chunkFiles.length} chunk files`);
      }

      for (const chunkFile of chunkFiles) {
        try {
          const chunkData = await fs.promises.readFile(
            path.join(this.storagePath, chunkFile),
            'utf-8'
          );
          const chunk = JSON.parse(chunkData);
          if (Array.isArray(chunk.data)) {
            results = results.concat(chunk.data);
            logAnalyzer(this.name, 'LOAD', `✓ Loaded chunk: ${chunkFile}`, {
              recordCount: chunk.data.length
            });
          }
        } catch (error) {
          logAnalyzer(this.name, 'ERROR', `Error loading chunk ${chunkFile}:`, error);
        }
      }

      logAnalyzer(this.name, 'LOAD', '✓ Successfully loaded all results', {
        totalResults: results.length
      });
      return results;
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error loading results:`, error);
      return [];
    }
  }

  /**
   * Remove results older than MAX_RESULT_AGE_DAYS
   */
  async purgeOldResults(): Promise<void> {
    try {
      logAnalyzer(this.name, 'PURGE', 'Starting result purge');
      
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
        logAnalyzer(this.name, 'PURGE', `Purged ${purgedCount} old results`);
      }
      
      // Also purge old chunks
      const files = await fs.promises.readdir(this.storagePath);
      const chunkFiles = files
        .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort();

      for (const chunkFile of chunkFiles) {
        try {
          const chunkPath = path.join(this.storagePath, chunkFile);
          const chunkData = await fs.promises.readFile(chunkPath, 'utf-8');
          const chunk = JSON.parse(chunkData);
          
          if (chunk.timestamp < cutoff) {
            await fs.promises.unlink(chunkPath);
            logAnalyzer(this.name, 'PURGE', `✓ Purged old chunk: ${chunkFile}`);
          }
        } catch (error) {
          logAnalyzer(this.name, 'ERROR', `Error purging chunk ${chunkFile}:`, error);
        }
      }

      await this.writeStorage(storage);
      logAnalyzer(this.name, 'PURGE', '✓ Purge complete', {
        originalCount,
        remainingCount: storage.results.length,
        purgedCount
      });
    } catch (error) {
      logAnalyzer(this.name, 'ERROR', `Error purging results:`, error);
      throw error;
    }
  }
} 