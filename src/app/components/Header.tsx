import Image from 'next/image';
import Link from 'next/link';
import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <Link href="https://lampbylit.com" target="_blank" rel="noopener noreferrer">
        <Image
          src="/logo.png"
          alt="&amp Logo"
          width={120}
          height={40}
          priority
          className={styles.logo}
        />
      </Link>
    </header>
  );
}; 