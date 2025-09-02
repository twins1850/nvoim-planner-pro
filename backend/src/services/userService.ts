import { User, IUser } from '../models/User';
import { NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<IUser | null> => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<IUser | null> => {
  try {
    return await User.findOne({ email: email.toLowerCase() });
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

/**
 * Get users by IDs
 */
export const getUsersByIds = async (userIds: string[]): Promise<IUser[]> => {
  try {
    return await User.find({
      _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    return [];
  }
};

/**
 * Get users by role
 */
export const getUsersByRole = async (role: 'planner' | 'student'): Promise<IUser[]> => {
  try {
    return await User.find({ role });
  } catch (error) {
    console.error('Error getting users by role:', error);
    return [];
  }
};

/**
 * Get students managed by a planner
 */
export const getStudentsByPlannerId = async (plannerId: string): Promise<IUser[]> => {
  try {
    return await User.find({
      role: 'student',
      'profile.assignedPlanner': new mongoose.Types.ObjectId(plannerId)
    });
  } catch (error) {
    console.error('Error getting students by planner ID:', error);
    return [];
  }
};

/**
 * Get planner for a student
 */
export const getPlannerByStudentId = async (studentId: string): Promise<IUser | null> => {
  try {
    const student = await User.findById(studentId);
    if (!student || !student.profile.assignedPlanner) {
      return null;
    }
    
    return await User.findById(student.profile.assignedPlanner);
  } catch (error) {
    console.error('Error getting planner by student ID:', error);
    return null;
  }
};

export default {
  getUserById,
  getUserByEmail,
  getUsersByIds,
  getUsersByRole,
  getStudentsByPlannerId,
  getPlannerByStudentId
};