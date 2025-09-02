import { Request, Response, NextFunction } from 'express';
import studentProgressService from '../services/studentProgressService';
import userService from '../services/userService';
import { NotFoundError } from '../utils/errors';

/**
 * Get progress for the authenticated student
 */
export const getMyProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }

    const progress = await studentProgressService.getStudentProgressById(userId.toString());
    
    return res.status(200).json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress for a specific student (for planners)
 */
export const getStudentProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const plannerId = req.user?._id;
    
    if (!plannerId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }
    
    // Check if planner manages this student
    const student = await userService.getUserById(studentId);
    if (!student) {
      throw new NotFoundError('학생을 찾을 수 없습니다.');
    }
    
    if (student.profile.assignedPlanner?.toString() !== plannerId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: '이 학생의 진도를 볼 권한이 없습니다.'
        }
      });
    }
    
    const progress = await studentProgressService.getStudentProgressById(studentId);
    
    return res.status(200).json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress for all students managed by the planner
 */
export const getAllStudentsProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plannerId = req.user?._id;
    
    if (!plannerId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }
    
    // Get all students managed by this planner
    const students = await userService.getStudentsByPlannerId(plannerId.toString());
    const studentIds = students.map(student => student._id.toString());
    
    // Get progress for all students
    const progressData = await studentProgressService.getProgressForStudents(studentIds);
    
    return res.status(200).json({
      success: true,
      data: progressData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update a goal for a student
 */
export const addOrUpdateGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { goal } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }
    
    // Validate goal data
    if (!goal || !goal.id || !goal.title || !goal.description || goal.targetValue === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: '목표 데이터가 유효하지 않습니다.'
        }
      });
    }
    
    const progress = await studentProgressService.addOrUpdateGoal(userId.toString(), goal);
    
    return res.status(200).json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Share progress with another user (parent)
 */
export const shareProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { shareWithEmail } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }
    
    // Find user by email
    const shareWithUser = await userService.getUserByEmail(shareWithEmail);
    if (!shareWithUser) {
      throw new NotFoundError('공유할 사용자를 찾을 수 없습니다.');
    }
    
    const progress = await studentProgressService.shareProgressWith(
      userId.toString(), 
      shareWithUser._id.toString()
    );
    
    return res.status(200).json({
      success: true,
      data: {
        message: '진도가 성공적으로 공유되었습니다.',
        sharedWith: shareWithUser.profile.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shared progress (for parents or planners)
 */
export const getSharedProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '인증이 필요합니다.'
        }
      });
    }
    
    const sharedProgress = await studentProgressService.getSharedProgressForUser(userId.toString());
    
    // Get student details for each progress
    const progressWithStudentDetails = await Promise.all(
      sharedProgress.map(async (progress) => {
        const student = await userService.getUserById(progress.studentId.toString());
        return {
          ...progress.toObject(),
          studentName: student?.profile.name || 'Unknown',
          studentLevel: student?.profile.learningLevel || 'beginner'
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      data: progressWithStudentDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyProgress,
  getStudentProgress,
  getAllStudentsProgress,
  addOrUpdateGoal,
  shareProgress,
  getSharedProgress
};