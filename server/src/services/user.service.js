import crypto from 'crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

const userService = {
  async createUser({ name, email, password, role }) {
    const existing = await User.findByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = hashPassword(password);
    const user = await User.create({ name, email, password: hashedPassword, role });
    return user;
  },

  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async getAllUsers(page, limit) {
    return User.findAll({ page, limit });
  },

  async updateUser(id, updates) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (updates.password) {
      updates.password = hashPassword(updates.password);
    }
    if (updates.email) {
      const existing = await User.findByEmail(updates.email);
      if (existing && existing.id !== id) {
        throw new AppError('Email already in use', 409);
      }
    }

    const updated = await User.update(id, updates);
    return updated;
  },

  async deleteUser(id) {
    const deleted = await User.delete(id);
    if (!deleted) {
      throw new AppError('User not found', 404);
    }
    return { message: 'User deleted successfully' };
  },
};

export default userService;
