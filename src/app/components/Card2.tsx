import styles from './Card2.module.css';
import StagePost from './StagePost';

export default function Card2() {
  return (
    <div className={styles.card}>
      <h2>Stage</h2>
      <div className={styles.content}>
        <StagePost position="top" />
        <StagePost position="bottom" />
      </div>
    </div>
  );
} 