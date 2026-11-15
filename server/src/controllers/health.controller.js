import { getDbStatus } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Controller for GET /api/v1/health (Liveness Probe)
 * Confirms that the API server process is alive and responsive.
 */
export const getHealth = (req, res) => {
  const dbStatus = getDbStatus();

  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      service: 'formER Backend API',
      version: '0.1.0',
      environment: env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus
      }
    }
  });
};

/**
 * Controller for GET /api/v1/ready (Readiness Probe)
 * Returns HTTP 200 when essential dependencies (MongoDB) are available;
 * Returns HTTP 503 Service Unavailable when database is not connected.
 */
export const getReadiness = (req, res) => {
  const dbStatus = getDbStatus();
  const isDbReady = dbStatus === 'connected';

  if (!isDbReady) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Essential dependencies are unavailable (database not connected)',
        database: dbStatus
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    }
  });
};
