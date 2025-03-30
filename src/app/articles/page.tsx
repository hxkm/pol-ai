import { promises as fs } from 'fs'
import path from 'path'

async function getArticles(): Promise<string> {
  try {
    const publicDir = path.resolve(process.cwd(), 'public', 'data')
    const articlesPath = path.resolve(publicDir, 'articles.json')
    const data = await fs.readFile(articlesPath, 'utf-8')
    return data
  } catch (error) {
    console.error('Error reading articles:', error)
    return '[]'
  }
}

export default async function ArticlesPage() {
  const rawJson = await getArticles()

  return (
    <pre style={{ 
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      {rawJson}
    </pre>
  )
} 