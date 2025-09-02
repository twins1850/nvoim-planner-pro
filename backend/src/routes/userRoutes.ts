import express from 'express';
import * as userController from '../controllers/userController';
import { validate, validationRules } from '../middleware/validation';
import { authenticate, authorize, checkOwnership, checkStudentOwnership } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();

// 파일 업로드 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드할 수 있습니다.') as any, false);
    }
  },
});

// 현재 사용자 정보 조회
router.get(
  '/me',
  authenticate,
  userController.getCurrentUser
);

// 사용자 프로필 업데이트
router.put(
  '/me',
  authenticate,
  validate(validationRules.user.updateProfile),
  userController.updateProfile
);

// 프로필 이미지 업로드/업데이트
router.post(
  '/me/avatar',
  authenticate,
  upload.single('avatar'),
  userController.updateProfileImage
);

// 특정 사용자 조회 (관리자 또는 플래너만 가능)
router.get(
  '/:userId',
  authenticate,
  authorize('admin', 'planner'),
  userController.getUserById
);

// 플래너가 관리하는 학생 목록 조회
router.get(
  '/planner/students',
  authenticate,
  authorize('planner'),
  userController.getManagedStudents
);

// 학생에게 플래너 할당
router.post(
  '/planner/students/:studentId',
  authenticate,
  authorize('planner'),
  userController.assignPlannerToStudent
);

// 학생에서 플래너 할당 해제
router.delete(
  '/planner/students/:studentId',
  authenticate,
  authorize('planner'),
  userController.unassignPlannerFromStudent
);

export default router;