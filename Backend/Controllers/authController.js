import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import User from '../Model/User.js';
import { encrypt, decrypt } from '../Utils/encryption.js';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export const getGoogleAuthUrl = (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ];

    // Force prompt consent & select_account to guarantee Google issues a fresh refresh token
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account consent',
      include_granted_scopes: true,
      scope: scopes,
    });

    return res.json({ success: true, url });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code missing' });
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser || !googleUser.id) {
      return res.status(400).json({ success: false, message: 'Failed to retrieve Google user profile' });
    }

    let user = await User.findOne({ googleId: googleUser.id });

    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    if (user) {
      user.email = googleUser.email;
      user.name = googleUser.name || user.name;
      if (encryptedRefreshToken) {
        user.googleRefreshTokenEncrypted = encryptedRefreshToken;
      }
      await user.save();
    } else {
      user = await User.create({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || '',
        googleRefreshTokenEncrypted: encryptedRefreshToken,
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);
  } catch (error) {
    console.error('Google Callback Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
  }
};

export const getPickerToken = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id);
    if (!userDoc || !userDoc.googleRefreshTokenEncrypted) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Google account missing offline access token. Click Reconnect Google Account to authorize.',
      });
    }

    const refreshToken = decrypt(userDoc.googleRefreshTokenEncrypted);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Failed to refresh access token for Google Picker. Click Reconnect Google Account.',
      });
    }

    return res.json({
      success: true,
      accessToken,
      apiKey: process.env.GOOGLE_API_KEY || '',
    });
  } catch (error) {
    console.error('Picker Token Error:', error);
    if (error.message && (error.message.includes('invalid_grant') || error.code === 401)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Google access expired or scope updated. Click Reconnect Google Account.',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      googleId: req.user.googleId,
    },
  });
};

export const logout = async (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
};
