import { Types } from 'mongoose';
import { ApiUsage, IApiUsage } from '../models/ApiUsage';
import { BudgetSetting, IBudgetSetting } from '../models/BudgetSetting';
import { User } from '../models/User';
import * as notificationService from './notificationService';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { AIServiceType } from '../types/aiTypes';

/**
 * 비용 모니터링 및 최적화 서비스
 */
export class CostMonitoringService {
  /**
   * OpenAI API 사용량 기록
   */
  static async trackOpenAIUsage(
    plannerId: string | Types.ObjectId,
    endpoint: string,
    tokensUsed: number,
    cost: number,
    metadata?: Record<string, any>
  ): Promise<IApiUsage> {
    try {
      // 사용량 기록 생성
      const usage = await ApiUsage.create({
        plannerId,
        service: 'openai',
        endpoint,
        tokensUsed,
        cost,
        timestamp: new Date(),
        metadata,
        requestId: `openai-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      });

      // 예산 업데이트
      await this.updateBudgetUsage(plannerId, cost);

      return usage;
    } catch (error) {
      console.error('OpenAI API 사용량 기록 중 오류:', error);
      throw new AppError(
        'API 사용량 기록 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * Azure Speech Service API 사용량 기록
   */
  static async trackAzureUsage(
    plannerId: string | Types.ObjectId,
    endpoint: string,
    audioSeconds: number,
    cost: number,
    metadata?: Record<string, any>
  ): Promise<IApiUsage> {
    try {
      // 사용량 기록 생성
      const usage = await ApiUsage.create({
        plannerId,
        service: 'azure',
        endpoint,
        audioSeconds,
        cost,
        timestamp: new Date(),
        metadata,
        requestId: `azure-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      });

      // 예산 업데이트
      await this.updateBudgetUsage(plannerId, cost);

      return usage;
    } catch (error) {
      console.error('Azure API 사용량 기록 중 오류:', error);
      throw new AppError(
        'API 사용량 기록 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 예산 사용량 업데이트 및 알림 처리
   */
  private static async updateBudgetUsage(
    plannerId: string | Types.ObjectId,
    cost: number
  ): Promise<void> {
    try {
      // 예산 설정 조회 또는 생성
      let budgetSetting = await BudgetSetting.findOne({ plannerId });
      
      if (!budgetSetting) {
        budgetSetting = await BudgetSetting.create({
          plannerId,
          monthlyBudget: process.env.MONTHLY_BUDGET_LIMIT ? parseInt(process.env.MONTHLY_BUDGET_LIMIT) : 100000,
          alertThreshold: process.env.COST_ALERT_THRESHOLD ? parseInt(process.env.COST_ALERT_THRESHOLD) : 80,
          currentUsage: 0,
          lastResetDate: new Date()
        });
      }

      // 월 초기화 확인
      const now = new Date();
      const lastResetDate = new Date(budgetSetting.lastResetDate);
      
      if (now.getMonth() !== lastResetDate.getMonth() || now.getFullYear() !== lastResetDate.getFullYear()) {
        // 새로운 달이 시작되면 사용량 초기화
        budgetSetting.currentUsage = 0;
        budgetSetting.lastResetDate = now;
      }

      // 이전 사용량 백분율 계산
      const previousUsagePercentage = (budgetSetting.currentUsage / budgetSetting.monthlyBudget) * 100;
      
      // 사용량 업데이트
      budgetSetting.currentUsage += cost;
      
      // 현재 사용량 백분율 계산
      const currentUsagePercentage = (budgetSetting.currentUsage / budgetSetting.monthlyBudget) * 100;
      
      // 알림 임계값 확인
      if (
        budgetSetting.alertsEnabled &&
        previousUsagePercentage < budgetSetting.alertThreshold &&
        currentUsagePercentage >= budgetSetting.alertThreshold
      ) {
        // 알림 임계값을 초과한 경우 알림 전송
        await this.sendBudgetAlert(plannerId.toString(), budgetSetting);
      }
      
      // 예산 초과 확인
      if (budgetSetting.currentUsage >= budgetSetting.monthlyBudget) {
        // 예산 초과 알림 전송
        await this.sendBudgetExceededAlert(plannerId.toString(), budgetSetting);
      }
      
      // 예산 설정 저장
      await budgetSetting.save();
    } catch (error) {
      console.error('예산 사용량 업데이트 중 오류:', error);
      // 예산 업데이트 실패는 치명적이지 않으므로 오류를 기록만 하고 계속 진행
    }
  }

  /**
   * 예산 알림 임계값 도달 알림 전송
   */
  private static async sendBudgetAlert(
    plannerId: string,
    budgetSetting: IBudgetSetting
  ): Promise<void> {
    try {
      const planner = await User.findById(plannerId);
      
      if (!planner) {
        throw new Error('플래너를 찾을 수 없습니다.');
      }
      
      const usagePercentage = Math.round((budgetSetting.currentUsage / budgetSetting.monthlyBudget) * 100);
      
      // 알림 생성
      await notificationService.createNotification(
        plannerId,
        'lesson_analyzed', // 사용 가능한 타입 사용
        {
          title: '예산 알림',
          body: `월간 API 사용 예산의 ${usagePercentage}%에 도달했습니다. 현재 사용량: ${budgetSetting.currentUsage.toLocaleString()}원`,
          currentUsage: budgetSetting.currentUsage,
          monthlyBudget: budgetSetting.monthlyBudget,
          usagePercentage
        }
      );
    } catch (error) {
      console.error('예산 알림 전송 중 오류:', error);
    }
  }

  /**
   * 예산 초과 알림 전송
   */
  private static async sendBudgetExceededAlert(
    plannerId: string,
    budgetSetting: IBudgetSetting
  ): Promise<void> {
    try {
      const planner = await User.findById(plannerId);
      
      if (!planner) {
        throw new Error('플래너를 찾을 수 없습니다.');
      }
      
      // 알림 생성
      await notificationService.createNotification(
        plannerId,
        'lesson_analyzed', // 사용 가능한 타입 사용
        {
          title: '예산 초과 알림',
          body: `월간 API 사용 예산 ${budgetSetting.monthlyBudget.toLocaleString()}원을 초과했습니다. 현재 사용량: ${budgetSetting.currentUsage.toLocaleString()}원`,
          currentUsage: budgetSetting.currentUsage,
          monthlyBudget: budgetSetting.monthlyBudget,
          exceeded: budgetSetting.currentUsage - budgetSetting.monthlyBudget
        }
      );
    } catch (error) {
      console.error('예산 초과 알림 전송 중 오류:', error);
    }
  }

  /**
   * 플래너별 API 사용량 조회
   */
  static async getPlannerUsage(
    plannerId: string | Types.ObjectId,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    service?: 'openai' | 'azure'
  ): Promise<{
    totalCost: number;
    usageByDay: Array<{ date: string; cost: number }>;
    usageByService: Array<{ service: string; cost: number }>;
    usageByEndpoint: Array<{ endpoint: string; cost: number }>;
  }> {
    try {
      // 기간 설정
      const endDate = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'daily':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }
      
      // 쿼리 조건 설정
      const query: any = {
        plannerId,
        timestamp: { $gte: startDate, $lte: endDate }
      };
      
      if (service) {
        query.service = service;
      }
      
      // 총 비용 조회
      const totalCostResult = await ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: null, totalCost: { $sum: '$cost' } } }
      ]);
      
      const totalCost = totalCostResult.length > 0 ? totalCostResult[0].totalCost : 0;
      
      // 일별 사용량 조회
      const usageByDayResult = await ApiUsage.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            cost: { $sum: '$cost' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);
      
      const usageByDay = usageByDayResult.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        cost: item.cost
      }));
      
      // 서비스별 사용량 조회
      const usageByServiceResult = await ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: '$service', cost: { $sum: '$cost' } } },
        { $sort: { cost: -1 } }
      ]);
      
      const usageByService = usageByServiceResult.map(item => ({
        service: item._id,
        cost: item.cost
      }));
      
      // 엔드포인트별 사용량 조회
      const usageByEndpointResult = await ApiUsage.aggregate([
        { $match: query },
        { $group: { _id: '$endpoint', cost: { $sum: '$cost' } } },
        { $sort: { cost: -1 } }
      ]);
      
      const usageByEndpoint = usageByEndpointResult.map(item => ({
        endpoint: item._id,
        cost: item.cost
      }));
      
      return {
        totalCost,
        usageByDay,
        usageByService,
        usageByEndpoint
      };
    } catch (error) {
      console.error('API 사용량 조회 중 오류:', error);
      throw new AppError(
        'API 사용량 조회 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 플래너 예산 설정 조회
   */
  static async getBudgetSettings(
    plannerId: string | Types.ObjectId
  ): Promise<IBudgetSetting> {
    try {
      // 예산 설정 조회
      let budgetSetting = await BudgetSetting.findOne({ plannerId });
      
      // 예산 설정이 없는 경우 기본값으로 생성
      if (!budgetSetting) {
        budgetSetting = await BudgetSetting.create({
          plannerId,
          monthlyBudget: process.env.MONTHLY_BUDGET_LIMIT ? parseInt(process.env.MONTHLY_BUDGET_LIMIT) : 100000,
          alertThreshold: process.env.COST_ALERT_THRESHOLD ? parseInt(process.env.COST_ALERT_THRESHOLD) : 80,
          currentUsage: 0,
          lastResetDate: new Date()
        });
      }
      
      return budgetSetting;
    } catch (error) {
      console.error('예산 설정 조회 중 오류:', error);
      throw new AppError(
        '예산 설정 조회 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 플래너 예산 설정 업데이트
   */
  static async updateBudgetSettings(
    plannerId: string | Types.ObjectId,
    settings: {
      monthlyBudget?: number;
      alertThreshold?: number;
      alertsEnabled?: boolean;
      serviceSpecificLimits?: {
        openai?: {
          monthlyBudget?: number;
          enabled?: boolean;
        };
        azure?: {
          monthlyBudget?: number;
          enabled?: boolean;
        };
      };
    }
  ): Promise<IBudgetSetting> {
    try {
      // 예산 설정 조회
      let budgetSetting = await BudgetSetting.findOne({ plannerId });
      
      // 예산 설정이 없는 경우 기본값으로 생성
      if (!budgetSetting) {
        budgetSetting = await BudgetSetting.create({
          plannerId,
          monthlyBudget: process.env.MONTHLY_BUDGET_LIMIT ? parseInt(process.env.MONTHLY_BUDGET_LIMIT) : 100000,
          alertThreshold: process.env.COST_ALERT_THRESHOLD ? parseInt(process.env.COST_ALERT_THRESHOLD) : 80,
          currentUsage: 0,
          lastResetDate: new Date()
        });
      }
      
      // 설정 업데이트
      if (settings.monthlyBudget !== undefined) {
        budgetSetting.monthlyBudget = settings.monthlyBudget;
      }
      
      if (settings.alertThreshold !== undefined) {
        budgetSetting.alertThreshold = settings.alertThreshold;
      }
      
      if (settings.alertsEnabled !== undefined) {
        budgetSetting.alertsEnabled = settings.alertsEnabled;
      }
      
      // 서비스별 제한 설정 업데이트
      if (settings.serviceSpecificLimits) {
        if (!budgetSetting.serviceSpecificLimits) {
          budgetSetting.serviceSpecificLimits = {};
        }
        
        if (settings.serviceSpecificLimits.openai) {
          if (!budgetSetting.serviceSpecificLimits[AIServiceType.OPENAI_GPT]) {
            budgetSetting.serviceSpecificLimits[AIServiceType.OPENAI_GPT] = {
              monthlyBudget: 0,
              enabled: true
            };
          }
          
          if (settings.serviceSpecificLimits.openai.monthlyBudget !== undefined) {
            budgetSetting.serviceSpecificLimits[AIServiceType.OPENAI_GPT].monthlyBudget = settings.serviceSpecificLimits.openai.monthlyBudget;
          }
          
          if (settings.serviceSpecificLimits.openai.enabled !== undefined) {
            budgetSetting.serviceSpecificLimits[AIServiceType.OPENAI_GPT].enabled = settings.serviceSpecificLimits.openai.enabled;
          }
        }
        
        if (settings.serviceSpecificLimits.azure) {
          if (!budgetSetting.serviceSpecificLimits[AIServiceType.AZURE_SPEECH]) {
            budgetSetting.serviceSpecificLimits[AIServiceType.AZURE_SPEECH] = {
              monthlyBudget: 0,
              enabled: true
            };
          }
          
          if (settings.serviceSpecificLimits.azure.monthlyBudget !== undefined) {
            budgetSetting.serviceSpecificLimits[AIServiceType.AZURE_SPEECH].monthlyBudget = settings.serviceSpecificLimits.azure.monthlyBudget;
          }
          
          if (settings.serviceSpecificLimits.azure.enabled !== undefined) {
            budgetSetting.serviceSpecificLimits[AIServiceType.AZURE_SPEECH].enabled = settings.serviceSpecificLimits.azure.enabled;
          }
        }
      }
      
      // 예산 설정 저장
      await budgetSetting.save();
      
      return budgetSetting;
    } catch (error) {
      console.error('예산 설정 업데이트 중 오류:', error);
      throw new AppError(
        '예산 설정 업데이트 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 비정상적인 사용 패턴 감지
   */
  static async detectAnomalies(
    plannerId: string | Types.ObjectId
  ): Promise<{
    hasAnomalies: boolean;
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      data: any;
    }>;
  }> {
    try {
      const anomalies = [];
      
      // 1. 일일 사용량 급증 감지
      const dailyUsage = await this.getDailyUsageForAnomalyDetection(plannerId);
      
      if (dailyUsage.length >= 2) {
        const today = dailyUsage[dailyUsage.length - 1];
        const yesterday = dailyUsage[dailyUsage.length - 2];
        
        // 전일 대비 사용량이 200% 이상 증가한 경우
        if (yesterday.cost > 0 && today.cost / yesterday.cost >= 3) {
          anomalies.push({
            type: 'daily_usage_spike',
            description: `일일 사용량이 전일 대비 ${Math.round((today.cost / yesterday.cost - 1) * 100)}% 증가했습니다.`,
            severity: 'medium' as const,
            data: {
              today: today.cost,
              yesterday: yesterday.cost,
              increasePercentage: Math.round((today.cost / yesterday.cost - 1) * 100)
            }
          });
        }
      }
      
      // 2. 특정 엔드포인트 사용량 급증 감지
      const endpointUsage = await this.getEndpointUsageForAnomalyDetection(plannerId);
      
      for (const endpoint of endpointUsage) {
        // 평균 사용량 대비 300% 이상 증가한 경우
        if (endpoint.avgCost > 0 && endpoint.todayCost / endpoint.avgCost >= 4) {
          anomalies.push({
            type: 'endpoint_usage_spike',
            description: `'${endpoint.endpoint}' 엔드포인트 사용량이 평균 대비 ${Math.round((endpoint.todayCost / endpoint.avgCost - 1) * 100)}% 증가했습니다.`,
            severity: 'high' as const,
            data: {
              endpoint: endpoint.endpoint,
              todayCost: endpoint.todayCost,
              avgCost: endpoint.avgCost,
              increasePercentage: Math.round((endpoint.todayCost / endpoint.avgCost - 1) * 100)
            }
          });
        }
      }
      
      // 3. 예산 소진 속도 감지
      const budgetSetting = await this.getBudgetSettings(plannerId);
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const dayOfMonth = new Date().getDate();
      
      // 월의 절반도 지나지 않았는데 예산의 70% 이상 소진된 경우
      if (dayOfMonth < daysInMonth / 2 && budgetSetting.currentUsage / budgetSetting.monthlyBudget > 0.7) {
        anomalies.push({
          type: 'budget_depletion_rate',
          description: `월의 ${Math.round((dayOfMonth / daysInMonth) * 100)}%만 지났지만 예산의 ${Math.round((budgetSetting.currentUsage / budgetSetting.monthlyBudget) * 100)}%가 이미 소진되었습니다.`,
          severity: 'high' as const,
          data: {
            currentUsage: budgetSetting.currentUsage,
            monthlyBudget: budgetSetting.monthlyBudget,
            dayOfMonth,
            daysInMonth,
            usagePercentage: Math.round((budgetSetting.currentUsage / budgetSetting.monthlyBudget) * 100),
            timePercentage: Math.round((dayOfMonth / daysInMonth) * 100)
          }
        });
      }
      
      return {
        hasAnomalies: anomalies.length > 0,
        anomalies
      };
    } catch (error) {
      console.error('비정상적인 사용 패턴 감지 중 오류:', error);
      throw new AppError(
        '사용 패턴 분석 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 이상 감지를 위한 일일 사용량 조회
   */
  private static async getDailyUsageForAnomalyDetection(
    plannerId: string | Types.ObjectId
  ): Promise<Array<{ date: string; cost: number }>> {
    // 최근 7일간의 일일 사용량 조회
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const query = {
      plannerId,
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    const result = await ApiUsage.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          cost: { $sum: '$cost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    return result.map(item => ({
      date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
      cost: item.cost
    }));
  }

  /**
   * 이상 감지를 위한 엔드포인트별 사용량 조회
   */
  private static async getEndpointUsageForAnomalyDetection(
    plannerId: string | Types.ObjectId
  ): Promise<Array<{ endpoint: string; todayCost: number; avgCost: number }>> {
    // 오늘 날짜 설정
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 지난 7일 시작일 설정
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    // 오늘 엔드포인트별 사용량 조회
    const todayQuery = {
      plannerId,
      timestamp: { $gte: today, $lt: tomorrow }
    };
    
    const todayResult = await ApiUsage.aggregate([
      { $match: todayQuery },
      { $group: { _id: '$endpoint', cost: { $sum: '$cost' } } }
    ]);
    
    // 지난 7일간 엔드포인트별 평균 사용량 조회
    const lastWeekQuery = {
      plannerId,
      timestamp: { $gte: lastWeekStart, $lt: today }
    };
    
    const lastWeekResult = await ApiUsage.aggregate([
      { $match: lastWeekQuery },
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            day: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            }
          },
          dailyCost: { $sum: '$cost' }
        }
      },
      {
        $group: {
          _id: '$_id.endpoint',
          avgCost: { $avg: '$dailyCost' }
        }
      }
    ]);
    
    // 결과 병합
    const endpointMap = new Map();
    
    lastWeekResult.forEach(item => {
      endpointMap.set(item._id, {
        endpoint: item._id,
        avgCost: item.avgCost,
        todayCost: 0
      });
    });
    
    todayResult.forEach(item => {
      if (endpointMap.has(item._id)) {
        const endpoint = endpointMap.get(item._id);
        endpoint.todayCost = item.cost;
      } else {
        endpointMap.set(item._id, {
          endpoint: item._id,
          avgCost: 0,
          todayCost: item.cost
        });
      }
    });
    
    return Array.from(endpointMap.values());
  }

  /**
   * 최적화 권장 사항 생성
   */
  static async generateOptimizationRecommendations(
    plannerId: string | Types.ObjectId
  ): Promise<Array<{
    type: string;
    title: string;
    description: string;
    potentialSavings: number;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  }>> {
    try {
      const recommendations = [];
      
      // 1. 서비스별 사용량 분석
      const monthlyUsage = await this.getPlannerUsage(plannerId, 'monthly');
      
      // 2. 파일 저장소 최적화 권장
      const fileStorageRecommendation = await this.analyzeFileStorageOptimization(plannerId);
      if (fileStorageRecommendation) {
        recommendations.push(fileStorageRecommendation);
      }
      
      // 3. OpenAI 토큰 사용량 최적화 권장
      if (monthlyUsage.usageByService.some(s => s.service === 'openai')) {
        const openaiRecommendation = await this.analyzeOpenAIOptimization(plannerId);
        if (openaiRecommendation) {
          recommendations.push(openaiRecommendation);
        }
      }
      
      // 4. Azure Speech Service 사용량 최적화 권장
      if (monthlyUsage.usageByService.some(s => s.service === 'azure')) {
        const azureRecommendation = await this.analyzeAzureSpeechOptimization(plannerId);
        if (azureRecommendation) {
          recommendations.push(azureRecommendation);
        }
      }
      
      // 5. 캐싱 전략 권장
      recommendations.push({
        type: 'caching_strategy',
        title: '결과 캐싱으로 중복 API 호출 감소',
        description: '자주 요청되는 분석 결과를 Redis에 캐싱하여 동일한 오디오 파일에 대한 중복 API 호출을 줄입니다.',
        potentialSavings: Math.round(monthlyUsage.totalCost * 0.15), // 약 15% 절감 가능
        implementationDifficulty: 'medium' as const
      });
      
      // 6. 배치 처리 권장
      recommendations.push({
        type: 'batch_processing',
        title: '배치 처리로 API 호출 최적화',
        description: '여러 개의 작은 API 요청을 하나의 배치 요청으로 통합하여 API 호출 횟수를 줄입니다.',
        potentialSavings: Math.round(monthlyUsage.totalCost * 0.1), // 약 10% 절감 가능
        implementationDifficulty: 'medium' as const
      });
      
      return recommendations;
    } catch (error) {
      console.error('최적화 권장 사항 생성 중 오류:', error);
      throw new AppError(
        '최적화 권장 사항 생성 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 저장소 최적화 분석
   */
  private static async analyzeFileStorageOptimization(
    plannerId: string | Types.ObjectId
  ): Promise<{
    type: string;
    title: string;
    description: string;
    potentialSavings: number;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  } | null> {
    // 파일 저장소 최적화 권장 사항 생성
    // 실제 구현에서는 S3 버킷 사용량 등을 분석하여 권장 사항 생성
    return {
      type: 'file_storage_optimization',
      title: '오래된 오디오 파일 자동 아카이브',
      description: '30일 이상 지난 오디오 파일을 S3 Glacier로 자동 이동하여 스토리지 비용을 절감합니다.',
      potentialSavings: 5000, // 월 5,000원 절감 예상
      implementationDifficulty: 'easy' as const
    };
  }

  /**
   * OpenAI API 사용량 최적화 분석
   */
  private static async analyzeOpenAIOptimization(
    plannerId: string | Types.ObjectId
  ): Promise<{
    type: string;
    title: string;
    description: string;
    potentialSavings: number;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  } | null> {
    // OpenAI API 사용량 분석
    const monthlyUsage = await this.getPlannerUsage(plannerId, 'monthly', 'openai');
    
    if (monthlyUsage.totalCost > 0) {
      return {
        type: 'openai_optimization',
        title: 'OpenAI 프롬프트 최적화',
        description: '프롬프트 길이를 줄이고 효율적인 프롬프트 설계를 통해 토큰 사용량을 줄입니다.',
        potentialSavings: Math.round(monthlyUsage.totalCost * 0.2), // 약 20% 절감 가능
        implementationDifficulty: 'medium' as const
      };
    }
    
    return null;
  }

  /**
   * Azure Speech Service 사용량 최적화 분석
   */
  private static async analyzeAzureSpeechOptimization(
    plannerId: string | Types.ObjectId
  ): Promise<{
    type: string;
    title: string;
    description: string;
    potentialSavings: number;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  } | null> {
    // Azure Speech Service 사용량 분석
    const monthlyUsage = await this.getPlannerUsage(plannerId, 'monthly', 'azure');
    
    if (monthlyUsage.totalCost > 0) {
      return {
        type: 'azure_speech_optimization',
        title: '오디오 전처리 최적화',
        description: '오디오 파일을 분석 전에 무음 구간을 제거하고 필요한 부분만 처리하여 분석 시간과 비용을 줄입니다.',
        potentialSavings: Math.round(monthlyUsage.totalCost * 0.25), // 약 25% 절감 가능
        implementationDifficulty: 'hard' as const
      };
    }
    
    return null;
  }
}

// 서비스 인스턴스 생성
export const costMonitoringService = {
  trackOpenAIUsage: CostMonitoringService.trackOpenAIUsage,
  trackAzureUsage: CostMonitoringService.trackAzureUsage,
  getPlannerUsage: CostMonitoringService.getPlannerUsage,
  getBudgetSettings: CostMonitoringService.getBudgetSettings,
  updateBudgetSettings: CostMonitoringService.updateBudgetSettings,
  detectAnomalies: CostMonitoringService.detectAnomalies,
  generateOptimizationRecommendations: CostMonitoringService.generateOptimizationRecommendations
};