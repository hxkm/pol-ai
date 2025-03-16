# Pol-AI

A Next.js application for analyzing online discourse using AI. The system scrapes content, generates summaries, and performs antisemitism analysis using the DeepSeek API.

## Features

- Thread scraping and data collection
- AI-powered content summarization
- Antisemitism matrix analysis
  - Theme identification
  - Statistical analysis
  - 48-hour trend tracking
- Web interface for monitoring and control

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pol-ai.git
cd pol-ai
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your DeepSeek API key:
```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TEMPERATURE=1.0
```

4. Create required directories:
```bash
mkdir -p data/threads data/analysis
```

## Usage

### Development

Run the development server:
```bash
npm run dev
```

### Scripts

- `npm run scrape` - Run the thread scraper
- `npm run summarize` - Generate summaries and analysis
- `npm run clean` - Clean up old data
- `npm run test:matrix` - Test the antisemitism matrix analyzer

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## Project Structure

- `/src/app` - Next.js application code
  - `/api` - API routes
  - `/components` - React components
  - `/lib` - Core functionality
    - `/analyzers` - Analysis modules
    - `/scraper` - Data collection
  - `/types` - TypeScript type definitions
  - `/utils` - Utility functions

## Data Management

- Thread data is stored in `/data/threads`
- Analysis results are stored in `/data/analysis`
- Trend data is automatically cleaned after 48 hours
- File size limits and rotation are implemented for data management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
