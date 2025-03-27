import { Card } from './components/Card';
import { CardGrid } from './components/CardGrid';
import { Header } from './components/Header';
import { ThreadCount } from './components/ThreadCount';
import { ScraperButton } from './components/ScraperButton';
import { SummarizerButton } from './components/SummarizerButton';
import { AntisemitismStats } from './components/AntisemitismStats';
import StagePost from './components/StagePost';
import { Card3 } from './components/Card3';
import Card4 from './components/Card4';
import Card6 from './components/Card6';
import TopLinkDomains from './components/TopLinkDomains';
import RareFlags from './components/RareFlags';
import CommonFlags from './components/CommonFlags';
import ArticleCard from './components/ArticleCard';
import BigPictureArticle from './components/BigPictureArticle';
import SparklingLogo from './components/SparklingLogo';
import { FlippableCard } from './components/FlippableCard';
import RecentXPosts from './components/RecentXPosts';
import ChanCatalogView from './components/ChanCatalogView';
import WarningOverlay from './components/WarningOverlay';
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
      if (card.id === 'content-0') {
        return <AntisemitismStats />;
      }
      if (card.id === 'content-1') {
        return (
          <>
            <h2 style={{ textAlign: 'left' }}>{card.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <StagePost position="top" cardType="gets" />
              <StagePost position="bottom" cardType="gets" />
            </div>
          </>
        );
      }
      if (card.id === 'content-2') {
        return <Card3 />;
      }
      if (card.id === 'content-3') {
        return <Card4 />;
      }
      if (card.id === 'content-4') {
        return (
          <>
            <h2>{card.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <StagePost position="top" cardType="insights" />
              <StagePost position="middle" cardType="insights" />
              <StagePost position="bottom" cardType="insights" />
            </div>
          </>
        );
      }
      if (card.id === 'content-5') {
        return <Card6 />;
      }
      if (card.id === 'content-6') {
        return (
          <>
            <h2>{card.title}</h2>
            <TopLinkDomains />
          </>
        );
      }
      if (card.id === 'content-7') {
        return (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'white' }}>Discourse Overview</h2>
            <BigPictureArticle />
          </>
        );
      }
      if (card.id === 'content-8') {
        return (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{card.title}</h2>
            <RareFlags />
          </>
        );
      }
      if (card.id === 'content-9') {
        return (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{card.title}</h2>
            <ThreadCount />
          </>
        );
      }
      if (card.id === 'content-10') {
        return <SparklingLogo />;
      }
      if (card.id === 'content-11') {
        return (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{card.title}</h2>
            <CommonFlags />
          </>
        );
      }
      if (card.id === 'content-12') {
        return <ArticleCard />;
      }
      if (card.id.startsWith('content-') && parseInt(card.id.split('-')[1]) >= 13 && parseInt(card.id.split('-')[1]) <= 23) {
        const articleIndex = parseInt(card.id.split('-')[1]) - 12;
        return <ArticleCard index={articleIndex} />;
      }
      if (card.id === 'content-24') {
        return <ArticleCard index={10} />;
      }
      if (card.id === 'bottom-left-card') {
        return (
          <div style={{ width: '100%', background: 'white' }}>
            <RecentXPosts />
          </div>
        );
      }
      if (card.id === 'bottom-right-card') {
        return (
          <div style={{ position: 'relative', minHeight: '800px', width: '100%', margin: 0, padding: 0 }}>
            <ChanCatalogView />
          </div>
        );
      }
      return (
        <>
          <h2>{card.title}</h2>
          {card.id !== 'content-9' && <p>{card.content}</p>}
        </>
      );
    case 'control':
      return (
        <>
          <h2 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem', 
            color: 'inherit',
            textAlign: 'center',
            width: '100%'
          }}>
            2050 © &amp
          </h2>
          <div style={{ display: 'none' }}>
            <ScraperButton />
            <div style={{ marginTop: '1rem' }}>
              <SummarizerButton />
            </div>
          </div>
        </>
      );
    case 'status':
      return (
        <>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#333', fontWeight: 500 }}>{card.title}</h2>
          <ThreadCount />
        </>
      );
  }
};

export default function Home() {
  // Regular content cards (first 25 cards)
  const contentCards: ContentCard[] = Array.from({ length: 25 }, (_, i) => ({
    id: `content-${i}`,
    type: 'content',
    title: i === 0 ? 'Antisemitism Per Post' : 
           i === 1 ? 'Most Significant GETs' :
           i === 4 ? 'Key Insights' :
           i === 6 ? 'Top Link Domains' :
           i === 8 ? 'Rarest Flags' :
           i === 9 ? 'Thread Count' :
           i === 11 ? 'Most Common Flags' :
           i === 12 ? '' :
           (i >= 13 && i <= 23) || i === 24 ? '' :  // Clear titles for article cards
           `Card ${i + 1}`,
    content: i === 0 ? '9.4% Medium' : 
             i === 1 ? '' :
             i === 4 ? '' :
             i === 6 ? '' :
             i === 8 ? '' :
             i === 9 ? '' :
             i === 11 ? '' :
             i === 12 ? '' :
             i >= 13 ? '' :  // Clear content for article cards
             'Sample content for this card. Will be replaced with real data.'
  }));

  // Scraper control card (15th card)
  const scraperCard: ControlCard = {
    id: 'scraper-control',
    type: 'control',
    title: '',
    component: 'scraper'
  };

  // Combine all cards in the same order as before
  const cardLayout: CardItem[] = [
    ...contentCards,
    scraperCard,
    {
      id: 'bottom-left-card',
      type: 'content',
      title: 'Live Catalog View',
      content: ''
    },
    {
      id: 'bottom-right-card',
      type: 'content',
      title: '4chan Catalog View',
      content: ''
    }
  ];

  return (
    <>
      <WarningOverlay />
      <Header />
      <main className={styles.main}>
        <CardGrid>
          {cardLayout.map((card, index) => {
            if (index === 0) {
              return (
                <FlippableCard key={card.id} className={styles.pinkCard}>
                  <CardContent card={card} />
                </FlippableCard>
              );
            }
            
            if (index === 1) {
              return (
                <FlippableCard key={card.id} className={styles.neonCard} backContent="About">
                  <CardContent card={card} />
                </FlippableCard>
              );
            }
            
            return (
              <Card key={card.id} className={`
                ${index === 3 ? styles.cyanCard : ''}
                ${index === 4 ? styles.orangeCard : ''}
                ${index === 6 ? styles.purpleCard : ''}
                ${index === 7 ? styles.blackCard : ''}
                ${index === 9 ? styles.blackCard : ''}
                ${index === 10 ? styles.blackCard : ''}
                ${index === 12 ? styles.neonGreenCard : ''}
                ${index === 15 ? styles.brightBlueCard : ''}
                ${index === 16 ? styles.magentaCard : ''}
                ${index === 17 ? styles.goldCard : ''}
                ${index === 18 ? styles.indigoCard : ''}
                ${index === 19 ? styles.limeCard : ''}
                ${index === 20 ? styles.crimsonCard : ''}
                ${index === 21 ? styles.turquoiseCard : ''}
                ${index === 22 ? styles.hidden : ''}
                ${index === 23 ? styles.brightGreenCard : ''}
                ${index === 24 ? styles.purpleCard : ''}
                ${card.id === 'bottom-left-card' || card.id === 'bottom-right-card' ? styles.noPadding : ''}
              `.trim()}>
                <CardContent card={card} />
              </Card>
            );
          })}
        </CardGrid>
      </main>
    </>
  );
}
