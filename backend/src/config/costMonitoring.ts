import mongoose from 'mongoose';
import { ApiUsage } from '../models/ApiUsage';
import { BudgetSetting } from '../models/BudgetSetting';
import { logWithContext } from '../utils/logger';
import { CircuitBreakerRegistry } from '../utils/circuitBreaker';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { AIServiceType } from '../types/aiTypes';

/**
 * Cost per unit for each service
 * Units:
 * - AZURE_SPEECH: seconds of audio
 * - OPENAI_GPT: 1K tokens
 * - AZURE_OCR: image
 */
export const SERVICE_COSTS = {
  [AIServiceType.AZURE_SPEECH]: 0.0016, // $0.0016 per second
  [AIServiceType.OPENAI_GPT]: 0.01,     // $0.01 per 1K tokens
  [AIServiceType.AZURE_OCR]: 0.001      // $0.001 per image
};

/**
 * Cost optimization settings
 */
export const COST_OPTIMIZATION_SETTINGS = {
  // Audio processing
  audio: {
    maxDuration: 600,           // Maximum audio duration in seconds (10 minutes)
    chunkSize: 60,              // Process audio in 60-second chunks
    silenceThreshold: -50,      // dB threshold for silence detection
    silenceRemoval: true,       // Remove silence to reduce processing time
    compressionQuality: 0.8,    // Audio compression quality (0.0-1.0)
    sampleRate: 16000,          // Sample rate in Hz
    channels: 1                 // Mono audio
  },
  
  // OpenAI
  openai: {
    maxTokens: 2000,            // Maximum tokens per request
    temperature: 0.3,           // Lower temperature for more deterministic outputs
    cacheResults: true,         // Cache results to avoid duplicate requests
    cacheTTL: 86400,            // Cache TTL in seconds (24 hours)
    useGpt4oMini: true,         // Use GPT-4o mini for most tasks
    useGpt4o: false             // Only use GPT-4o for complex analysis
  },
  
  // Azure Speech
  azureSpeech: {
    profanityOption: 'masked',  // Mask profanity to reduce token count
    useCompactJson: true,       // Use compact JSON format
    enableWordLevelTimestamps: false, // Disable word-level timestamps unless needed
    batchProcessing: true       // Process multiple audio files in batch when possible
  }
};

/**
 * Track API usage and cost
 */
export async function trackApiUsage(
  plannerId: mongoose.Types.ObjectId,
  serviceType: AIServiceType,
  units: number
): Promise<void> {
  try {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const cost = units * SERVICE_COSTS[serviceType];
    
    // Update or create usage record
    await ApiUsage.findOneAndUpdate(
      { plannerId, serviceType, date },
      { 
        $inc: { 
          units,
          cost
        } 
      },
      { upsert: true }
    );
    
    logWithContext('info', `Tracked API usage`, {
      plannerId: plannerId.toString(),
      serviceType,
      units,
      cost
    });
  } catch (error) {
    logWithContext('error', `Failed to track API usage`, {
      plannerId: plannerId.toString(),
      serviceType,
      units,
      error: (error as Error).message
    });
  }
}

/**
 * Check if usage is within budget
 */
export async function checkBudget(
  plannerId: mongoose.Types.ObjectId,
  serviceType: AIServiceType,
  estimatedUnits: number
): Promise<boolean> {
  try {
    // Get budget settings
    const budgetSetting = await BudgetSetting.findOne({ plannerId });
    
    if (!budgetSetting) {
      // No budget set, allow usage
      return true;
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
          plannerId,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' }
        }
      }
    ]);
    
    const currentCost = monthlyUsage.length > 0 ? monthlyUsage[0].totalCost : 0;
    const estimatedCost = estimatedUnits * SERVICE_COSTS[serviceType];
    const totalCost = currentCost + estimatedCost;
    
    // Check if within budget
    const isWithinBudget = totalCost <= budgetSetting.monthlyBudget;
    
    if (!isWithinBudget) {
      logWithContext('warn', `Budget exceeded for planner`, {
        plannerId: plannerId.toString(),
        serviceType,
        currentCost,
        estimatedCost,
        totalCost,
        budget: budgetSetting.monthlyBudget
      });
      
      // If approaching budget limit, send notification
      if (currentCost >= budgetSetting.monthlyBudget * 0.8 && 
          currentCost < budgetSetting.monthlyBudget) {
        // Send budget warning notification (implementation depends on notification system)
        // notificationService.sendBudgetWarning(plannerId, currentCost, budgetSetting.monthlyBudget);
      }
    }
    
    return isWithinBudget;
  } catch (error) {
    logWithContext('error', `Failed to check budget`, {
      plannerId: plannerId.toString(),
      serviceType,
      estimatedUnits,
      error: (error as Error).message
    });
    
    // In case of error, allow usage but log the error
    return true;
  }
}

/**
 * Get optimized parameters for AI service based on usage patterns
 */
export function getOptimizedParameters(
  serviceType: AIServiceType,
  usageContext: {
    priority: 'high' | 'medium' | 'low',
    complexity: 'high' | 'medium' | 'low',
    isRealTime: boolean
  }
): Record<string, any> {
  const { priority, complexity, isRealTime } = usageContext;
  
  switch (serviceType) {
    case AIServiceType.OPENAI_GPT:
      return {
        model: complexity === 'high' ? 'gpt-4o' : 'gpt-4o-mini',
        temperature: complexity === 'high' ? 0.7 : 0.3,
        max_tokens: priority === 'high' ? 4000 : 2000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        cache: !isRealTime && priority !== 'high'
      };
      
    case AIServiceType.AZURE_SPEECH:
      return {
        profanityOption: 'masked',
        enableWordLevelTimestamps: complexity === 'high',
        enableSpeakerDiarization: complexity !== 'low',
        diarizationMinSpeakerCount: 2,
        diarizationMaxSpeakerCount: 2,
        phraseDetection: isRealTime ? 'standard' : 'strict',
        useCompactJson: priority !== 'high'
      };
      
    case AIServiceType.AZURE_OCR:
      return {
        language: 'en',
        detectOrientation: true,
        model: priority === 'high' ? 'latest' : 'standard'
      };
      
    default:
      return {};
  }
}

/**
 * Circuit breaker for AI services
 */
export const aiServiceCircuitBreakers = {
  [AIServiceType.AZURE_SPEECH]: CircuitBreakerRegistry.getBreaker('azure-speech-service', {
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  }),
  
  [AIServiceType.OPENAI_GPT]: CircuitBreakerRegistry.getBreaker('openai-service', {
    failureThreshold: 3,
    resetTimeout: 120000, // 2 minutes
    monitoringPeriod: 300000 // 5 minutes
  }),
  
  [AIServiceType.AZURE_OCR]: CircuitBreakerRegistry.getBreaker('azure-ocr-service', {
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  })
};

/**
 * Execute AI service call with cost tracking and circuit breaker
 */
export async function executeAIServiceCall<T>(
  plannerId: mongoose.Types.ObjectId,
  serviceType: AIServiceType,
  estimatedUnits: number,
  serviceCall: () => Promise<T>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  // Check budget
  const isWithinBudget = await checkBudget(plannerId, serviceType, estimatedUnits);
  
  if (!isWithinBudget) {
    throw new AppError(
      'Monthly budget exceeded',
      ErrorType.SYSTEM_ERROR,
      403,
      true,
      { plannerId: plannerId.toString(), serviceType }
    );
  }
  
  try {
    // Execute service call with circuit breaker
    const result = await aiServiceCircuitBreakers[serviceType].execute(serviceCall);
    
    // Track successful usage
    await trackApiUsage(plannerId, serviceType, estimatedUnits);
    
    return result;
  } catch (error) {
    // If circuit is open and fallback is provided, use fallback
    if (fallbackFn) {
      logWithContext('warn', `Using fallback for AI service`, {
        plannerId: plannerId.toString(),
        serviceType
      });
      
      return fallbackFn();
    }
    
    throw error;
  }
}