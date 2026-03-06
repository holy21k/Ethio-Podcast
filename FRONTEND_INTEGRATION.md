npm install firebase
```

## ⚙️ Frontend Config (Copy This!)

**You MUST use this exact configuration in your frontend code:**

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDBQosoOgqEa0LONZhEZUSVJjV1diFMdCk",
    authDomain: "ethio-podcast-8a2f0.firebaseapp.com",
    projectId: "ethio-podcast-8a2f0",
    storageBucket: "ethio-podcast-8a2f0.firebasestorage.app",
    messagingSenderId: "976795435136",
    appId: "1:976795435136:web:fa34145b172223cdad6665",
    measurementId: "G-268RCQ7PBM"
};

// Initialize Firebase
import { initializeApp } from "firebase/app";
const app = initializeApp(firebaseConfig);
```

## 🔐 Authentication

The backend supports **Firebase ID Tokens** (recommended for Google/Social Auth) and **App Tokens** (legacy/alternative).

### 1. Google Sign-In Flow (Recommended)

1.  **Frontend**: Use Firebase SDK to sign in the user with Google.
2.  **Frontend**: Get the **ID Token** from the user object.
    ```javascript
    import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider).then(async (result) => {
      // This is the token you send to the backend
      const idToken = await result.user.getIdToken(); 
      console.log("Firebase ID Token:", idToken);
      
      // Store it (e.g., localStorage)
      localStorage.setItem('authToken', idToken);
    }).catch((error) => {
      console.error(error);
    });
    ```
3.  **Frontend**: Send this token in the `Authorization` header for **ALL** protected requests.
    ```javascript
    fetch('http://localhost:3000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}` // Must start with "Bearer "
      }
    });
    ```

### 2. Token Refresh
Firebase tokens expire after **1 hour**. You must handle token refreshing on the frontend.
- The Firebase SDK handles this automatically internally, but you need to call `user.getIdToken(true)` to force a refresh if needed, or listen to `onIdTokenChanged`.
- **Best Practice**: Use an interceptor (like in Axios) to attach the latest token.

---

## 📡 API Reference

Base URL: `http://localhost:3000` (or production URL)

### 🌍 Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | specific health/status check |
| `/api/home` | `GET` | Returns trending, recent, and yesterday's podcasts. |
| `/api/discover?q=...&category=...` | `GET` | Search and filter podcasts. |
| `/api/categories` | `GET` | List all available categories. |
| `/api/categories/:name/podcasts` | `GET` | Get podcasts by category. |
| `/api/podcasts/:id` | `GET` | Get details of a single podcast. |
| `/api/player/:id` | `GET` | Get streaming URLs (resolves Telegram/YouTube links). |
| `/api/search?q=...` | `GET` | Search podcasts by title or uploader. |
| `/api/channels/:channel` | `GET` | Get podcasts from a specific channel/uploader. |
| `/api/stats` | `GET` | Get total count of podcasts and channels. |
| `/api/watchlist` | `GET` | **Note**: This returns the list of *suggested channels*, not the user's watchlist. |

### 🔐 Protected Endpoints (Requires `Authorization: Bearer <TOKEN>`)

| Endpoint | Method | Body Params | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/me` | `GET` | - | Get current user profile. |
| `/api/user/profile` | `GET` | - | Get detailed user profile. |
| `/api/user/profile` | `PUT` | `{ displayName, photoURL }` | Update profile. |
| `/api/user/interests` | `POST` | `{ interests: [] }` | Update user interests. |
| `/api/user/watchlist` | `GET` | - | Get the authenticated user's watchlist. |
| `/api/user/watchlist` | `POST` | `{ podcastId, podcastData }` | Add a podcast to watchlist. |
| `/api/user/watchlist/:id` | `DELETE` | - | Remove a podcast from watchlist. |
| `/api/user/history` | `GET` | `?limit=50` | Get listening history. |
| `/api/user/history` | `POST` | `{ podcastId, podcastData, position }` | Add to history (e.g., on play). |

### 🔑 Auth-Specific Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Login with Email/Password (Returns custom `app-token`). |
| `/api/auth/register` | `POST` | Register with Email/Password (Creates Firebase user). |
| `/api/auth/login` | `GET` | **Protected**. Same as `/api/auth/me`. Verifies the token. |

---

## 📦 Data Models

### User Object
```json
{
  "uid": "firebase_user_id_123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "createdAt": "2024-02-14T10:00:00.000Z",
  "lastLoginAt": "2024-02-14T10:00:00.000Z"
}

## 🎧 Audio Player Implementation

The backend serves audio from two potential sources. The frontend **MUST** handle both cases.

### 1. Fetching Playback Data
Call the player endpoint:
```javascript
GET /api/player/:id
```

### 2. Handling the Response
The response `data` object will contain `streaming_url` and `audio_only_url`.

#### Case A: Telegram Audio (High Quality / Background Play)
If the podcast has been processed and uploaded to Telegram, the URL will look like:
`https://api.telegram.org/file/bot.../music.m4a`

*   **Detection**: Check if `streaming_url` includes `api.telegram.org` or ends in `.m4a`/`.mp3`.
*   **Implementation**: Use a standard HTML5 `<audio>` tag or a library like `Howler.js`.
    ```html
    <audio controls autoplay>
      <source src="{streaming_url}" type="audio/mp4">
    </audio>
    ```

#### Case B: YouTube Fallback (Video)
If the podcast is not yet on Telegram, the URL will be a YouTube Embed link:
`https://www.youtube.com/embed/VIDEO_ID?autoplay=1`

*   **Detection**: Check if `streaming_url` includes `youtube.com/embed`.
*   **Implementation**: You **MUST** use an `<iframe>`. Native audio players will NOT work.
    ```html
    <iframe 
      width="100%" 
      height="200" 
      src="{streaming_url}" 
      frameborder="0" 
      allow="autoplay; encrypted-media">
    </iframe>
    ```

### 3. Tracking Progress
To support "Continue Listening", send progress updates every 15-30 seconds:

```javascript
POST /api/user/history
Headers: Authorization: Bearer <TOKEN>
Body: {
  "podcastId": "video_id",
  "position": 120 // seconds
}
```

