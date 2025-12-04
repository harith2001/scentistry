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
  } else {
    // Fallback to Application Default Credentials if service account env vars are not set.
    // Requires GOOGLE_APPLICATION_CREDENTIALS or a runtime with ADC configured.
    try {
      adminApp = initializeApp();
    } catch (e) {
      // leave adminApp undefined; API routes will return a clear error
      // eslint-disable-next-line no-console
      console.error('Firebase Admin initialization failed. Set FIREBASE_* envs or ADC.', e);
    }
  }
}

export const adminAuth = adminApp ? getAuth(adminApp) : undefined;
export const adminDb = adminApp ? getFirestore(adminApp) : undefined;

/**
 * Returns a lightweight status object indicating whether Firebase Admin initialized,
 * and whether required env vars were detected. Useful for health checks.
 */
export function getAdminInitStatus() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const hasServiceEnv = Boolean(projectId && clientEmail && privateKeyRaw);
  return {
    initialized: Boolean(adminApp && adminDb),
    hasServiceAccountEnv: hasServiceEnv,
    usingADC: !hasServiceEnv,
    projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || undefined,
  };
}
