import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiUsage } from '../models/ApiUsage';
import { BudgetSetting } from '../models/BudgetSetting';
import { AIServiceType, COST_OPTIMIZATION_SETTINGS } from '../config/costMonitoring';
import { logWithContext } from '../utils/logger';

/**
 * Get usage statistics for a planner
 */
export const getUsageStats = asyncHandler(async (req: Request, res: Response) => {
  const plannerId = req.user!.id;
  const { period, startDate, endDate } = req.query;
  
  let start: Date;
  let end: Date = new Date();
  
  // Determine date range based on period
  if (period === 'daily') {
    start = new Date();
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    start = new Date();
    start.setDate(start.getDate() - 7);
  } else if (period === 'monthly') {
    start = new Date();
    start.setMonth(start.getMonth() - 1);
  } else if (period === 'yearly') {
    start = new Date();
    start.setFullYear(start.getFullYear() - 1);
  } else if (startDate && endDate) {
    start = new Date(startDate as string);
    end = new Date(endDate as string);
  } else {
    // Default to monthly
    start = new Date();
    start.setMonth(start.getMonth() - 1);
  }
  
  // Get usage data
  const usageData = await ApiUsage.aggregate([
    {
      $match: {
        plannerId: new mongoose.Types.ObjectId(plannerId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          serviceType: '$serviceType',
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          }
        },
        units: { $sum: '$units' },
        cost: { $sum: '$cost' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
  
  // Get total usage
  const totalUsage = await ApiUsage.aggregate([
    {
      $match: {
        plannerId: new mongoose.Types.ObjectId(plannerId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$serviceType',
        units: { $sum: '$units' },
        cost: { $sum: '$cost' }
      }
    }
  ]);
  
  // Get budget settings
  const budgetSetting = await BudgetSetting.findOne({ plannerId });
  
  // Format response
  const formattedData = {
    period: period || 'custom',
    startDate: start,
    endDate: end,
    dailyUsage: usageData.reduce((acc: any, item: any) => {
      const date = item._id.date;
      const serviceType = item._id.serviceType;
      
      if (!acc[date]) {
        acc[date] = {};
      }
      
      acc[date][serviceType] = {
        units: item.units,
        cost: item.cost
      };
      
      return acc;
    }, {}),
    totalByService: totalUsage.reduce((acc: any, item: any) => {
      acc[item._id] = {
        units: item.units,
        cost: item.cost
      };
      return acc;
    }, {}),
    budget: budgetSetting ? {
      monthlyBudget: budgetSetting.monthlyBudget,
      serviceSpecificLimits: budgetSetting.serviceSpecificLimits,
      alertThreshold: budgetSetting.alertThreshold,
      alertsEnabled: budgetSetting.alertsEnabled
    } : null
  };
  
  res.status(200).json({
    success: true,
    data: formattedData
  });
});

/**
 * Update budget settings
 */
export const updateBudgetSettings = asyncHandler(async (req: Request, res: Response) => {
  const plannerId = req.user!.id;
  const {
    monthlyBudget,
    alertThreshold,
    alertsEnabled,
    serviceSpecificLimits,
    costOptimizationEnabled,
    autoScalingEnabled
  } = req.body;
  
  // Find or create budget settings
  let budgetSetting = await BudgetSetting.findOne({ plannerId });
  
  if (!budgetSetting) {
    budgetSetting = new BudgetSetting({ plannerId });
  }
  
  // Update fields if provided
  if (monthlyBudget !== undefined) {
    budgetSetting.monthlyBudget = monthlyBudget;
  }
  
  if (alertThreshold !== undefined) {
    budgetSetting.alertThreshold = alertThreshold;
  }
  
  if (alertsEnabled !== undefined) {
    budgetSetting.alertsEnabled = alertsEnabled;
  }
  
  if (serviceSpecificLimits) {
    // Update only provided service limits
    Object.keys(serviceSpecificLimits).forEach(serviceType => {
      if (Object.values(AIServiceType).includes(serviceType as AIServiceType)) {
        const typedServiceType = serviceType as AIServiceType;
        
        if (!budgetSetting.serviceSpecificLimits) {
          budgetSetting.serviceSpecificLimits = {} as any;
        }
        
        if (!budgetSetting.serviceSpecificLimits[typedServiceType]) {
          budgetSetting.serviceSpecificLimits[typedServiceType] = {
            monthlyBudget: 0,
            enabled: true
          };
        }
        
        const limits = serviceSpecificLimits[serviceType];
        
        if (limits.monthlyBudget !== undefined) {
          budgetSetting.serviceSpecificLimits[typedServiceType]!.monthlyBudget = limits.monthlyBudget;
        }
        
        if (limits.enabled !== undefined) {
          budgetSetting.serviceSpecificLimits[typedServiceType]!.enabled = limits.enabled;
        }
      }
    });
  }
  
  if (costOptimizationEnabled !== undefined) {
    budgetSetting.costOptimizationEnabled = costOptimizationEnabled;
  }
  
  if (autoScalingEnabled !== undefined) {
    budgetSetting.autoScalingEnabled = autoScalingEnabled;
  }
  
  // Save updated settings
  await budgetSetting.save();
  
  res.status(200).json({
    success: true,
    data: budgetSetting
  });
});

/**
 * Get cost optimization settings
 */
export const getCostOptimizationSettings = asyncHandler(async (req: Request, res: Response) => {
  const plannerId = req.user!.id;
  
  // Get budget settings to check if optimization is enabled
  const budgetSetting = await BudgetSetting.findOne({ plannerId });
  
  const optimizationEnabled = budgetSetting?.costOptimizationEnabled ?? true;
  
  res.status(200).json({
    success: true,
    data: {
      enabled: optimizationEnabled,
      settings: COST_OPTIMIZATION_SETTINGS
    }
  });
});

/**
 * Get usage alerts
 */
export const getUsageAlerts = asyncHandler(async (req: Request, res: Response) => {
  const plannerId = req.user!.id;
  
  // Get budget settings
  const budgetSetting = await BudgetSetting.findOne({ plannerId });
  
  if (!budgetSetting) {
    return res.status(200).json({
      success: true,
      data: {
        alerts: []
      }
    });
  }
  
  // Get current month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  const monthlyUsage = await ApiUsage.aggregate([
    {
      $match: {
        plannerId: new mongoose.Types.ObjectId(plannerId),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$serviceType',
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
  
  // Calculate total cost
  const totalCost = monthlyUsage.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Generate alerts
  const alerts = [];
  
  // Overall budget alert
  const budgetPercentage = (totalCost / budgetSetting.monthlyBudget) * 100;
  
  if (budgetPercentage >= budgetSetting.alertThreshold) {
    alerts.push({
      type: 'budget_threshold',
      severity: budgetPercentage >= 100 ? 'critical' : 'warning',
      message: `Overall budget usage is at ${Math.round(budgetPercentage)}% (${totalCost.toLocaleString()} / ${budgetSetting.monthlyBudget.toLocaleString()} KRW)`,
      details: {
        percentage: budgetPercentage,
        current: totalCost,
        limit: budgetSetting.monthlyBudget
      }
    });
  }
  
  // Service-specific alerts
  monthlyUsage.forEach(usage => {
    const serviceType = usage._id as AIServiceType;
    const serviceBudget = budgetSetting.serviceSpecificLimits?.[serviceType]?.monthlyBudget;
    
    if (serviceBudget) {
      const servicePercentage = (usage.totalCost / serviceBudget) * 100;
      
      if (servicePercentage >= budgetSetting.alertThreshold) {
        alerts.push({
          type: 'service_budget_threshold',
          severity: servicePercentage >= 100 ? 'critical' : 'warning',
          message: `${serviceType} budget usage is at ${Math.round(servicePercentage)}% (${usage.totalCost.toLocaleString()} / ${serviceBudget.toLocaleString()} KRW)`,
          details: {
            serviceType,
            percentage: servicePercentage,
            current: usage.totalCost,
            limit: serviceBudget
          }
        });
      }
    }
  });
  
  res.status(200).json({
    success: true,
    data: {
      alerts,
      totalCost,
      monthlyBudget: budgetSetting.monthlyBudget,
      usagePercentage: budgetPercentage
    }
  });
});

/**
 * Get cost efficiency recommendations
 */
export const getCostEfficiencyRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const plannerId = req.user!.id;
  
  // Get usage patterns
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const usage = await ApiUsage.aggregate([
    {
      $match: {
        plannerId: new mongoose.Types.ObjectId(plannerId),
        date: { $gte: lastMonth }
      }
    },
    {
      $group: {
        _id: '$serviceType',
        totalUnits: { $sum: '$units' },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
  
  // Generate recommendations based on usage patterns
  const recommendations = [];
  
  // Check for high OpenAI usage
  const openaiUsage = usage.find(u => u._id === AIServiceType.OPENAI_GPT);
  if (openaiUsage && openaiUsage.totalCost > 5000) { // 5,000원 이상 사용
    recommendations.push({
      type: 'cost_reduction',
      serviceType: AIServiceType.OPENAI_GPT,
      title: 'Reduce OpenAI API costs',
      description: 'Your OpenAI API usage is high. Consider using GPT-4o-mini for initial analysis and only use GPT-4o for complex tasks.',
      potentialSavings: Math.round(openaiUsage.totalCost * 0.4), // 40% potential savings
      implementation: 'Update the cost optimization settings to use GPT-4o-mini as the default model.'
    });
  }
  
  // Check for high Azure Speech usage
  const azureSpeechUsage = usage.find(u => u._id === AIServiceType.AZURE_SPEECH);
  if (azureSpeechUsage && azureSpeechUsage.totalUnits > 3000) { // 3,000초 이상 사용
    recommendations.push({
      type: 'cost_reduction',
      serviceType: AIServiceType.AZURE_SPEECH,
      title: 'Optimize Azure Speech Service usage',
      description: 'You are processing large amounts of audio. Consider implementing silence detection and removal to reduce processing time.',
      potentialSavings: Math.round(azureSpeechUsage.totalCost * 0.25), // 25% potential savings
      implementation: 'Enable silence detection and removal in the cost optimization settings.'
    });
  }
  
  // General recommendations
  recommendations.push({
    type: 'efficiency',
    title: 'Implement result caching',
    description: 'Cache AI analysis results for similar inputs to avoid redundant API calls.',
    potentialSavings: 'Variable',
    implementation: 'Enable result caching in the cost optimization settings.'
  });
  
  recommendations.push({
    type: 'efficiency',
    title: 'Batch processing for multiple files',
    description: 'Process multiple audio files in batch to reduce overhead and optimize API usage.',
    potentialSavings: 'Variable',
    implementation: 'Use the batch processing feature when uploading multiple files.'
  });
  
  res.status(200).json({
    success: true,
    data: {
      recommendations,
      usageSummary: usage.reduce((acc: any, item: any) => {
        acc[item._id] = {
          units: item.totalUnits,
          cost: item.totalCost
        };
        return acc;
      }, {})
    }
  });
});