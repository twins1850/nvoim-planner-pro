import express from 'express';
import * as authController from '../controllers/authController';
import { validate, validationRules } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// 회원가입
router.post(
  '/register',
  validate(validationRules.auth.register),
  authController.register
);

// 로그인
router.post(
  '/login',
  validate(validationRules.auth.login),
  authController.login
);

// 로그아웃 (인증 필요)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// 토큰 갱신
router.post(
  '/refresh',
  authController.refreshToken
);

// 비밀번호 변경 (인증 필요)
router.post(
  '/change-password',
  authenticate,
  validate(validationRules.auth.changePassword),
  authController.changePassword
);

// 비밀번호 재설정 요청
router.post(
  '/forgot-password',
  validate([
    { field: 'email', required: true, type: 'email' }
  ]),
  authController.requestPasswordReset
);

// 비밀번호 재설정
router.post(
  '/reset-password',
  validate([
    { field: 'token', required: true, type: 'string' },
    { field: 'newPassword', required: true, type: 'password' }
  ]),
  authController.resetPassword
);

export default router;