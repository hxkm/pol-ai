import { Scheduler } from './lib/scheduler';
import { initializeApp } from './startup';

// Initialize the application and start the scheduler
async function initialize() {
  try {
    console.log('Starting application initialization...');
    
    // Wait for initialization to complete
    const initialized = await initializeApp();
    if (!initialized) {
      console.error('Application initialization failed, not starting scheduler');
      return;
    }
    
    console.log('Application initialized successfully, starting scheduler...');
    const scheduler = Scheduler.getInstance();
    await scheduler.start();
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

// Start initialization when this module is imported
initialize().catch(error => {
  console.error('Fatal initialization error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  const scheduler = Scheduler.getInstance();
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  const scheduler = Scheduler.getInstance();
  scheduler.stop();
  process.exit(0);
}); 