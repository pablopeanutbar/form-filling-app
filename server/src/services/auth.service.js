import argon2 from 'argon2';
import { User } from '../models/user.model.js';

/**
 * Hash a plain text password using Argon2id with memory-hard parameters.
 */
export const hashPassword = async (password) => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
};

/**
 * Verify a plain text password against an Argon2id hash.
 */
export const verifyPassword = async (hash, password) => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
};

/**
 * Register a new user account.
 * Throws structured operational error on duplicate email or database validation failure.
 */
export const registerUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Pre-emptive duplicate check
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      status: 'active'
    });

    return user.toJSON();
  } catch (error) {
    // Handle MongoDB duplicate key collision race condition
    if (error.code === 11000) {
      const duplicateError = new Error('An account with this email address already exists');
      duplicateError.statusCode = 409;
      duplicateError.code = 'EMAIL_ALREADY_EXISTS';
      throw duplicateError;
    }
    throw error;
  }
};

/**
 * Verify user credentials for login.
 * Returns the user upon success or throws generic invalid credential error.
 */
export const authenticateUser = async ({ email, password }) => {
  const user = await User.findByEmailWithPassword(email);

  if (!user) {
    // Constant-time dummy verification could be used; standard generic message prevents user enumeration
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('Account is inactive or suspended');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  const isMatch = await verifyPassword(user.passwordHash, password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  return user.toJSON();
};

/**
 * Fetch a user by ID without sensitive passwordHash.
 */
export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    return null;
  }
  return user.toJSON();
};

