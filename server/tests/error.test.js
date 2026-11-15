import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { notFoundHandler } from '../src/middleware/notFound.middleware.js';

describe('Error & 404 Middleware Tests', () => {
  test('notFoundHandler returns structured 404 response', () => {
    let responseStatus = null;
    let responseBody = null;

    const req = { method: 'GET', originalUrl: '/api/v1/invalid' };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    notFoundHandler(req, res);

    assert.equal(responseStatus, 404);
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.error.code, 'NOT_FOUND');
    assert.equal(responseBody.error.message, 'Resource not found: GET /api/v1/invalid');
  });

  test('errorHandler formats custom status code and message', () => {
    let responseStatus = null;
    let responseBody = null;

    const error = new Error('Invalid input');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';

    const req = { method: 'POST', path: '/api/v1/test' };
    const res = {
      headersSent: false,
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };
    const next = () => {};

    errorHandler(error, req, res, next);

    assert.equal(responseStatus, 400);
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.error.code, 'VALIDATION_ERROR');
    assert.equal(responseBody.error.message, 'Invalid input');
  });

  test('errorHandler masks 500 error messages when in production mode', () => {
    let responseStatus = null;
    let responseBody = null;

    const error = new Error('Sensitive database leak detail');

    const req = { method: 'GET', path: '/api/v1/test' };
    const res = {
      headersSent: false,
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };
    const next = () => {};

    errorHandler(error, req, res, next);

    assert.equal(responseStatus, 500);
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.error.code, 'INTERNAL_SERVER_ERROR');
  });
});

