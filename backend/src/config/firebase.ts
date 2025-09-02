import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
const initializeFirebase = (): admin.app.App | null => {
  try {
    // Firebase 환경 변수가 없으면 초기화하지 않음
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('Firebase 환경 변수가 설정되지 않음. Firebase 비활성화.');
      return null;
    }

    // Check if an app has already been initialized
    const existingApp = admin.apps.find(app => app?.name === 'default');
    if (existingApp) {
      return existingApp;
    }

    // Initialize with environment variables
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.log('Firebase를 비활성화하고 계속 진행합니다.');
    return null;
  }
};

// Export the Firebase app instance
export const firebaseApp = initializeFirebase();

// Export the messaging service - only if Firebase is initialized
export const messaging = firebaseApp ? admin.messaging(firebaseApp) : null;

export default {
  firebaseApp,
  messaging,
};