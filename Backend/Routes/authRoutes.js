import express from 'express';
import { getGoogleAuthUrl, googleCallback, getPickerToken, getMe, logout } from '../Controllers/authController.js';
import { protect } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.get('/google/url', getGoogleAuthUrl);
router.get('/google/callback', googleCallback);
router.get('/google/picker-token', protect, getPickerToken);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
