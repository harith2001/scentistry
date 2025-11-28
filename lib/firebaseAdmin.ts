import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  }
}

export const adminAuth = adminApp ? getAuth(adminApp) : undefined;
export const adminDb = adminApp ? getFirestore(adminApp) : undefined;
