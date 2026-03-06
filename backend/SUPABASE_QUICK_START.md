# 🚀 Supabase Quick Start - 5 Minutes Setup

## What You Need
1. Supabase account (free)
2. 5 minutes of your time

## Setup Steps

### 1️⃣ Create Supabase Project (2 min)
```
1. Go to https://supabase.com
2. Sign up (free)
3. Click "New Project"
4. Name: ethiopodcasts
5. Password: (create strong password)
6. Region: (choose closest)
7. Click "Create"
8. Wait 2 minutes ☕
```

### 2️⃣ Create Storage Bucket (1 min)
```
1. Click "Storage" in sidebar
2. Click "Create bucket"
3. Name: avatars
4. ✅ Check "Public bucket"
5. Click "Create"
```

### 3️⃣ Get Your Keys (1 min)
```
1. Click "Settings" (bottom left)
2. Click "API"
3. Copy:
   - Project URL
   - anon public key
```

### 4️⃣ Configure Backend (1 min)
Open `backend/config/supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Replace `YOUR_PROJECT` and paste your anon key.

### 5️⃣ Test It! (30 sec)
```bash
cd backend
npm start
```

Open: `backend/test-profile-upload.html`

## That's It! 🎉

You now have:
- ✅ 1GB free storage
- ✅ Photo upload working
- ✅ No Firebase Storage costs
- ✅ Fast CDN delivery

## Quick Test

1. Login with your Firebase account
2. Choose a photo
3. Click "Upload Photo"
4. See it in Supabase dashboard!

## Troubleshooting

**"Invalid API key"**
- Check you copied the ANON key (not service role)

**"Policy violation"**
- Make sure bucket is set to PUBLIC

**Upload fails**
- Check file size < 5MB
- Check image format (jpg, png, gif, webp)

## Next Steps

- Update your frontend to use upload endpoint
- Add image compression (optional)
- Add cropping UI (optional)

---

**Need detailed guide?** See `SUPABASE_SETUP.md`
