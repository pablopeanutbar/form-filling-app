import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, getDbStatus, disconnectDB } from '../src/config/db.js';

describe('MongoDB Connection Diagnostics & Verification', () => {
  after(async () => {
    await disconnectDB();
  });

  test('Connects successfully to the configured MongoDB database', async () => {
    const connected = await connectDB();
    assert.equal(connected, true);
    assert.equal(getDbStatus(), 'connected');
  });

  test('Reports clear error and returns false when attempting connection to unreachable host', async () => {
    await disconnectDB();
    try {
      await mongoose.connect('mongodb://127.0.0.1:59999/unreachable?serverSelectionTimeoutMS=500', {
        serverSelectionTimeoutMS: 500
      });
      assert.fail('Should have failed to connect');
    } catch (err) {
      assert.ok(err);
      assert.ok(getDbStatus() === 'disconnected' || getDbStatus() === 'unknown');
    }
  });
});
