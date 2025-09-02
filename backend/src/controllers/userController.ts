import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { performanceOptimizationService } from '../services/performanceOptimizationService';
import mongoose from 'mongoose';

// 현재 사용자 정보 조회 (성능 최적화)
export const getCurrentUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  
  if (!userId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 사용자 정보 캐싱으로 성능 최적화
  const user = await performanceOptimizationService.optimizedQuery(
    `user:${userId}`,
    async () => {
      return User.findById(userId).select('-password').lean().exec();
    },
    300000 // 5분 캐시
  );
  
  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// 사용자 프로필 업데이트
export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  
  if (!userId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  const { profile } = req.body;
  
  // 업데이트할 필드 선택
  const updateData: any = {};
  
  if (profile) {
    // 이름 업데이트
    if (profile.name) {
      updateData['profile.name'] = profile.name;
    }
    
    // 전화번호 업데이트
    if (profile.phone !== undefined) {
      updateData['profile.phone'] = profile.phone;
    }
    
    // 환경설정 업데이트
    if (profile.preferences) {
      if (profile.preferences.language) {
        updateData['profile.preferences.language'] = profile.preferences.language;
      }
      
      if (profile.preferences.notifications !== undefined) {
        updateData['profile.preferences.notifications'] = profile.preferences.notifications;
      }
      
      if (profile.preferences.timezone) {
        updateData['profile.preferences.timezone'] = profile.preferences.timezone;
      }
    }
    
    // 학생 전용 필드 업데이트
    if (req.user?.role === 'student' && profile.learningLevel) {
      updateData['profile.learningLevel'] = profile.learningLevel;
    }
  }
  
  // 업데이트할 데이터가 없으면 에러
  if (Object.keys(updateData).length === 0) {
    throw new AppError('업데이트할 데이터가 없습니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 사용자 업데이트
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 캐시 무효화
  await performanceOptimizationService.invalidateCache(`user:${userId}`);
  
  res.status(200).json({
    success: true,
    message: '프로필이 성공적으로 업데이트되었습니다.',
    data: updatedUser
  });
});

// 프로필 이미지 업로드/업데이트
export const updateProfileImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  
  if (!userId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  if (!req.file) {
    throw new AppError('이미지 파일이 제공되지 않았습니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // S3에 이미지 업로드 로직 (실제 구현 필요)
  // const imageUrl = await uploadImageToS3(req.file);
  const imageUrl = `https://example.com/images/${req.file.filename}`; // 임시 URL
  
  // 사용자 프로필 이미지 업데이트
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { 'profile.avatar': imageUrl } },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  res.status(200).json({
    success: true,
    message: '프로필 이미지가 성공적으로 업데이트되었습니다.',
    data: {
      avatar: imageUrl,
      user: updatedUser
    }
  });
});

// 특정 사용자 조회 (관리자 또는 플래너만 가능)
export const getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('유효하지 않은 사용자 ID입니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 권한 확인
  if (req.user?.role !== 'admin' && req.user?.role !== 'planner') {
    throw new AppError('이 작업을 수행할 권한이 없습니다.', ErrorType.AUTHORIZATION_ERROR, 403);
  }
  
  // 플래너인 경우 자신이 관리하는 학생인지 확인
  if (req.user?.role === 'planner') {
    const isManaged = req.user.profile.managedStudents?.some(
      (id: any) => id.toString() === userId
    );
    
    if (!isManaged && req.user?._id.toString() !== userId) {
      throw new AppError('이 사용자에 접근할 권한이 없습니다.', ErrorType.AUTHORIZATION_ERROR, 403);
    }
  }
  
  const user = await User.findById(userId).select('-password');
  
  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.VALIDATION_ERROR, 404);
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// 플래너가 관리하는 학생 목록 조회 (성능 최적화)
export const getManagedStudents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const plannerId = req.user?._id;
  
  if (!plannerId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 플래너 권한 확인
  if (req.user?.role !== 'planner') {
    throw new AppError('플래너만 이 작업을 수행할 수 있습니다.', ErrorType.AUTHORIZATION_ERROR, 403);
  }
  
  // 성능 최적화된 학생 목록 조회
  const students = await performanceOptimizationService.optimizedQuery(
    `planner:students:${plannerId}`,
    async () => {
      // 플래너 정보 조회
      const planner = await User.findById(plannerId).lean().exec();
      
      if (!planner) {
        throw new AppError('플래너 정보를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
      }
      
      // 관리하는 학생 목록 조회
      return User.find({
        _id: { $in: planner.profile.managedStudents || [] },
        role: 'student'
      }).select('-password').lean().exec();
    },
    300000 // 5분 캐시
  );
  
  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

// 학생에게 플래너 할당
export const assignPlannerToStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { studentId } = req.params;
  const plannerId = req.user?._id;
  
  if (!plannerId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 플래너 권한 확인
  if (req.user?.role !== 'planner') {
    throw new AppError('플래너만 이 작업을 수행할 수 있습니다.', ErrorType.AUTHORIZATION_ERROR, 403);
  }
  
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError('유효하지 않은 학생 ID입니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 학생 조회
  const student = await User.findById(studentId);
  
  if (!student) {
    throw new AppError('학생을 찾을 수 없습니다.', ErrorType.VALIDATION_ERROR, 404);
  }
  
  if (student.role !== 'student') {
    throw new AppError('해당 사용자는 학생이 아닙니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 이미 다른 플래너가 할당되어 있는지 확인
  if (student.profile.assignedPlanner && student.profile.assignedPlanner.toString() !== plannerId.toString()) {
    throw new AppError('이 학생은 이미 다른 플래너에게 할당되어 있습니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 트랜잭션 시작
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 학생에게 플래너 할당
    await User.findByIdAndUpdate(
      studentId,
      { $set: { 'profile.assignedPlanner': plannerId } },
      { session }
    );
    
    // 플래너의 관리 학생 목록에 추가
    await User.findByIdAndUpdate(
      plannerId,
      { $addToSet: { 'profile.managedStudents': studentId } },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    
    // 캐시 무효화
    await performanceOptimizationService.invalidateCache(`planner:students:${plannerId}`);
    await performanceOptimizationService.invalidateCache(`user:${studentId}`);
    
    res.status(200).json({
      success: true,
      message: '학생이 성공적으로 할당되었습니다.'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// 학생에서 플래너 할당 해제
export const unassignPlannerFromStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { studentId } = req.params;
  const plannerId = req.user?._id;
  
  if (!plannerId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 플래너 권한 확인
  if (req.user?.role !== 'planner') {
    throw new AppError('플래너만 이 작업을 수행할 수 있습니다.', ErrorType.AUTHORIZATION_ERROR, 403);
  }
  
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError('유효하지 않은 학생 ID입니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 학생 조회
  const student = await User.findById(studentId);
  
  if (!student) {
    throw new AppError('학생을 찾을 수 없습니다.', ErrorType.VALIDATION_ERROR, 404);
  }
  
  // 해당 플래너가 할당되어 있는지 확인
  if (!student.profile.assignedPlanner || student.profile.assignedPlanner.toString() !== plannerId.toString()) {
    throw new AppError('이 학생은 현재 플래너에게 할당되어 있지 않습니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 트랜잭션 시작
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 학생에서 플래너 할당 해제
    await User.findByIdAndUpdate(
      studentId,
      { $unset: { 'profile.assignedPlanner': 1 } },
      { session }
    );
    
    // 플래너의 관리 학생 목록에서 제거
    await User.findByIdAndUpdate(
      plannerId,
      { $pull: { 'profile.managedStudents': studentId } },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    
    // 캐시 무효화
    await performanceOptimizationService.invalidateCache(`planner:students:${plannerId}`);
    await performanceOptimizationService.invalidateCache(`user:${studentId}`);
    
    res.status(200).json({
      success: true,
      message: '학생 할당이 성공적으로 해제되었습니다.'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});