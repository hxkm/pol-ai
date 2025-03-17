# Summarizer File Writing Setup

## Directory Structure
```
/data
  /analysis
    /get
    /reply
    /link
    /geo
    /slur
    /media
    latest-summary.json
  /threads
  /summaries
```

## Key Components

1. **Directory Creation**
- Ensure all directories exist before writing
- Set proper permissions (777 for directories, 666 for files) in Railway environment
- Create directories recursively if they don't exist

2. **File Writing Pattern**
```typescript
// Always use atomic writes with temp files
const tempFile = `${finalPath}.tmp`;
try {
  // Write to temp file first
  await fs.promises.writeFile(
    tempFile,
    JSON.stringify(data, null, 2),
    'utf-8'
  );

  // Set permissions in Railway
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    await fs.promises.chmod(tempFile, '666');
  }

  // Atomic rename
  await fs.promises.rename(tempFile, finalPath);

  // Set final permissions in Railway
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    await fs.promises.chmod(finalPath, '666');
  }
} catch (error) {
  // Clean up temp file if something goes wrong
  if (fs.existsSync(tempFile)) {
    await fs.promises.unlink(tempFile).catch(() => {});
  }
  throw error;
}
```

3. **Permission Setup**
```typescript
// For directories
await fs.promises.mkdir(dir, { recursive: true });
if (process.env.RAILWAY_ENVIRONMENT === 'production') {
  await fs.promises.chmod(dir, '777');
}

// For files
if (process.env.RAILWAY_ENVIRONMENT === 'production') {
  await fs.promises.chmod(file, '666');
}
```

4. **Key Files to Write**
- `latest-summary.json`: Main summary output
- `{analyzer}/results.json`: Individual analyzer results
- `antisemitism-trends.json`: Historical trend data
- `categories.json`: Category analysis
- `examples.json`: Example data

## Critical Points
1. Always use atomic writes (temp file + rename)
2. Always set proper permissions in Railway
3. Always create directories before writing files
4. Always handle cleanup of temp files
5. Use proper error handling and logging

## Troubleshooting
1. Check directory permissions first
2. Verify directory exists before writing
3. Check for "permission denied" errors
4. Verify temp file cleanup on errors
5. Check Railway environment variable 