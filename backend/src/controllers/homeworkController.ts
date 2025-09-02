import { Request, Response, NextFunction } from 'express';
import { homeworkService } from '../services/homeworkService';
import { validateObjectId } from '../middleware/validation';
import { BadRequestError, NotFoundError } from '../utils/errors';

/**
 * Homework controller
 */
export class HomeworkController {
  /**
   * Create a new homework assignment
   * @route POST /api/homework
   */
  async createHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { body } = req;
      const plannerId = req.user?._id;
      
      if (!plannerId) {
        throw new BadRequestError('Planner ID is required');
      }
      
      const homework = await homeworkService.createHomework({
        ...body,
        plannerId
      });
      
      res.status(201).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get homework by ID
   * @route GET /api/homework/:id
   */
  async getHomeworkById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateObjectId(id);
      
      const homework = await homeworkService.getHomeworkById(id);
      
      res.status(200).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all homework for the authenticated planner
   * @route GET /api/homework/planner
   */
  async getHomeworkByPlanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plannerId = req.user?._id;
      
      if (!plannerId) {
        throw new BadRequestError('Planner ID is required');
      }
      
      const { status, isTemplate } = req.query;
      const filters: any = {};
      
      if (status) {
        filters.status = status;
      }
      
      if (isTemplate) {
        filters.isTemplate = isTemplate === 'true';
      }
      
      const homework = await homeworkService.getHomeworkByPlannerId(plannerId, filters);
      
      res.status(200).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all homework for the authenticated student
   * @route GET /api/homework/student
   */
  async getHomeworkByStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?._id;
      
      if (!studentId) {
        throw new BadRequestError('Student ID is required');
      }
      
      const { status } = req.query;
      const filters: any = {};
      
      if (status) {
        filters.status = status;
      }
      
      const homework = await homeworkService.getHomeworkByStudentId(studentId, filters);
      
      res.status(200).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update homework
   * @route PUT /api/homework/:id
   */
  async updateHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateObjectId(id);
      
      const { body } = req;
      
      const homework = await homeworkService.updateHomework(id, body);
      
      res.status(200).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete homework
   * @route DELETE /api/homework/:id
   */
  async deleteHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateObjectId(id);
      
      await homeworkService.deleteHomework(id);
      
      res.status(200).json({
        success: true,
        data: { message: 'Homework deleted successfully' },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate personalized homework based on lesson analysis
   * @route POST /api/homework/personalized
   */
  async generatePersonalizedHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonId, studentId, baseTemplate } = req.body;
      const plannerId = req.user?._id;
      
      if (!plannerId) {
        throw new BadRequestError('Planner ID is required');
      }
      
      if (!lessonId) {
        throw new BadRequestError('Lesson ID is required');
      }
      
      if (!studentId) {
        throw new BadRequestError('Student ID is required');
      }
      
      validateObjectId(lessonId);
      validateObjectId(studentId);
      
      const homework = await homeworkService.generatePersonalizedHomework(
        lessonId,
        plannerId,
        studentId,
        baseTemplate
      );
      
      res.status(201).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create homework from template
   * @route POST /api/homework/from-template
   */
  async createHomeworkFromTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { templateId, studentIds, dueDate, scheduledSendTime } = req.body;
      
      if (!templateId) {
        throw new BadRequestError('Template ID is required');
      }
      
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new BadRequestError('At least one student ID is required');
      }
      
      if (!dueDate) {
        throw new BadRequestError('Due date is required');
      }
      
      validateObjectId(templateId);
      studentIds.forEach(id => validateObjectId(id));
      
      const homework = await homeworkService.createHomeworkFromTemplate(
        templateId,
        studentIds,
        new Date(dueDate),
        scheduledSendTime ? new Date(scheduledSendTime) : undefined
      );
      
      res.status(201).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save homework as template
   * @route POST /api/homework/:id/save-as-template
   */
  async saveAsTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { templateName, templateCategory } = req.body;
      
      validateObjectId(id);
      
      if (!templateName) {
        throw new BadRequestError('Template name is required');
      }
      
      const template = await homeworkService.saveAsTemplate(id, templateName, templateCategory);
      
      res.status(201).json({
        success: true,
        data: template,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all homework templates
   * @route GET /api/homework/templates
   */
  async getHomeworkTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plannerId = req.user?._id;
      
      if (!plannerId) {
        throw new BadRequestError('Planner ID is required');
      }
      
      const { category } = req.query;
      
      const templates = await homeworkService.getHomeworkTemplates(
        plannerId,
        category as string | undefined
      );
      
      res.status(200).json({
        success: true,
        data: templates,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign homework to multiple students
   * @route POST /api/homework/bulk-assign
   */
  async assignHomeworkToMultipleStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { homeworkData, studentIds } = req.body;
      const plannerId = req.user?._id;
      
      if (!plannerId) {
        throw new BadRequestError('Planner ID is required');
      }
      
      if (!homeworkData) {
        throw new BadRequestError('Homework data is required');
      }
      
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new BadRequestError('At least one student ID is required');
      }
      
      studentIds.forEach(id => validateObjectId(id));
      
      const homework = await homeworkService.assignHomeworkToMultipleStudents(
        {
          ...homeworkData,
          plannerId
        },
        studentIds
      );
      
      res.status(201).json({
        success: true,
        data: homework,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

export const homeworkController = new HomeworkController();