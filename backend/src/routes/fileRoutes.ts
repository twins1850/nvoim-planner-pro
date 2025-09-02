import { Router } from 'express';
import { uploadFile, getFileStatus, deleteFile, getUserFiles } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/files/upload
 * @desc    파일 업로드
 * @access  Private
 */
router.post('/upload', authenticate, uploadFile);

/**
 * @route   GET /api/files/:fileId/status
 * @desc    파일 상태 조회
 * @access  Private
 */
router.get('/:fileId/status', authenticate, getFileStatus);

/**
 * @route   DELETE /api/files/:fileId
 * @desc    파일 삭제
 * @access  Private
 */
router.delete('/:fileId', authenticate, deleteFile);

/**
 * @route   GET /api/files
 * @desc    사용자 파일 목록 조회
 * @access  Private
 */
router.get('/', authenticate, getUserFiles);

export default router;