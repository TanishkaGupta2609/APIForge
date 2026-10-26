import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB with automatic retry and event listeners.
 *
 * @param {string} [customUri] - Optional MongoDB URI override (e.g. for testing)
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase(customUri = null) {
  const uri = customUri || (env.NODE_ENV === 'test' ? env.MONGODB_TEST_URI : env.MONGODB_URI);

  // If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production',
    });

    if (env.NODE_ENV !== 'test') {
      console.log(`[APIForge Database] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    }

    return conn;
  } catch (error) {
    console.error(`[APIForge Database] MongoDB Connection Error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB gracefully.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Check whether database is currently connected.
 *
 * @returns {boolean}
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

// Global Connection Event Listeners
mongoose.connection.on('disconnected', () => {
  if (env.NODE_ENV !== 'test') {
    console.warn('[APIForge Database] MongoDB disconnected.');
  }
});

mongoose.connection.on('reconnected', () => {
  if (env.NODE_ENV !== 'test') {
    console.log('[APIForge Database] MongoDB reconnected.');
  }
});

export default {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
};
