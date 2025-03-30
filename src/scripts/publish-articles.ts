import path from 'path'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'

interface Article {
  threadId: number
  headline: string
  article: string
  antisemiticStats: {
    analyzedComments: number
    antisemiticComments: number
    percentage: number
  }
  metadata: {
    totalPosts: number
    analyzedPosts: number
    generatedAt: number
  }
}

interface ArticlesData {
  articles: Article[]
}

async function publishArticles() {
  try {
    // Ensure data directories exist
    const dataDir = path.resolve(process.cwd(), 'data')
    const analysisDir = path.resolve(dataDir, 'analysis')
    const publicDir = path.resolve(process.cwd(), 'public', 'data')
    
    await fs.mkdir(analysisDir, { recursive: true })
    await fs.mkdir(publicDir, { recursive: true })

    // Read articles data
    const articlesPath = path.resolve(analysisDir, 'articles.json')
    let articlesData: ArticlesData = { articles: [] }
    
    try {
      const data = await fs.readFile(articlesPath, 'utf-8')
      articlesData = JSON.parse(data)
    } catch {
      console.log('No existing articles found, creating new file')
    }

    // Sort articles by metadata.generatedAt (newest first)
    articlesData.articles.sort((a, b) => b.metadata.generatedAt - a.metadata.generatedAt)

    // Write to public directory for client-side access
    const publicPath = path.resolve(publicDir, 'articles.json')
    await fs.writeFile(publicPath, JSON.stringify(articlesData, null, 2))

    console.log(`Successfully published ${articlesData.articles.length} articles to public/data/articles.json`)
    return NextResponse.json({ success: true, count: articlesData.articles.length })
  } catch (error) {
    console.error('Error publishing articles:', error)
    throw error
  }
}

// Execute if run directly
if (require.main === module) {
  publishArticles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to publish articles:', error)
      process.exit(1)
    })
}

export default publishArticles 