import { Card } from './components/Card';
import { CardGrid } from './components/CardGrid';
import { Header } from './components/Header';
import { ThreadCount } from './components/ThreadCount';
import { ScraperButton } from './components/ScraperButton';
import { SummarizerButton } from './components/SummarizerButton';
import styles from './page.module.css';

type CardType = 'content' | 'control' | 'status';

interface BaseCard {
  id: string;
  type: CardType;
  title: string;
}

interface ContentCard extends BaseCard {
  type: 'content';
  content: string;
}

interface ControlCard extends BaseCard {
  type: 'control';
  component: 'scraper';
}

interface StatusCard extends BaseCard {
  type: 'status';
  component: 'thread-count';
}

type CardItem = ContentCard | ControlCard | StatusCard;

const CardContent: React.FC<{ card: CardItem }> = ({ card }) => {
  switch (card.type) {
    case 'content':
      return (
        <>
          <h2>{card.title}</h2>
          <p>{card.content}</p>
        </>
      );
    case 'control':
      return (
        <>
          <h2>{card.title}</h2>
          <ScraperButton />
          <div style={{ marginTop: '1rem' }}>
            <SummarizerButton />
          </div>
        </>
      );
    case 'status':
      return (
        <>
          <h2>{card.title}</h2>
          <ThreadCount />
        </>
      );
  }
};

export default function Home() {
  // Regular content cards (first 13 cards)
  const contentCards: ContentCard[] = Array.from({ length: 13 }, (_, i) => ({
    id: `content-${i}`,
    type: 'content',
    title: `Card ${i + 1}`,
    content: 'Sample content for this card. Will be replaced with real data.'
  }));

  // Thread count card (14th card)
  const threadCountCard: StatusCard = {
    id: 'thread-count',
    type: 'status',
    title: 'Card 14',
    component: 'thread-count'
  };

  // Scraper control card (15th card)
  const scraperCard: ControlCard = {
    id: 'scraper-control',
    type: 'control',
    title: 'Card 15',
    component: 'scraper'
  };

  // Combine all cards in the same order as before
  const cardLayout: CardItem[] = [
    ...contentCards,
    threadCountCard,
    scraperCard
  ];

  return (
    <>
      <Header />
      <main className={styles.main}>
        <CardGrid>
          {cardLayout.map((card, index) => (
            <Card key={card.id} className={index === 0 ? styles.pinkCard : ''}>
              <CardContent card={card} />
            </Card>
          ))}
        </CardGrid>
      </main>
    </>
  );
}
