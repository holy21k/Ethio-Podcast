const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (works on Vercel)
if (admin.apps.length === 0) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            privateKey
        ) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    type: 'service_account',
                    project_id: process.env.FIREBASE_PROJECT_ID,
                    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                    private_key: privateKey,
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    client_id: process.env.FIREBASE_CLIENT_ID,
                    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: 'https://oauth2.googleapis.com/token',
                })
            });
            console.log('✅ Firebase Admin SDK initialized from env vars');
        } else {
            // Try loading from local config file as fallback (local dev only)
            try {
                const adminConfig = require('../config/firebase-config');
                if (adminConfig?.adminConfig) {
                    admin.initializeApp({ credential: admin.credential.cert(adminConfig.adminConfig) });
                    console.log('✅ Firebase Admin SDK initialized from local config');
                } else {
                    throw new Error('No adminConfig export found');
                }
            } catch (e) {
                console.error('❌ Firebase Admin: No valid config found. Set FIREBASE_* env vars on Vercel!');
                // Do NOT fall through to mock mode — let requests fail properly in production
            }
        }
    } catch (e) {
        console.error('❌ Firebase Admin initialization failed:', e.message);
    }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// 🎯 Auth Middleware: Verify Firebase ID Token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: No token provided',
            code: 'NO_TOKEN'
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (admin.apps.length > 0) {
            // ✅ Real Firebase verification
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            req.user = decodedToken;
            req.user.uid = decodedToken.uid;
            req.user.isAnonymous = decodedToken.firebase?.isAnonymous || false;
        } else {
            // ❌ Firebase not initialized — reject the request
            return res.status(503).json({
                status: 'error',
                message: 'Auth service not configured. Contact admin.',
                code: 'AUTH_NOT_CONFIGURED'
            });
        }
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
};

// 🎯 Optional Auth Middleware: Allows both authenticated and anonymous requests
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    try {
        await verifyToken(req, res, next);
    } catch (e) {
        req.user = null;
        next();
    }
};

// 🎯 Admin Check Middleware
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }

    if (!req.user.admin && !process.env.ADMIN_UIDS?.includes(req.user.uid)) {
        return res.status(403).json({
            status: 'error',
            message: 'Admin access required'
        });
    }

    next();
};

module.exports = { verifyToken, optionalAuth, requireAdmin, db, admin };
