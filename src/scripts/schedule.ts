import { Scheduler } from '../app/lib/scheduler';

console.log('Starting scheduler...');
const scheduler = Scheduler.getInstance();
scheduler.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
}); 