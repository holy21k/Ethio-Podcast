# Frontend API Documentation - New Endpoints

This document covers the newly added endpoints for profile management, notifications, settings, privacy & security, and help & support.

## Authentication

All endpoints marked with 🔒 require authentication. Include the Firebase ID token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${firebaseToken}`,
  'Content-Type': 'application/json'
}
```

---

## 👤 Profile Management

### Get User Profile
**GET** `/api/user/profile` 🔒

Get the current user's profile information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "uid": "user123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "photoURL": "https://example.com/photo.jpg",
      "bio": "Podcast enthusiast",
      "interests": ["Tech", "Business"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-03T00:00:00.000Z"
    }
  }
}
```

**Frontend Example:**
```javascript
async function getUserProfile(token) {
  const response = await fetch('http://localhost:3000/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.profile;
}
```

---

### Update User Profile
**PUT** `/api/user/profile` 🔒

Update user profile information.

**Request Body:**
```json
{
  "displayName": "Jane Doe",
  "photoURL": "https://example.com/new-photo.jpg",
  "bio": "Love Ethiopian podcasts!",
  "interests": ["Tech", "Business", "Lifestyle"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "profile": { /* updated profile */ }
  }
}
```

**Frontend Example:**
```javascript
async function updateProfile(token, profileData) {
  const response = await fetch('http://localhost:3000/api/user/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  return await response.json();
}

// Usage
await updateProfile(token, {
  displayName: "New Name",
  bio: "My new bio",
  interests: ["Tech", "News"]
});
```

---

### Delete User Account
**DELETE** `/api/user/profile` 🔒

Permanently delete the user account and all associated data.

**Response:**
```json
{
  "status": "success",
  "message": "Account deleted successfully"
}
```

**Frontend Example:**
```javascript
async function deleteAccount(token) {
  const confirmed = confirm('Are you sure? This cannot be undone!');
  if (!confirmed) return;
  
  const response = await fetch('http://localhost:3000/api/user/profile', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

---

## 📸 Profile Photo Upload (Supabase)

### Upload Profile Photo
**POST** `/api/user/upload-photo` 🔒

Upload a profile photo to Supabase storage. Accepts base64 encoded images.

**Request Body:**
```json
{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Constraints:**
- Maximum file size: 5MB
- Supported formats: JPEG, PNG, GIF, WebP
- Image is automatically stored in Supabase with unique filename

**Response:**
```json
{
  "status": "success",
  "message": "Photo uploaded successfully",
  "data": {
    "photoURL": "https://xxxxx.supabase.co/storage/v1/object/public/avatars/uid-123456.jpg"
  }
}
```

**Frontend Example:**
```javascript
async function uploadProfilePhoto(token, file) {
  // Check file size
  if (file.size > 5 * 1024 * 1024) {
    alert('Image too large. Maximum size is 5MB.');
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64Image = e.target.result;
    
    try {
      const response = await fetch('http://localhost:3000/api/user/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64Image })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log('Photo uploaded:', data.data.photoURL);
        return data.data.photoURL;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    }
  };
  
  reader.readAsDataURL(file);
}

// Usage with file input
document.getElementById('photoInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (file) {
    const token = await getFirebaseToken();
    const photoURL = await uploadProfilePhoto(token, file);
    if (photoURL) {
      document.getElementById('profileImage').src = photoURL;
    }
  }
});
```

**Complete Upload Component Example:**
```html
<div class="photo-upload">
  <img id="profileImage" src="https://ui-avatars.com/api/?name=User" 
       style="width: 150px; height: 150px; border-radius: 50%;">
  <input type="file" id="photoInput" accept="image/*" style="display: none;">
  <button onclick="document.getElementById('photoInput').click()">
    Change Photo
  </button>
</div>

<script>
document.getElementById('photoInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  // Show preview immediately
  const previewReader = new FileReader();
  previewReader.onload = function(e) {
    document.getElementById('profileImage').src = e.target.result;
  };
  previewReader.readAsDataURL(file);
  
  // Upload to server
  const uploadReader = new FileReader();
  uploadReader.onload = async function(e) {
    const base64Image = e.target.result;
    const token = await firebase.auth().currentUser.getIdToken();
    
    try {
      const response = await fetch('http://localhost:3000/api/user/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64Image })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        alert('Photo uploaded successfully!');
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  };
  uploadReader.readAsDataURL(file);
});
</script>
```

---

### Delete Profile Photo
**DELETE** `/api/user/photo` 🔒

Delete the user's profile photo from Supabase and revert to default avatar.

**Response:**
```json
{
  "status": "success",
  "message": "Photo deleted successfully",
  "data": {
    "photoURL": "https://www.gravatar.com/avatar/..." // Default avatar
  }
}
```

**Frontend Example:**
```javascript
async function deleteProfilePhoto(token) {
  const confirmed = confirm('Delete your profile photo?');
  if (!confirmed) return;
  
  try {
    const response = await fetch('http://localhost:3000/api/user/photo', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      // Update UI with default avatar
      document.getElementById('profileImage').src = data.data.photoURL;
      alert('Photo deleted successfully');
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Delete failed: ' + error.message);
  }
}
```

---

## 🔔 Notification Preferences

### Get Notification Preferences
**GET** `/api/user/notifications` 🔒

Get user's notification preferences.

**Response:**
```json
{
  "status": "success",
  "data": {
    "notifications": {
      "newPodcasts": true,
      "channelUpdates": true,
      "recommendations": true,
      "email": true,
      "push": true
    }
  }
}
```

**Frontend Example:**
```javascript
async function getNotificationPreferences(token) {
  const response = await fetch('http://localhost:3000/api/user/notifications', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.notifications;
}
```

---

### Update Notification Preferences
**PUT** `/api/user/notifications` 🔒

Update notification preferences.

**Request Body:**
```json
{
  "newPodcasts": false,
  "channelUpdates": true,
  "recommendations": false,
  "email": true,
  "push": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification preferences updated",
  "data": {
    "notifications": { /* updated preferences */ }
  }
}
```

**Frontend Example:**
```javascript
async function updateNotifications(token, preferences) {
  const response = await fetch('http://localhost:3000/api/user/notifications', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
  return await response.json();
}

// Usage - Toggle specific notification
await updateNotifications(token, {
  newPodcasts: false,
  email: true
});
```

---

## ⚙️ Settings

### Get User Settings
**GET** `/api/user/settings` 🔒

Get user's app settings.

**Response:**
```json
{
  "status": "success",
  "data": {
    "settings": {
      "language": "en",
      "theme": "light",
      "autoplay": true,
      "playbackSpeed": 1.0,
      "quality": "auto",
      "dataUsage": "standard"
    }
  }
}
```

**Frontend Example:**
```javascript
async function getSettings(token) {
  const response = await fetch('http://localhost:3000/api/user/settings', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.settings;
}
```

---

### Update User Settings
**PUT** `/api/user/settings` 🔒

Update app settings.

**Request Body:**
```json
{
  "language": "am",
  "theme": "dark",
  "autoplay": false,
  "playbackSpeed": 1.5,
  "quality": "high",
  "dataUsage": "low"
}
```

**Available Options:**
- `language`: "en", "am", etc.
- `theme`: "light", "dark", "auto"
- `autoplay`: true, false
- `playbackSpeed`: 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
- `quality`: "auto", "low", "medium", "high"
- `dataUsage`: "low", "standard", "high"

**Response:**
```json
{
  "status": "success",
  "message": "Settings updated",
  "data": {
    "settings": { /* updated settings */ }
  }
}
```

**Frontend Example:**
```javascript
async function updateSettings(token, settings) {
  const response = await fetch('http://localhost:3000/api/user/settings', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  return await response.json();
}

// Usage - Change theme
await updateSettings(token, { theme: "dark" });

// Usage - Change playback speed
await updateSettings(token, { playbackSpeed: 1.5 });
```

---

## 🔒 Privacy & Security

### Get Privacy Settings
**GET** `/api/user/privacy` 🔒

Get user's privacy settings.

**Response:**
```json
{
  "status": "success",
  "data": {
    "privacy": {
      "profileVisibility": "public",
      "showHistory": false,
      "showWatchlist": false,
      "allowRecommendations": true
    }
  }
}
```

**Frontend Example:**
```javascript
async function getPrivacySettings(token) {
  const response = await fetch('http://localhost:3000/api/user/privacy', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.privacy;
}
```

---

### Update Privacy Settings
**PUT** `/api/user/privacy` 🔒

Update privacy settings.

**Request Body:**
```json
{
  "profileVisibility": "private",
  "showHistory": true,
  "showWatchlist": true,
  "allowRecommendations": false
}
```

**Available Options:**
- `profileVisibility`: "public", "private", "friends"
- `showHistory`: true, false
- `showWatchlist`: true, false
- `allowRecommendations`: true, false

**Response:**
```json
{
  "status": "success",
  "message": "Privacy settings updated",
  "data": {
    "privacy": { /* updated privacy settings */ }
  }
}
```

**Frontend Example:**
```javascript
async function updatePrivacy(token, privacy) {
  const response = await fetch('http://localhost:3000/api/user/privacy', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(privacy)
  });
  return await response.json();
}

// Usage - Make profile private
await updatePrivacy(token, { 
  profileVisibility: "private",
  showHistory: false 
});
```

---

### Get Security Info
**GET** `/api/user/security` 🔒

Get security information about the account.

**Response:**
```json
{
  "status": "success",
  "data": {
    "security": {
      "emailVerified": true,
      "lastSignIn": "2026-03-03T19:28:04.794Z",
      "twoFactorEnabled": false,
      "lastPasswordChange": null
    }
  }
}
```

**Frontend Example:**
```javascript
async function getSecurityInfo(token) {
  const response = await fetch('http://localhost:3000/api/user/security', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.security;
}
```

---

### Send Email Verification
**POST** `/api/user/security/verify-email` 🔒

Send email verification link to user's email.

**Response:**
```json
{
  "status": "success",
  "message": "Verification email sent",
  "data": {
    "link": "https://..."
  }
}
```

**Frontend Example:**
```javascript
async function sendEmailVerification(token) {
  const response = await fetch('http://localhost:3000/api/user/security/verify-email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

---

## 💬 Help & Support

### Get FAQ
**GET** `/api/support/faq`

Get frequently asked questions (no authentication required).

**Response:**
```json
{
  "status": "success",
  "data": {
    "faq": [
      {
        "id": 1,
        "question": "How do I create an account?",
        "answer": "Click on the Sign Up button...",
        "category": "account"
      }
    ],
    "total": 5
  }
}
```

**Frontend Example:**
```javascript
async function getFAQ() {
  const response = await fetch('http://localhost:3000/api/support/faq');
  const data = await response.json();
  return data.data.faq;
}
```

---

### Submit Support Request
**POST** `/api/support/contact` 🔒

Submit a support ticket.

**Request Body:**
```json
{
  "subject": "Cannot play podcasts",
  "message": "When I click play, nothing happens...",
  "category": "technical"
}
```

**Categories:** "general", "technical", "account", "billing", "feedback"

**Response:**
```json
{
  "status": "success",
  "message": "Support request submitted",
  "data": {
    "ticket": {
      "id": "ticket-1234567890",
      "uid": "user123",
      "email": "user@example.com",
      "subject": "Cannot play podcasts",
      "message": "When I click play...",
      "category": "technical",
      "status": "open",
      "createdAt": "2026-03-03T20:00:00.000Z"
    }
  }
}
```

**Frontend Example:**
```javascript
async function submitSupportRequest(token, ticketData) {
  const response = await fetch('http://localhost:3000/api/support/contact', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(ticketData)
  });
  return await response.json();
}

// Usage
await submitSupportRequest(token, {
  subject: "Bug Report",
  message: "I found a bug when...",
  category: "technical"
});
```

---

### Get User's Support Tickets
**GET** `/api/support/tickets` 🔒

Get all support tickets submitted by the user.

**Response:**
```json
{
  "status": "success",
  "data": {
    "tickets": [
      {
        "id": "ticket-1234567890",
        "subject": "Cannot play podcasts",
        "status": "open",
        "createdAt": "2026-03-03T20:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Frontend Example:**
```javascript
async function getSupportTickets(token) {
  const response = await fetch('http://localhost:3000/api/support/tickets', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data.tickets;
}
```

---

### Get App Information
**GET** `/api/support/about`

Get app information and contact details (no authentication required).

**Response:**
```json
{
  "status": "success",
  "data": {
    "about": {
      "appName": "Ethiopodcasts",
      "version": "2.0.0",
      "description": "Your gateway to Ethiopian podcasts",
      "contact": {
        "email": "support@ethiopodcasts.com",
        "website": "https://ethiopodcasts.com"
      },
      "social": {
        "twitter": "@ethiopodcasts",
        "facebook": "ethiopodcasts",
        "instagram": "@ethiopodcasts"
      }
    }
  }
}
```

**Frontend Example:**
```javascript
async function getAppInfo() {
  const response = await fetch('http://localhost:3000/api/support/about');
  const data = await response.json();
  return data.data.about;
}
```

---

## Complete Frontend Integration Example

Here's a complete example of a settings page component:

```javascript
// SettingsPage.js
import { useState, useEffect } from 'react';
import { auth } from './firebase'; // Your Firebase config

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [privacy, setPrivacy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllSettings();
  }, []);

  async function getToken() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    return await user.getIdToken();
  }

  async function loadAllSettings() {
    try {
      const token = await getToken();
      
      // Load all settings in parallel
      const [settingsRes, notifRes, privacyRes] = await Promise.all([
        fetch('http://localhost:3000/api/user/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/user/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/user/privacy', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const settingsData = await settingsRes.json();
      const notifData = await notifRes.json();
      const privacyData = await privacyRes.json();

      setSettings(settingsData.data.settings);
      setNotifications(notifData.data.notifications);
      setPrivacy(privacyData.data.privacy);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateTheme(newTheme) {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: newTheme })
      });
      
      const data = await response.json();
      setSettings(data.data.settings);
      alert('Theme updated!');
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  }

  async function toggleNotification(key) {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: !notifications[key] })
      });
      
      const data = await response.json();
      setNotifications(data.data.notifications);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <section>
        <h2>Appearance</h2>
        <select value={settings.theme} onChange={(e) => updateTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </section>

      <section>
        <h2>Notifications</h2>
        <label>
          <input 
            type="checkbox" 
            checked={notifications.newPodcasts}
            onChange={() => toggleNotification('newPodcasts')}
          />
          New Podcasts
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={notifications.email}
            onChange={() => toggleNotification('email')}
          />
          Email Notifications
        </label>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>Profile Visibility: {privacy.profileVisibility}</p>
        <p>Show History: {privacy.showHistory ? 'Yes' : 'No'}</p>
      </section>
    </div>
  );
}

export default SettingsPage;
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid or missing token)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error

**Frontend Error Handling Example:**
```javascript
async function safeApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error.message);
    alert(`Error: ${error.message}`);
    return null;
  }
}
```
