import mongoose from 'mongoose';
import { User } from '../models/User';
import { Lesson } from '../models/Lesson';
import { StudentProgress } from '../models/StudentProgress';
import HomeworkSubmission from '../models/HomeworkSubmission';
import { AppError } from '../utils/errors';

// Types for dashboard data
export interface StudentOverview {
  _id: string;
  name: string;
  email: string;
  learningLevel: string;
  lastActivity: Date | null;
  completedHomework: number;
  totalHomework: number;
  completionRate: number;
  averageScore: number;
  streakDays: number;
  requiresAttention: boolean;
  attentionReason?: string;
}

export interface ClassStatistics {
  totalStudents: number;
  activeStudents: number;
  averageCompletionRate: number;
  averageScore: number;
  homeworkCompletedThisWeek: number;
  homeworkCompletedLastWeek: number;
  weeklyChangePercentage: number;
  topPerformingStudents: {
    _id: string;
    name: string;
    score: number;
  }[];
  studentsRequiringAttention: {
    _id: string;
    name: string;
    reason: string;
  }[];
}

export interface DashboardData {
  studentOverviews: StudentOverview[];
  classStatistics: ClassStatistics;
}

export interface PerformanceTrend {
  period: string; // e.g., "2023-W01", "2023-01", etc.
  averageScore: number;
  completionRate: number;
  participationRate: number;
  studentCount: number;
}

export interface StudentPerformanceDetail {
  studentId: string;
  studentName: string;
  email: string;
  learningLevel: string;
  overallScore: number;
  completionRate: number;
  streakDays: number;
  weeklyProgress: {
    week: string;
    score: number;
    homeworkCount: number;
  }[];
  recentLessons: {
    lessonId: string;
    lessonDate: Date;
    participationLevel: number;
    pronunciationAccuracy: number;
    fluencyScore: number;
    grammarAccuracy: number;
  }[];
  recentSubmissions: {
    submissionId: string;
    homeworkId: string;
    submittedAt: Date;
    score: number;
    status: string;
    isLate: boolean;
  }[];
  improvementAreas: string[];
  strengths: string[];
}

export interface ReportTemplate {
  _id: string;
  name: string;
  description: string;
  sections: {
    type: 'performance' | 'lessons' | 'homework' | 'progress' | 'custom';
    title: string;
    dataFields: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'radar';
    customQuery?: any;
  }[];
  createdBy: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReport {
  _id: string;
  templateId: string;
  name: string;
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRunDate: Date;
  lastRunDate?: Date;
  status: 'active' | 'paused';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportFormat {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  options?: any;
}

class ReportingService {
  /**
   * Get dashboard data for a planner
   */
  async getDashboardData(plannerId: string): Promise<DashboardData> {
    try {
      // Get all students managed by this planner
      const planner = await User.findById(plannerId);
      if (!planner || planner.role !== 'planner') {
        throw new AppError('AUTHORIZATION_ERROR', '유효한 플래너가 아닙니다.', 'INVALID_PLANNER', 403);
      }

      const managedStudentIds = planner.profile.managedStudents || [];
      
      // Get student overviews
      const students = await User.find({
        _id: { $in: managedStudentIds },
        role: 'student'
      }).select('email profile.name profile.learningLevel lastLoginAt');

      // Get student progress data
      const studentProgress = await StudentProgress.find({
        studentId: { $in: managedStudentIds }
      });

      // Get recent homework submissions
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const recentSubmissions = await HomeworkSubmission.find({
        studentId: { $in: managedStudentIds },
        submittedAt: { $gte: twoWeeksAgo }
      }).select('studentId finalScore status submittedAt isLate');

      // Calculate student overviews
      const studentOverviews: StudentOverview[] = students.map(student => {
        const progress = studentProgress.find(p => p.studentId.toString() === student._id.toString());
        
        // Calculate student's recent submissions
        const studentSubmissions = recentSubmissions.filter(
          sub => sub.studentId.toString() === student._id.toString()
        );
        
        const completedSubmissions = studentSubmissions.filter(
          sub => sub.status === 'completed'
        );
        
        const averageScore = completedSubmissions.length > 0
          ? completedSubmissions.reduce((sum, sub) => sum + (sub.finalScore || 0), 0) / completedSubmissions.length
          : 0;
        
        // Determine if student requires attention
        let requiresAttention = false;
        let attentionReason = '';
        
        // No activity in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const hasRecentActivity = student.lastLoginAt && student.lastLoginAt > sevenDaysAgo;
        if (!hasRecentActivity) {
          requiresAttention = true;
          attentionReason = '최근 7일간 활동 없음';
        }
        
        // Low completion rate (below 70%)
        const completionRate = progress ? (progress.completedHomework / Math.max(progress.totalHomework, 1)) * 100 : 0;
        if (completionRate < 70) {
          requiresAttention = true;
          attentionReason = attentionReason 
            ? `${attentionReason}, 낮은 과제 완료율 (${completionRate.toFixed(0)}%)`
            : `낮은 과제 완료율 (${completionRate.toFixed(0)}%)`;
        }
        
        // Low average score (below 60)
        if (averageScore < 60 && completedSubmissions.length > 0) {
          requiresAttention = true;
          attentionReason = attentionReason 
            ? `${attentionReason}, 낮은 평균 점수 (${averageScore.toFixed(0)}점)`
            : `낮은 평균 점수 (${averageScore.toFixed(0)}점)`;
        }
        
        return {
          _id: student._id.toString(),
          name: student.profile.name,
          email: student.email,
          learningLevel: student.profile.learningLevel || 'beginner',
          lastActivity: student.lastLoginAt || null,
          completedHomework: progress ? progress.completedHomework : 0,
          totalHomework: progress ? progress.totalHomework : 0,
          completionRate: completionRate,
          averageScore: averageScore,
          streakDays: progress ? progress.streakDays : 0,
          requiresAttention,
          attentionReason: requiresAttention ? attentionReason : undefined
        };
      });

      // Calculate class statistics
      const activeStudents = studentOverviews.filter(student => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return student.lastActivity && student.lastActivity > sevenDaysAgo;
      }).length;

      const averageCompletionRate = studentOverviews.length > 0
        ? studentOverviews.reduce((sum, student) => sum + student.completionRate, 0) / studentOverviews.length
        : 0;

      const averageScore = studentOverviews.length > 0
        ? studentOverviews.reduce((sum, student) => sum + student.averageScore, 0) / studentOverviews.length
        : 0;

      // Calculate homework completed this week and last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const twoWeeksAgoDate = new Date();
      twoWeeksAgoDate.setDate(twoWeeksAgoDate.getDate() - 14);
      
      const homeworkCompletedThisWeek = recentSubmissions.filter(
        sub => sub.submittedAt >= oneWeekAgo && sub.status === 'completed'
      ).length;
      
      const homeworkCompletedLastWeek = recentSubmissions.filter(
        sub => sub.submittedAt >= twoWeeksAgoDate && sub.submittedAt < oneWeekAgo && sub.status === 'completed'
      ).length;
      
      const weeklyChangePercentage = homeworkCompletedLastWeek > 0
        ? ((homeworkCompletedThisWeek - homeworkCompletedLastWeek) / homeworkCompletedLastWeek) * 100
        : homeworkCompletedThisWeek > 0 ? 100 : 0;

      // Get top performing students
      const topPerformingStudents = [...studentOverviews]
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5)
        .map(student => ({
          _id: student._id,
          name: student.name,
          score: student.averageScore
        }));

      // Get students requiring attention
      const studentsRequiringAttention = studentOverviews
        .filter(student => student.requiresAttention)
        .map(student => ({
          _id: student._id,
          name: student.name,
          reason: student.attentionReason || '주의 필요'
        }));

      const classStatistics: ClassStatistics = {
        totalStudents: studentOverviews.length,
        activeStudents,
        averageCompletionRate,
        averageScore,
        homeworkCompletedThisWeek,
        homeworkCompletedLastWeek,
        weeklyChangePercentage,
        topPerformingStudents,
        studentsRequiringAttention
      };

      return {
        studentOverviews,
        classStatistics
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get performance trends for a planner's students
   */
  async getPerformanceTrends(
    plannerId: string, 
    period: 'weekly' | 'monthly' = 'weekly',
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceTrend[]> {
    try {
      // Get all students managed by this planner
      const planner = await User.findById(plannerId);
      if (!planner || planner.role !== 'planner') {
        throw new AppError('AUTHORIZATION_ERROR', '유효한 플래너가 아닙니다.', 'INVALID_PLANNER', 403);
      }

      const managedStudentIds = planner.profile.managedStudents || [];
      
      // Set default date range if not provided
      const end = endDate || new Date();
      const start = startDate || new Date();
      if (!startDate) {
        // Default to last 3 months
        start.setMonth(start.getMonth() - 3);
      }

      // Format for grouping
      const formatPeriod = (date: Date): string => {
        if (period === 'weekly') {
          // Get ISO week number
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
          const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
          return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
        } else {
          // Monthly format
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }
      };

      // Get homework submissions within date range
      const submissions = await HomeworkSubmission.find({
        studentId: { $in: managedStudentIds },
        submittedAt: { $gte: start, $lte: end }
      }).select('studentId finalScore submittedAt status');

      // Get lessons within date range
      const lessons = await Lesson.find({
        studentId: { $in: managedStudentIds },
        lessonDate: { $gte: start, $lte: end },
        status: 'completed'
      }).select('studentId lessonDate analysisResult');

      // Group data by period
      const periodData: Record<string, {
        scores: number[];
        completedCount: number;
        totalCount: number;
        participationScores: number[];
        uniqueStudents: Set<string>;
      }> = {};

      // Process submissions
      submissions.forEach(submission => {
        const periodKey = formatPeriod(submission.submittedAt);
        
        if (!periodData[periodKey]) {
          periodData[periodKey] = {
            scores: [],
            completedCount: 0,
            totalCount: 0,
            participationScores: [],
            uniqueStudents: new Set()
          };
        }
        
        periodData[periodKey].totalCount++;
        periodData[periodKey].uniqueStudents.add(submission.studentId.toString());
        
        if (submission.status === 'completed' && submission.finalScore !== undefined) {
          periodData[periodKey].scores.push(submission.finalScore);
          periodData[periodKey].completedCount++;
        }
      });

      // Process lessons
      lessons.forEach(lesson => {
        const periodKey = formatPeriod(lesson.lessonDate);
        
        if (!periodData[periodKey]) {
          periodData[periodKey] = {
            scores: [],
            completedCount: 0,
            totalCount: 0,
            participationScores: [],
            uniqueStudents: new Set()
          };
        }
        
        if (lesson.analysisResult?.participationLevel !== undefined) {
          periodData[periodKey].participationScores.push(lesson.analysisResult.participationLevel);
        }
        
        periodData[periodKey].uniqueStudents.add(lesson.studentId.toString());
      });

      // Convert to array and calculate averages
      const trends: PerformanceTrend[] = Object.entries(periodData).map(([period, data]) => {
        const averageScore = data.scores.length > 0
          ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
          : 0;
          
        const completionRate = data.totalCount > 0
          ? (data.completedCount / data.totalCount) * 100
          : 0;
          
        const participationRate = data.participationScores.length > 0
          ? data.participationScores.reduce((sum, score) => sum + score, 0) / data.participationScores.length
          : 0;
          
        return {
          period,
          averageScore,
          completionRate,
          participationRate,
          studentCount: data.uniqueStudents.size
        };
      });

      // Sort by period
      return trends.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error getting performance trends:', error);
      throw error;
    }
  }

  /**
   * Get detailed performance data for a specific student
   */
  async getStudentPerformanceDetail(studentId: string): Promise<StudentPerformanceDetail> {
    try {
      // Get student data
      const student = await User.findById(studentId);
      if (!student || student.role !== 'student') {
        throw new AppError('VALIDATION_ERROR', '유효한 학생이 아닙니다.', 'INVALID_STUDENT', 400);
      }

      // Get student progress
      const progress = await StudentProgress.findOne({ studentId });
      if (!progress) {
        throw new AppError('VALIDATION_ERROR', '학생 진도 정보를 찾을 수 없습니다.', 'PROGRESS_NOT_FOUND', 404);
      }

      // Get recent lessons (last 10)
      const recentLessons = await Lesson.find({
        studentId,
        status: 'completed'
      })
        .sort({ lessonDate: -1 })
        .limit(10)
        .select('lessonDate analysisResult');

      // Get recent submissions (last 10)
      const recentSubmissions = await HomeworkSubmission.find({
        studentId,
      })
        .sort({ submittedAt: -1 })
        .limit(10)
        .select('homeworkId submittedAt finalScore status isLate');

      // Collect improvement areas and strengths from lessons and submissions
      const improvementAreas = new Set<string>();
      const strengths = new Set<string>();

      recentLessons.forEach(lesson => {
        if (lesson.analysisResult?.improvementAreas) {
          lesson.analysisResult.improvementAreas.forEach(area => improvementAreas.add(area));
        }
      });

      const completedSubmissions = await HomeworkSubmission.find({
        studentId,
        status: 'completed'
      })
        .sort({ submittedAt: -1 })
        .limit(5)
        .select('aiEvaluation');

      completedSubmissions.forEach(submission => {
        if (submission.aiEvaluation?.improvementAreas) {
          submission.aiEvaluation.improvementAreas.forEach(area => improvementAreas.add(area));
        }
        if (submission.aiEvaluation?.strengths) {
          submission.aiEvaluation.strengths.forEach(strength => strengths.add(strength));
        }
      });

      return {
        studentId: student._id.toString(),
        studentName: student.profile.name,
        email: student.email,
        learningLevel: student.profile.learningLevel || 'beginner',
        overallScore: progress.overallScore,
        completionRate: progress.totalHomework > 0 
          ? (progress.completedHomework / progress.totalHomework) * 100 
          : 0,
        streakDays: progress.streakDays,
        weeklyProgress: progress.weeklyProgress,
        recentLessons: recentLessons.map(lesson => ({
          lessonId: lesson._id.toString(),
          lessonDate: lesson.lessonDate,
          participationLevel: lesson.analysisResult?.participationLevel || 0,
          pronunciationAccuracy: lesson.analysisResult?.studentMetrics.pronunciationAccuracy || 0,
          fluencyScore: lesson.analysisResult?.studentMetrics.fluencyScore || 0,
          grammarAccuracy: lesson.analysisResult?.studentMetrics.grammarAccuracy || 0
        })),
        recentSubmissions: recentSubmissions.map(submission => ({
          submissionId: submission._id.toString(),
          homeworkId: submission.homeworkId.toString(),
          submittedAt: submission.submittedAt,
          score: submission.finalScore || 0,
          status: submission.status,
          isLate: submission.isLate
        })),
        improvementAreas: Array.from(improvementAreas),
        strengths: Array.from(strengths)
      };
    } catch (error) {
      console.error('Error getting student performance detail:', error);
      throw error;
    }
  }

  /**
   * Generate a report based on a template
   */
  async generateReport(
    plannerId: string,
    templateId: string,
    studentIds?: string[],
    startDate?: Date,
    endDate?: Date,
    format: ExportFormat = { format: 'pdf' }
  ): Promise<string> {
    try {
      // In a real implementation, this would generate a report based on the template
      // and return a URL to the generated report file
      
      // For now, we'll just return a placeholder URL
      return `https://example.com/reports/${templateId}_${Date.now()}.${format.format}`;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Schedule a report for automatic generation and delivery
   */
  async scheduleReport(
    plannerId: string,
    templateId: string,
    name: string,
    recipients: string[],
    frequency: 'daily' | 'weekly' | 'monthly',
    nextRunDate: Date
  ): Promise<ScheduledReport> {
    try {
      // In a real implementation, this would create a scheduled report in the database
      // and set up a cron job to generate and send the report
      
      // For now, we'll just return a placeholder scheduled report
      const scheduledReport: ScheduledReport = {
        _id: new mongoose.Types.ObjectId().toString(),
        templateId,
        name,
        recipients,
        frequency,
        nextRunDate,
        status: 'active',
        createdBy: plannerId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return scheduledReport;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Get students requiring attention
   */
  async getStudentsRequiringAttention(plannerId: string): Promise<{
    _id: string;
    name: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    lastActivity: Date | null;
  }[]> {
    try {
      const dashboardData = await this.getDashboardData(plannerId);
      
      // Get students requiring attention with additional details
      const studentsRequiringAttention = await Promise.all(
        dashboardData.classStatistics.studentsRequiringAttention.map(async (student) => {
          const studentOverview = dashboardData.studentOverviews.find(s => s._id === student._id);
          
          // Determine priority based on reason
          let priority: 'high' | 'medium' | 'low' = 'medium';
          
          if (student.reason.includes('최근 7일간 활동 없음') && student.reason.includes('낮은 평균 점수')) {
            priority = 'high';
          } else if (student.reason.includes('최근 7일간 활동 없음') || student.reason.includes('낮은 평균 점수')) {
            priority = 'medium';
          } else {
            priority = 'low';
          }
          
          return {
            _id: student._id,
            name: student.name,
            reason: student.reason,
            priority,
            lastActivity: studentOverview?.lastActivity || null
          };
        })
      );
      
      // Sort by priority (high to low)
      return studentsRequiringAttention.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      console.error('Error getting students requiring attention:', error);
      throw error;
    }
  }

  /**
   * Perform bulk operations on students
   */
  async performBulkOperation(
    plannerId: string,
    studentIds: string[],
    operation: 'send_notification' | 'assign_homework' | 'export_data',
    operationData: any
  ): Promise<{ success: boolean; message: string; results?: any }> {
    try {
      // Validate planner and students
      const planner = await User.findById(plannerId);
      if (!planner || planner.role !== 'planner') {
        throw new AppError('AUTHORIZATION_ERROR', '유효한 플래너가 아닙니다.', 'INVALID_PLANNER', 403);
      }

      const students = await User.find({
        _id: { $in: studentIds },
        role: 'student'
      });

      if (students.length !== studentIds.length) {
        throw new AppError('VALIDATION_ERROR', '일부 학생을 찾을 수 없습니다.', 'STUDENTS_NOT_FOUND', 400);
      }

      // Perform the requested operation
      switch (operation) {
        case 'send_notification':
          // This would integrate with the notification service
          return {
            success: true,
            message: `${students.length}명의 학생에게 알림을 전송했습니다.`
          };

        case 'assign_homework':
          // This would integrate with the homework service
          return {
            success: true,
            message: `${students.length}명의 학생에게 숙제를 배정했습니다.`
          };

        case 'export_data':
          // This would generate and return export data
          return {
            success: true,
            message: `${students.length}명의 학생 데이터를 내보냈습니다.`,
            results: {
              exportUrl: `https://example.com/exports/students_${Date.now()}.${operationData.format || 'csv'}`
            }
          };

        default:
          throw new AppError('VALIDATION_ERROR', '지원되지 않는 작업입니다.', 'UNSUPPORTED_OPERATION', 400);
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw error;
    }
  }
}

export default new ReportingService();