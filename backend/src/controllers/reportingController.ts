import { Request, Response, NextFunction } from 'express';
import reportingService from '../services/reportingService';
import { AppError } from '../utils/errors';

class ReportingController {
  /**
   * Get dashboard data for a planner
   */
  async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const dashboardData = await reportingService.getDashboardData(plannerId);
      
      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get performance trends for a planner's students
   */
  async getPerformanceTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const { period, startDate, endDate } = req.query;
      
      const trends = await reportingService.getPerformanceTrends(
        plannerId,
        period as 'weekly' | 'monthly' || 'weekly',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed performance data for a specific student
   */
  async getStudentPerformanceDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      
      if (!studentId) {
        throw new AppError('VALIDATION_ERROR', '학생 ID가 필요합니다.', 'STUDENT_ID_REQUIRED', 400);
      }
      
      const performanceDetail = await reportingService.getStudentPerformanceDetail(studentId);
      
      res.status(200).json({
        success: true,
        data: performanceDetail
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate a report based on a template
   */
  async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const { templateId, studentIds, startDate, endDate, format } = req.body;
      
      if (!templateId) {
        throw new AppError('VALIDATION_ERROR', '템플릿 ID가 필요합니다.', 'TEMPLATE_ID_REQUIRED', 400);
      }
      
      const reportUrl = await reportingService.generateReport(
        plannerId,
        templateId,
        studentIds,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        format
      );
      
      res.status(200).json({
        success: true,
        data: {
          reportUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule a report for automatic generation and delivery
   */
  async scheduleReport(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const { templateId, name, recipients, frequency, nextRunDate } = req.body;
      
      if (!templateId || !name || !recipients || !frequency || !nextRunDate) {
        throw new AppError('VALIDATION_ERROR', '모든 필수 필드를 입력해주세요.', 'MISSING_REQUIRED_FIELDS', 400);
      }
      
      const scheduledReport = await reportingService.scheduleReport(
        plannerId,
        templateId,
        name,
        recipients,
        frequency,
        new Date(nextRunDate)
      );
      
      res.status(201).json({
        success: true,
        data: scheduledReport
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get students requiring attention
   */
  async getStudentsRequiringAttention(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const students = await reportingService.getStudentsRequiringAttention(plannerId);
      
      res.status(200).json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Perform bulk operations on students
   */
  async performBulkOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user?.id;
      
      if (!plannerId) {
        throw new AppError('AUTHENTICATION_ERROR', '인증이 필요합니다.', 'AUTHENTICATION_REQUIRED', 401);
      }
      
      const { studentIds, operation, operationData } = req.body;
      
      if (!studentIds || !operation) {
        throw new AppError('VALIDATION_ERROR', '학생 ID와 작업 유형이 필요합니다.', 'MISSING_REQUIRED_FIELDS', 400);
      }
      
      const result = await reportingService.performBulkOperation(
        plannerId,
        studentIds,
        operation,
        operationData || {}
      );
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportingController();