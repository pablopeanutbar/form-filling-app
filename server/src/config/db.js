import mongoose from 'mongoose';
import { env } from './env.js';

const READY_STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

let listenersAttached = false;

/**
 * Returns current database connection state.
 */
export const getDbStatus = () => {
  return READY_STATE_MAP[mongoose.connection.readyState] || 'unknown';
};

/**
 * Connect to MongoDB Atlas using Mongoose.
 * Idempotent: returns immediately if already connected.
 * Reports connection failures clearly without crashing the process.
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!env.MONGO_URI) {
    console.warn('[Database] WARNING: MONGO_URI is not set. Running without database connection.');
    return false;
  }

  // Set up connection event listeners once
  if (!listenersAttached) {
    mongoose.connection.on('connected', () => {
      console.log(`[Database] MongoDB connected successfully to host: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB connection lost (disconnected).');
    });

    listenersAttached = true;
  }

  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    return true;
  } catch (error) {
    console.error('[Database] ERROR: Failed to connect to MongoDB.');
    console.error(`[Database] Reason: ${error.message}`);
    console.error('[Database] Please verify your MONGO_URI in .env file and your MongoDB Atlas IP whitelist.');
    return false;
  }
};

/**
 * Disconnect from MongoDB Atlas cleanly.
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed.');
  }
};
