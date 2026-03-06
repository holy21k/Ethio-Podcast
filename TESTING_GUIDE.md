# Testing Guide - Profile & Settings Features

## Quick Start

### Step 1: Start the Backend Server

```bash
cd backend
npm start
```

The server should start at `http://localhost:3000`

### Step 2: Open the Test Page

Open this file in your browser:
```
backend/test-profile.html
```

Or navigate to:
```
http://localhost:3000/test-profile.html
```

### Step 3: Get Your Firebase Token

You have two options:

#### Option A: Use Mock Mode (For Testing Without Firebase)
If Firebase Admin is not configured, the backend runs in MOCK mode. You can use any string as a token:
```
test-token-12345
```

#### Option B: Get Real Firebase Token (If Firebase is Configured)
1. Log in to your app using Firebase Authentication
2. In your browser console, run:
```javascript
firebase.auth().currentUser.getIdToken().then(token => console.log(token));
```
3. Copy the token that appears in the console

### Step 4: Test the Endpoints

1. Paste your token in the "Firebase Token" field
2. Click "Save Token"
3. Click "Test Auth" to verify it works
4. Now you can test all the features!

---

## Testing Each Feature

### 👤 Profile Management

1. Click "Get Profile" to see your current profile
2. Click "Update Profile" to show the form
3. Fill in your details:
   - Display Name
   - Photo URL
   - Bio
   - Interests (comma separated)
4. Click "Save Changes"

### 🔔 Notifications

1. Click "Get Preferences" to load current settings
2. Toggle the checkboxes for different notification types
3. Click "Save Preferences"

### ⚙️ Settings

1. Click "Get Settings" to load current settings
2. Change:
   - Language (English/Amharic)
   - Theme (Light/Dark/Auto)
   - Autoplay (on/off)
   - Playback Speed (0.5x to 2.0x)
3. Click "Save Settings"

### 🔒 Privacy & Security

1. Click "Get Privacy" to load privacy settings
2. Change:
   - Profile Visibility (Public/Private/Friends)
   - Show History (on/off)
   - Show Watchlist (on/off)
   - Allow Recommendations (on/off)
3. Click "Save Privacy"
4. Click "Get Security Info" to see security details

### 💬 Help & Support

1. Click "Get FAQ" to see frequently asked questions
2. Click "About App" to see app information
3. Fill in the support form:
   - Subject
   - Message
   - Category
4. Click "Submit Request"
5. Click "My Tickets" to see your submitted tickets

---

## Common Issues & Solutions

### Issue: "Unauthorized: No token provided"
**Solution:** Make sure you've entered and saved your token

### Issue: "Invalid or expired token"
**Solution:** 
- If using real Firebase, get a fresh token
- If using mock mode, use any string like "test-token-123"

### Issue: "Profile not found"
**Solution:** The profile is created automatically on first login. Try calling `/api/auth/login` first

### Issue: Server not responding
**Solution:** 
1. Make sure the backend is running: `npm start` in the backend folder
2. Check the console for errors
3. Verify the server is at `http://localhost:3000`

---

## API Endpoints Summary

All endpoints return JSON in this format:
```json
{
  "status": "success" | "error",
  "message": "Description",
  "data": { /* response data */ }
}
```

### Profile Endpoints (🔒 Auth Required)
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `DELETE /api/user/profile` - Delete account

### Notification Endpoints (🔒 Auth Required)
- `GET /api/user/notifications` - Get preferences
- `PUT /api/user/notifications` - Update preferences

### Settings Endpoints (🔒 Auth Required)
- `GET /api/user/settings` - Get settings
- `PUT /api/user/settings` - Update settings

### Privacy Endpoints (🔒 Auth Required)
- `GET /api/user/privacy` - Get privacy settings
- `PUT /api/user/privacy` - Update privacy
- `GET /api/user/security` - Get security info
- `POST /api/user/security/verify-email` - Send verification email

### Support Endpoints
- `GET /api/support/faq` - Get FAQ (no auth)
- `GET /api/support/about` - Get app info (no auth)
- `POST /api/support/contact` - Submit ticket (🔒 auth required)
- `GET /api/support/tickets` - Get user tickets (🔒 auth required)

---

## Next Steps for Frontend Integration

Once you've tested everything works, integrate into your React/Vue/Angular app:

1. Create an auth service to manage the Firebase token
2. Create API service functions (see FRONTEND_API_DOCS.md)
3. Build UI components for each feature
4. Connect the components to the API

Example auth service:
```javascript
// auth.service.js
import { auth } from './firebase';

export async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  return await user.getIdToken();
}

export function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  };
}
```

Example API service:
```javascript
// api.service.js
import { getAuthHeaders } from './auth.service';

const API_BASE = 'http://localhost:3000';

export async function getProfile() {
  const response = await fetch(`${API_BASE}/api/user/profile`, {
    headers: getAuthHeaders()
  });
  return await response.json();
}

export async function updateProfile(data) {
  const response = await fetch(`${API_BASE}/api/user/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await response.json();
}
```

---

## Data Storage

All user data is stored in `backend/users.json`:

```json
{
  "users": {
    "user-uid": {
      "uid": "user-uid",
      "email": "user@example.com",
      "displayName": "User Name",
      "bio": "User bio",
      "interests": ["Tech", "Business"],
      "notificationPreferences": { ... },
      "settings": { ... },
      "privacy": { ... }
    }
  },
  "supportTickets": [ ... ]
}
```

You can view and edit this file directly for testing.
