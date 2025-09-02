import mongoose from 'mongoose';
import { StudentProgress, IStudentProgress, IAchievement, IGoal } from '../models/StudentProgress';
import { HomeworkSubmission } from '../models/HomeworkSubmission';
import { Homework } from '../models/Homework';
import { Lesson } from '../models/Lesson';
import { NotFoundError } from '../utils/errors';

/**
 * Get student progress by student ID
 */
export const getStudentProgressById = async (studentId: string): Promise<IStudentProgress> => {
  const progress = await StudentProgress.findOne({ studentId: new mongoose.Types.ObjectId(studentId) });
  
  if (!progress) {
    // If no progress record exists, create a new one
    return await createStudentProgress(studentId);
  }
  
  return progress;
};

/**
 * Create a new student progress record
 */
export const createStudentProgress = async (studentId: string): Promise<IStudentProgress> => {
  const newProgress = new StudentProgress({
    studentId: new mongoose.Types.ObjectId(studentId),
    overallScore: 0,
    completedHomework: 0,
    totalHomework: 0,
    streakDays: 0,
    lastActivityDate: new Date(),
    achievements: [],
    weeklyProgress: [],
    goals: [],
    sharedWith: []
  });
  
  return await newProgress.save();
};

/**
 * Update student progress after homework submission
 */
export const updateProgressAfterSubmission = async (
  studentId: string, 
  submissionId: string,
  score: number
): Promise<IStudentProgress> => {
  // Get or create progress record
  let progress = await getStudentProgressById(studentId);
  
  // Update overall score (weighted average)
  const totalItems = progress.completedHomework + 1;
  const newOverallScore = ((progress.overallScore * progress.completedHomework) + score) / totalItems;
  
  // Update streak
  const today = new Date();
  const lastActivity = progress.lastActivityDate;
  const dayDifference = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  let streakDays = progress.streakDays;
  if (dayDifference === 0) {
    // Same day, streak unchanged
  } else if (dayDifference === 1) {
    // Next day, streak increases
    streakDays += 1;
  } else {
    // More than one day passed, streak resets
    streakDays = 1;
  }
  
  // Get current week string (YYYY-WW format)
  const currentWeek = getWeekString(today);
  
  // Update weekly progress
  const weeklyProgressIndex = progress.weeklyProgress.findIndex(wp => wp.week === currentWeek);
  if (weeklyProgressIndex >= 0) {
    progress.weeklyProgress[weeklyProgressIndex].score = 
      (progress.weeklyProgress[weeklyProgressIndex].score * progress.weeklyProgress[weeklyProgressIndex].homeworkCount + score) / 
      (progress.weeklyProgress[weeklyProgressIndex].homeworkCount + 1);
    progress.weeklyProgress[weeklyProgressIndex].homeworkCount += 1;
  } else {
    progress.weeklyProgress.push({
      week: currentWeek,
      score: score,
      homeworkCount: 1
    });
  }
  
  // Check for achievements
  await checkAndUpdateAchievements(progress);
  
  // Update progress record
  progress.overallScore = newOverallScore;
  progress.completedHomework += 1;
  progress.streakDays = streakDays;
  progress.lastActivityDate = today;
  
  return await progress.save();
};

/**
 * Update total homework count for a student
 */
export const updateTotalHomework = async (studentId: string): Promise<IStudentProgress> => {
  const totalHomework = await Homework.countDocuments({
    studentIds: new mongoose.Types.ObjectId(studentId)
  });
  
  const progress = await getStudentProgressById(studentId);
  progress.totalHomework = totalHomework;
  
  return await progress.save();
};

/**
 * Add an achievement to student progress
 */
export const addAchievement = async (
  studentId: string, 
  achievement: Omit<IAchievement, 'unlockedAt'>
): Promise<IStudentProgress> => {
  const progress = await getStudentProgressById(studentId);
  
  // Check if achievement already exists
  const existingAchievement = progress.achievements.find(a => a.id === achievement.id);
  if (existingAchievement) {
    return progress;
  }
  
  // Add new achievement
  progress.achievements.push({
    ...achievement,
    unlockedAt: new Date()
  });
  
  return await progress.save();
};

/**
 * Add or update a goal for student
 */
export const addOrUpdateGoal = async (
  studentId: string,
  goal: Omit<IGoal, 'createdAt'>
): Promise<IStudentProgress> => {
  const progress = await getStudentProgressById(studentId);
  
  // Check if goal already exists
  const existingGoalIndex = progress.goals.findIndex(g => g.id === goal.id);
  
  if (existingGoalIndex >= 0) {
    // Update existing goal
    progress.goals[existingGoalIndex] = {
      ...goal,
      createdAt: progress.goals[existingGoalIndex].createdAt
    };
  } else {
    // Add new goal
    progress.goals.push({
      ...goal,
      createdAt: new Date()
    });
  }
  
  return await progress.save();
};

/**
 * Share progress with another user (planner or parent)
 */
export const shareProgressWith = async (
  studentId: string,
  userId: string
): Promise<IStudentProgress> => {
  const progress = await getStudentProgressById(studentId);
  
  // Check if already shared
  const alreadyShared = progress.sharedWith.some(id => id.toString() === userId);
  if (!alreadyShared) {
    progress.sharedWith.push(new mongoose.Types.ObjectId(userId));
    return await progress.save();
  }
  
  return progress;
};

/**
 * Unshare progress with a user
 */
export const unshareProgressWith = async (
  studentId: string,
  userId: string
): Promise<IStudentProgress> => {
  const progress = await getStudentProgressById(studentId);
  
  progress.sharedWith = progress.sharedWith.filter(id => id.toString() !== userId);
  return await progress.save();
};

/**
 * Get progress for all students managed by a planner
 */
export const getProgressForStudents = async (studentIds: string[]): Promise<IStudentProgress[]> => {
  return await StudentProgress.find({
    studentId: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }
  });
};

/**
 * Get shared progress for a user (planner or parent)
 */
export const getSharedProgressForUser = async (userId: string): Promise<IStudentProgress[]> => {
  return await StudentProgress.find({
    sharedWith: new mongoose.Types.ObjectId(userId)
  });
};

/**
 * Helper function to get week string in YYYY-WW format
 */
const getWeekString = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
  return `${d.getFullYear()}-${week.toString().padStart(2, '0')}`;
};

/**
 * Check and update achievements based on student progress
 */
const checkAndUpdateAchievements = async (progress: IStudentProgress): Promise<void> => {
  // Define achievement criteria
  const achievementCriteria = [
    {
      id: 'first-homework',
      name: '첫 숙제 완료',
      description: '첫 번째 숙제를 성공적으로 제출했습니다.',
      check: () => progress.completedHomework === 1
    },
    {
      id: 'five-homework',
      name: '꾸준한 학습자',
      description: '5개의 숙제를 완료했습니다.',
      check: () => progress.completedHomework === 5
    },
    {
      id: 'ten-homework',
      name: '열정적인 학습자',
      description: '10개의 숙제를 완료했습니다.',
      check: () => progress.completedHomework === 10
    },
    {
      id: 'perfect-score',
      name: '완벽한 제출',
      description: '100점 만점을 받았습니다.',
      check: () => {
        const submissions = progress.weeklyProgress.flatMap(wp => wp.score === 100 ? [wp] : []);
        return submissions.length > 0;
      }
    },
    {
      id: 'three-day-streak',
      name: '3일 연속 학습',
      description: '3일 연속으로 학습을 진행했습니다.',
      check: () => progress.streakDays >= 3
    },
    {
      id: 'seven-day-streak',
      name: '일주일 연속 학습',
      description: '7일 연속으로 학습을 진행했습니다.',
      check: () => progress.streakDays >= 7
    }
  ];
  
  // Check each achievement
  for (const criteria of achievementCriteria) {
    const hasAchievement = progress.achievements.some(a => a.id === criteria.id);
    if (!hasAchievement && criteria.check()) {
      progress.achievements.push({
        id: criteria.id,
        name: criteria.name,
        description: criteria.description,
        unlockedAt: new Date()
      });
    }
  }
};

export default {
  getStudentProgressById,
  createStudentProgress,
  updateProgressAfterSubmission,
  updateTotalHomework,
  addAchievement,
  addOrUpdateGoal,
  shareProgressWith,
  unshareProgressWith,
  getProgressForStudents,
  getSharedProgressForUser
};