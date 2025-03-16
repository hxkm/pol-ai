import { Scheduler } from './lib/scheduler';

// Start the scheduler when this module is imported
const scheduler = Scheduler.getInstance();
scheduler.start().catch(error => {
  console.error('Failed to start scheduler:', error);
});

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