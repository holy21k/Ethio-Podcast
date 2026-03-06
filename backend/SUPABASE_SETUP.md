# 🗄️ Supabase Setup Guide - Profile Photo Storage

## Why Supabase?
- ✅ **1GB FREE storage** (vs Firebase Storage requires payment)
- ✅ Easy to use
- ✅ Fast CDN delivery
- ✅ Automatic image optimization
- ✅ Public URLs for easy access

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email (FREE)

## Step 2: Create New Project

1. Click "New Project"
2. Fill in:
   - **Name**: `ethiopodcasts` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
3. Click "Create new project"
4. Wait 2-3 minutes for setup

## Step 3: Create Storage Bucket

1. In your project dashboard, click **Storage** (left sidebar)
2. Click "Create a new bucket"
3. Fill in:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **CHECK THIS** (important!)
4. Click "Create bucket"

## Step 4: Set Bucket Policies (Allow Public Access)

1. Click on the `avatars` bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Choose "For full customization" 
5. Add this policy:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' );
```

Or use the simple UI:
- Click "Add policy" → "Allow public read access" → Save
- Click "Add policy" → "Allow authenticated uploads" → Save

## Step 5: Get Your Credentials

1. Click **Settings** (left sidebar, bottom)
2. Click **API**
3. Copy these values:

   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 6: Configure Backend

Open `backend/config/supabase-config.js` and replace:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**OR** use environment variables (recommended):

Create `backend/.env`:
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Then install dotenv:
```bash
npm install dotenv
```

And add to top of `backend/index.js`:
```javascript
require('dotenv').config();
```

## Step 7: Test the Setup

1. Start your backend:
```bash
cd backend
npm start
```

2. Open `backend/test-profile-upload.html` in browser

3. Try uploading a photo!

## API Endpoints Added

### Upload Photo
```javascript
POST /api/user/upload-photo
Authorization: Bearer {firebase-token}
Content-Type: application/json

{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}

Response:
{
  "status": "success",
  "message": "Photo uploaded successfully",
  "data": {
    "photoURL": "https://xxxxx.supabase.co/storage/v1/object/public/avatars/uid-123456.jpg"
  }
}
```

### Delete Photo
```javascript
DELETE /api/user/photo
Authorization: Bearer {firebase-token}

Response:
{
  "status": "success",
  "message": "Photo deleted successfully",
  "data": {
    "photoURL": "https://www.gravatar.com/avatar/..." // Falls back to Gravatar
  }
}
```

## Frontend Integration Example

```html
<input type="file" id="photoInput" accept="image/*">
<img id="preview" style="width: 200px; height: 200px; border-radius: 50%;">
<button onclick="uploadPhoto()">Upload Photo</button>

<script>
// Preview image before upload
document.getElementById('photoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Upload photo
async function uploadPhoto() {
    const fileInput = document.getElementById('photoInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a photo');
        return;
    }
    
    // Check file size (max 5MB)
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
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ base64Image })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                alert('Photo uploaded successfully!');
                console.log('New photo URL:', data.data.photoURL);
            } else {
                alert('Upload failed: ' + data.message);
            }
        } catch (error) {
            alert('Upload error: ' + error.message);
        }
    };
    
    reader.readAsDataURL(file);
}
</script>
```

## Storage Limits

**Free Tier:**
- 1GB storage
- 2GB bandwidth per month
- Unlimited requests

This is enough for:
- ~5,000 profile photos (200KB each)
- Perfect for small to medium apps!

## Troubleshooting

### Error: "new row violates row-level security policy"
- Make sure bucket is set to **Public**
- Check that policies are created correctly

### Error: "Invalid API key"
- Double-check your `SUPABASE_ANON_KEY`
- Make sure you copied the **anon public** key, not the service role key

### Photos not loading
- Check bucket is public
- Verify the URL format: `https://xxxxx.supabase.co/storage/v1/object/public/avatars/filename.jpg`

### Upload fails
- Check file size (max 5MB)
- Verify image format (jpeg, png, gif, webp)
- Check browser console for errors

## Next Steps

1. ✅ Complete Supabase setup
2. ✅ Test photo upload
3. Update your frontend to use the new upload endpoint
4. Add image compression before upload (optional)
5. Add image cropping UI (optional)

## Need Help?

- Supabase Docs: https://supabase.com/docs/guides/storage
- Supabase Discord: https://discord.supabase.com
- Check `backend/test-profile-upload.html` for working example

---

**You're all set! Users can now upload their own profile photos for FREE! 🎉**
