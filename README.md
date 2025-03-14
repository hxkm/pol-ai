# &amp Information Portal

A web application that displays processed information from 4chan's /pol/ board using Next.js.

## Deployment on Railway

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add a persistent volume:
   - Mount point: `/data`
   - Size: 1GB (or as needed)

4. Set up environment variables:
```env
DATA_DIR=/data
NODE_ENV=production
PORT=8080
```

5. Deploy settings:
- Root Directory: ./
- Build Command: `npm run build`
- Start Command: `npm run start`

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run scraper
npm run scrape
```

## Project Structure

```
/
├── src/
│   └── app/
│       ├── components/     # React components
│       ├── lib/           # Backend logic
│       └── types/         # TypeScript types
├── public/               # Static assets
├── data/                # Data storage (mounted volume)
└── nixpacks.toml        # Railway configuration
```

## Project Overview

This application consists of three main components:

1. **Scraper**: Fetches thread data from 4chan's API following their rate limiting requirements
2. **Summarizer**: Processes thread content using DeepSeek AI to generate concise summaries
3. **Cleaner**: Manages data lifecycle by removing old threads and orphaned summaries

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm
- DeepSeek AI API key

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

```
DATA_DIR=/data
DEEPSEEK_API_KEY=your_key_here
NODE_ENV=development
PORT=3000
```

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Usage

### Running the Scraper

```bash
npm run scrape
```

This will fetch thread data from 4chan's /pol/ board and store it in the `/data/threads` directory.

### Running the Summarizer

```bash
npm run summarize
```

This will process thread data and generate summaries using DeepSeek AI, storing them in the `/data/summaries` directory.

### Running the Cleaner

```bash
npm run clean
```

This will remove old thread data and orphaned summaries to prevent excessive storage usage.

## Development Guidelines

- Follow TypeScript best practices
- Use functional programming patterns
- Implement proper error handling
- Respect 4chan's API rate limits
- Use atomic file operations for data integrity

## License

MIT
