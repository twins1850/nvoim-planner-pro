import { Request, Response, NextFunction } from 'express';
import { feedbackService } from '../services/feedbackService';
import { fileService } from '../services/fileService';
import { ValidationError } from '../utils/errors';

export const feedbackController = {
  /**
   * Generate AI evaluation for a homework submission
   */
  async generateAIEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.params;
      
      const feedback = await feedbackService.generateAIEvaluation(submissionId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Add planner feedback to an existing AI evaluation
   */
  async addPlannerFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const { overallScore, comments, assessmentCriteria } = req.body;
      
      // Handle file attachments if any
      const attachments = [];
      
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          const fileUrl = await fileService.uploadFile(file, {
            userId: req.user.id,
            purpose: 'feedback_attachment'
          });
          
          attachments.push({
            type: file.mimetype.startsWith('audio/') ? 'audio' : 
                  file.mimetype.startsWith('image/') ? 'image' : 'text',
            content: fileUrl,
            mimeType: file.mimetype,
            fileName: file.originalname
          });
        }
      }
      
      // Handle text attachments
      if (req.body.textAttachments) {
        const textAttachments = Array.isArray(req.body.textAttachments) 
          ? req.body.textAttachments 
          : [req.body.textAttachments];
          
        for (const text of textAttachments) {
          attachments.push({
            type: 'text',
            content: text,
            mimeType: 'text/plain'
          });
        }
      }
      
      // Validate input
      if (typeof overallScore !== 'number' || overallScore < 0 || overallScore > 5) {
        throw new ValidationError('Overall score must be a number between 0 and 5');
      }
      
      if (!Array.isArray(assessmentCriteria)) {
        throw new ValidationError('Assessment criteria must be an array');
      }
      
      const feedback = await feedbackService.addPlannerFeedback(feedbackId, {
        overallScore,
        comments,
        attachments,
        assessmentCriteria
      });
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Send feedback to student
   */
  async sendFeedbackToStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      
      const feedback = await feedbackService.sendFeedbackToStudent(feedbackId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Mark feedback as viewed by student
   */
  async markFeedbackAsViewed(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      
      const feedback = await feedbackService.markFeedbackAsViewed(feedbackId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get feedback by ID
   */
  async getFeedbackById(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      
      const feedback = await feedbackService.getFeedbackById(feedbackId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get all feedback for a student
   */
  async getStudentFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId || req.user.id;
      
      const feedback = await feedbackService.getStudentFeedback(studentId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get all feedback created by a planner
   */
  async getPlannerFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.params.plannerId || req.user.id;
      
      const feedback = await feedbackService.getPlannerFeedback(plannerId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get feedback pending planner review
   */
  async getPendingFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const plannerId = req.user.id;
      
      const feedback = await feedbackService.getPendingFeedback(plannerId);
      
      res.status(200).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get feedback analytics for a student
   */
  async getStudentFeedbackAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId || req.user.id;
      
      const analytics = await feedbackService.getStudentFeedbackAnalytics(studentId);
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
};