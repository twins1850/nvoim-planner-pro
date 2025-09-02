import express from 'express';
import { auth } from '../middleware/auth';
import { 
  getUsageStats, 
  updateBudgetSettings, 
  getCostOptimizationSettings,
  getUsageAlerts,
  getCostEfficiencyRecommendations
} from '../controllers/costMonitoringController';

const router = express.Router();

/**
 * @route   GET /api/cost-monitoring/usage
 * @desc    Get usage statistics
 * @access  Private (Planner only)
 */
router.get('/usage', auth('planner'), getUsageStats);

/**
 * @route   PUT /api/cost-monitoring/budget
 * @desc    Update budget settings
 * @access  Private (Planner only)
 */
router.put('/budget', auth('planner'), updateBudgetSettings);

/**
 * @route   GET /api/cost-monitoring/optimization
 * @desc    Get cost optimization settings
 * @access  Private (Planner only)
 */
router.get('/optimization', auth('planner'), getCostOptimizationSettings);

/**
 * @route   GET /api/cost-monitoring/alerts
 * @desc    Get usage alerts
 * @access  Private (Planner only)
 */
router.get('/alerts', auth('planner'), getUsageAlerts);

/**
 * @route   GET /api/cost-monitoring/recommendations
 * @desc    Get cost efficiency recommendations
 * @access  Private (Planner only)
 */
router.get('/recommendations', auth('planner'), getCostEfficiencyRecommendations);

export default router;