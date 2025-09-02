import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  speechToText,
  separateSpeakers,
  evaluatePronunciation,
  identifySpeaker,
  analyzeAudio
} from '../controllers/speechController';

const router = express.Router();

/**
 * @route   POST /api/speech/text/:fileId
 * @desc    음성을 텍스트로 변환
 * @access  Private
 */
router.post('/text/:fileId', authMiddleware, speechToText);

/**
 * @route   POST /api/speech/speakers/:fileId
 * @desc    화자 분리
 * @access  Private
 */
router.post('/speakers/:fileId', authMiddleware, separateSpeakers);

/**
 * @route   POST /api/speech/pronunciation/:fileId
 * @desc    발음 평가
 * @access  Private
 */
router.post(
  '/pronunciation/:fileId',
  authMiddleware,
  validateRequest({
    body: {
      referenceText: { type: 'string', required: true }
    }
  }),
  evaluatePronunciation
);

/**
 * @route   POST /api/speech/identify/:fileId
 * @desc    화자 인식
 * @access  Private
 */
router.post(
  '/identify/:fileId',
  authMiddleware,
  validateRequest({
    body: {
      speakerIds: { type: 'array', required: true, items: { type: 'string' } }
    }
  }),
  identifySpeaker
);

/**
 * @route   POST /api/speech/analyze/:fileId
 * @desc    종합 오디오 분석
 * @access  Private
 */
router.post(
  '/analyze/:fileId',
  authMiddleware,
  validateRequest({
    body: {
      separateSpeakers: { type: 'boolean', required: false },
      evaluatePronunciation: { type: 'boolean', required: false },
      referenceText: { type: 'string', required: false },
      identifySpeaker: { type: 'boolean', required: false },
      speakerIds: { type: 'array', required: false, items: { type: 'string' } }
    }
  }),
  analyzeAudio
);

export default router;