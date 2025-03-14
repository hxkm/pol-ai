import { Card } from './components/Card';
import { CardGrid } from './components/CardGrid';
import { Header } from './components/Header';
import styles from './page.module.css';

export default function Home() {
  // Temporary array of 15 items for layout testing
  const tempItems = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    title: `Card ${i + 1}`,
    content: 'Sample content for this card. Will be replaced with real data.'
  }));

  return (
    <>
      <Header />
      <main className={styles.main}>
        <CardGrid>
          {tempItems.map(item => (
            <Card key={item.id}>
              <h2>{item.title}</h2>
              <p>{item.content}</p>
            </Card>
          ))}
        </CardGrid>
      </main>
    </>
  );
}
