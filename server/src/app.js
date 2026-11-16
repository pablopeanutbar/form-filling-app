import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env, allowedOrigins, extensionIds } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { csrfErrorHandler } from './middleware/csrf.middleware.js';

const app = express();
const isProduction = env.NODE_ENV === 'production';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false
  })
);

// Cross-Origin Resource Sharing (Explicitly configured origins only - no broad extension trust)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, health probes)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isDevLocalhost =
      !isProduction &&
      (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));

    const isExtension = extensionIds.some((id) => origin === `chrome-extension://${id}`);
    if (isExplicitlyAllowed || isDevLocalhost || isExtension) {
      return callback(null, true);
    }

    const corsError = new Error(`Origin ${origin} not allowed by CORS`);
    corsError.statusCode = 403;
    corsError.code = 'CORS_FORBIDDEN';
    return callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Extension-Id']
};

app.use(cors(corsOptions));

// Body Parsing Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie Parser Middleware (required for CSRF and session cookies)
app.use(cookieParser(env.SESSION_SECRET));

// Persistent Session Management via MongoDB Store
export const sessionStore = MongoStore.create({
  mongoUrl: env.MONGO_URI,
  collectionName: 'sessions',
  ttl: Math.floor(env.SESSION_MAX_AGE_MS / 1000),
  autoRemove: env.NODE_ENV === 'test' ? 'disabled' : 'native',
  touchAfter: 24 * 3600 // Only update session TTL once per 24h unless session data changed
});

// Avoid crashing unhandled on store connection events
sessionStore.on('error', (err) => {
  console.error('[SessionStore] Session store error:', err.message);
});

app.use(
  session({
    name: 'former.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: env.SESSION_MAX_AGE_MS,
      path: '/'
    }
  })
);

// Mount API v1 Routes
app.use('/api/v1', apiRoutes);

// CSRF Error Handler
app.use(csrfErrorHandler);

// Catch-all 404 handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export const closeApp = async () => {
  try {
    if (sessionStore && typeof sessionStore.close === 'function') {
      await sessionStore.close();
    }
  } catch {}
};

export default app;
