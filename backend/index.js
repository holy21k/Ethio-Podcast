require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '..')));

const { verifyToken, optionalAuth, requireAdmin, db, admin } = require('./middleware/auth');
const { supabase } = require('./config/supabase-config');

const USERS_FILE = path.join(__dirname, 'users.json');
const PODCASTS_FILE = path.join(__dirname, 'podcasts.json');

const WATCHLIST = [
    "@dejaftv", "@Meripodcast", "@Gugutpodcast", "@WECHEWGOOD",
    "@marakiweg2023", "@yonasmoh", "@manyazewaleshetu",
    "@alive_podcast_Abrham", "@AGI.podcast", "@Talakpodcast",
    "@networkpodcastet", "@TechTalkWithSolomon", "@dawitdreams",
    "@EgregnawPodcast"
];

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading users:', e.message);
    }
    return { users: {}, watchlists: {}, history: {}, last_playback_positions: {} };
}

function saveUsers(data) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving users:', e.message);
        return false;
    }
}

function loadPodcasts() {
    try {
        if (fs.existsSync(PODCASTS_FILE)) {
            return JSON.parse(fs.readFileSync(PODCASTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading podcasts:', e.message);
    }
    return {};
}

function getThumbnail(id) { return `https://img.youtube.com/vi/${id}/mqdefault.jpg`; }
function getStreamingUrl(id) { return `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1`; }
function formatDuration(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
function success(data, msg = 'Success') {
    return { status: 'success', message: msg, data, timestamp: new Date().toISOString() };
}
function getAvatarURL(email, displayName) {
    if (email) {
        const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
        return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    }
    if (displayName) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=200&background=random`;
    }
    return null;
}

app.get('/api/health', (req, res) => res.json(success({ server: 'Ethiopodcasts API v2', status: 'healthy' })));

app.get('/api/watchlist', (req, res) => res.json(success({ channels: WATCHLIST, total: WATCHLIST.length })));

app.get('/api/home', (req, res) => {
    try {
        const podcasts = loadPodcasts();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const podcastList = Object.values(podcasts);

        for (let i = podcastList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [podcastList[i], podcastList[j]] = [podcastList[j], podcastList[i]];
        }

        const recent = podcastList.slice(0, 20);
        const todayPodcasts = recent.filter(d => new Date(d.created_at || 0) >= today);
        const yesterdayPodcasts = recent.filter(d => new Date(d.created_at || 0) < today).slice(0, 20);

        const format = d => ({
            id: d.id,
            title: d.title || '',
            display_title: d.display_title || d.title || '',
            uploader: d.uploader || 'Unknown',
            category: d.category || 'General',
            duration: formatDuration(d.duration || 0),
            thumbnail: getThumbnail(d.id),
            streaming_url: getStreamingUrl(d.id),
            created_at: d.created_at,
            is_new: !!todayPodcasts.find(tp => tp.id === d.id)
        });

        res.json(success({
            trending: recent.slice(0, 10).map(format),
            recent_today: todayPodcasts.map(format),
            recent_yesterday: yesterdayPodcasts.map(format)
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/discover', (req, res) => {
    try {
        const { q, category, page = 1, limit = 20 } = req.query;
        let podcastList = Object.values(loadPodcasts());

        for (let i = podcastList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [podcastList[i], podcastList[j]] = [podcastList[j], podcastList[i]];
        }

        if (q) {
            const sq = q.toLowerCase();
            podcastList = podcastList.filter(d =>
                (d.title || '').toLowerCase().includes(sq) ||
                (d.uploader || '').toLowerCase().includes(sq)
            );
        }
        if (category) {
            podcastList = podcastList.filter(d => (d.category || '') === category);
        }

        const start = (parseInt(page) - 1) * parseInt(limit);
        const paginated = podcastList.slice(start, start + parseInt(limit));

        res.json(success({
            podcasts: paginated.map(d => ({
                id: d.id,
                title: d.title || '',
                display_title: d.display_title || d.title || '',
                uploader: d.uploader || 'Unknown',
                category: d.category || 'General',
                duration: formatDuration(d.duration || 0),
                thumbnail: getThumbnail(d.id),
                streaming_url: getStreamingUrl(d.id),
                created_at: d.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: podcastList.length,
                has_more: start + parseInt(limit) < podcastList.length
            }
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/categories', (req, res) => {
    try {
        const cats = [...new Set(Object.values(loadPodcasts()).map(d => d.category).filter(Boolean))];
        res.json(success({ categories: cats.sort(), total: cats.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/podcasts/:id', (req, res) => {
    try {
        const d = loadPodcasts()[req.params.id];
        if (!d) return res.status(404).json({ status: 'error', message: 'Podcast not found' });
        res.json(success({
            id: d.id,
            title: d.title || '',
            display_title: d.display_title || d.title || '',
            description: d.description || '',
            uploader: d.uploader || 'Unknown',
            category: d.category || 'General',
            duration: formatDuration(d.duration || 0),
            duration_seconds: d.duration || 0,
            thumbnail: getThumbnail(d.id),
            streaming_url: getStreamingUrl(d.id),
            youtube_url: d.youtube_url || `https://www.youtube.com/watch?v=${d.id}`,
            created_at: d.created_at
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/player/:id', (req, res) => {
    try {
        const d = loadPodcasts()[req.params.id];
        if (!d) return res.status(404).json({ status: 'error', message: 'Podcast not found' });
        res.json(success({
            id: d.id,
            title: d.display_title || d.title || '',
            uploader: d.uploader || 'Unknown',
            category: d.category || 'General',
            duration: formatDuration(d.duration || 0),
            duration_seconds: d.duration || 0,
            thumbnail: getThumbnail(d.id),
            streaming_url: getStreamingUrl(d.id),
            audio_only_url: getStreamingUrl(d.id)
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});
app.get('/api/search', (req, res) => {
    try {
        const { q, limit = 50 } = req.query;
        if (!q || q.length < 2) return res.status(400).json({ status: 'error', message: 'Query too short' });

        const sq = q.toLowerCase();
        const results = Object.values(loadPodcasts())
            .filter(d =>
                (d.title || '').toLowerCase().includes(sq) ||
                (d.uploader || '').toLowerCase().includes(sq) ||
                (d.category || '').toLowerCase().includes(sq) ||
                (d.display_title || '').toLowerCase().includes(sq)
            )
            .slice(0, parseInt(limit))
            .map(d => ({
                id: d.id,
                title: d.title || '',
                display_title: d.display_title || d.title || '',
                uploader: d.uploader || 'Unknown',
                category: d.category || 'General',
                duration: formatDuration(d.duration || 0),
                thumbnail: getThumbnail(d.id),
                streaming_url: getStreamingUrl(d.id)
            }));

        res.json(success({ query: q, results, total: results.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});
app.get('/api/channels/:channel', (req, res) => {
    try {
        const ch = req.params.channel.startsWith('@') ? req.params.channel : `@${req.params.channel}`;
        const { page = 1, limit = 20 } = req.query;

        const podcastList = Object.values(loadPodcasts())
            .filter(d => d.uploader === ch)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        const start = (parseInt(page) - 1) * parseInt(limit);
        const paginated = podcastList.slice(start, start + parseInt(limit));

        res.json(success({
            channel: ch,
            podcasts: paginated.map(d => ({
                id: d.id,
                title: d.title || '',
                display_title: d.display_title || d.title || '',
                category: d.category || 'General',
                duration: formatDuration(d.duration || 0),
                thumbnail: getThumbnail(d.id),
                streaming_url: getStreamingUrl(d.id),
                created_at: d.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: podcastList.length,
                has_more: start + parseInt(limit) < podcastList.length
            }
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        res.json(success({
            total_podcasts: Object.keys(loadPodcasts()).length,
            total_channels: WATCHLIST.length
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/auth/login', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const userData = users.users[req.user.uid] || {
            uid: req.user.uid,
            email: req.user.email,
            displayName: req.user.name || req.user.email?.split('@')[0],
            photoURL: req.user.picture || getAvatarURL(req.user.email, req.user.name),
            createdAt: new Date().toISOString()
        };
        userData.lastLoginAt = new Date().toISOString();
        users.users[req.user.uid] = userData;
        saveUsers(users);
        res.json(success({ user: userData, isAuthenticated: true }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: 'error', message: 'Email required' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return res.status(400).json({ status: 'error', message: 'Invalid email format' });

        try {
            const resetLink = await admin.auth().generatePasswordResetLink(email);
            // TODO: send resetLink via Nodemailer / SendGrid
            console.log(`[DEV] Password reset link for ${email}:`, resetLink);
        } catch (firebaseErr) {
            console.error('Firebase reset link error:', firebaseErr.message);
        }

        res.json(success({ message: 'If an account exists with that email, a reset link has been sent.' }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Failed to process request' });
    }
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ status: 'error', message: 'newPassword required' });
        if (newPassword.length < 6) return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });

        await admin.auth().updateUser(req.user.uid, { password: newPassword });

        const users = loadUsers();
        if (users.users[req.user.uid]) {
            users.users[req.user.uid].lastPasswordChange = new Date().toISOString();
            saveUsers(users);
        }

        res.json(success({ message: 'Password changed successfully' }));
    } catch (e) {
        console.error('Change password error:', e.message);
        res.status(500).json({ status: 'error', message: 'Failed to change password' });
    }
});

app.get('/api/user/watchlist', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const watchlist = users.watchlists[req.user.uid] || [];
        res.json(success({ watchlist, total: watchlist.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/user/watchlist', verifyToken, (req, res) => {
    try {
        const { podcastId, podcastData } = req.body;
        if (!podcastId) return res.status(400).json({ status: 'error', message: 'podcastId required' });

        const users = loadUsers();
        if (!users.watchlists[req.user.uid]) users.watchlists[req.user.uid] = [];

        if (users.watchlists[req.user.uid].find(w => w.id === podcastId)) {
            return res.json(success({ message: 'Already in watchlist' }));
        }

        users.watchlists[req.user.uid].push({
            id: podcastId,
            addedAt: new Date().toISOString(),
            data: podcastData || null
        });

        if (saveUsers(users)) {
            res.json(success({ watchlist: users.watchlists[req.user.uid] }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.delete('/api/user/watchlist/:podcastId', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        if (!users.watchlists[req.user.uid]) {
            return res.status(404).json({ status: 'error', message: 'Watchlist not found' });
        }
        users.watchlists[req.user.uid] = users.watchlists[req.user.uid].filter(w => w.id !== req.params.podcastId);

        if (saveUsers(users)) {
            res.json(success({ message: 'Removed from watchlist', watchlist: users.watchlists[req.user.uid] }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/history', verifyToken, (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const users = loadUsers();
        let history = users.history[req.user.uid] || [];
        history.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
        history = history.slice(0, parseInt(limit));
        res.json(success({ history, total: history.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/user/history', verifyToken, (req, res) => {
    try {
        const { podcastId, podcastData, position = 0 } = req.body;
        if (!podcastId) return res.status(400).json({ status: 'error', message: 'podcastId required' });

        const users = loadUsers();
        if (!users.history[req.user.uid]) users.history[req.user.uid] = [];

        const existingIndex = users.history[req.user.uid].findIndex(h => h.id === podcastId);
        const historyItem = {
            id: podcastId,
            playedAt: new Date().toISOString(),
            data: podcastData || null,
            position
        };

        if (existingIndex >= 0) {
            users.history[req.user.uid][existingIndex] = historyItem;
        } else {
            users.history[req.user.uid].push(historyItem);
        }

        if (users.history[req.user.uid].length > 100) {
            users.history[req.user.uid] = users.history[req.user.uid].slice(-100);
        }

        if (saveUsers(users)) {
            res.json(success({ message: 'Added to history' }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.delete('/api/user/history', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        users.history[req.user.uid] = [];
        if (saveUsers(users)) {
            res.json(success({ message: 'History cleared' }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/position/:podcastId', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const positions = users.last_playback_positions[req.user.uid] || {};
        const position = positions[req.params.podcastId] || { position: 0, updatedAt: null };
        res.json(success({ podcastId: req.params.podcastId, position: position.position, updatedAt: position.updatedAt }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/user/position/:podcastId', verifyToken, (req, res) => {
    try {
        const { position } = req.body;
        if (typeof position !== 'number') return res.status(400).json({ status: 'error', message: 'position must be a number' });

        const users = loadUsers();
        if (!users.last_playback_positions[req.user.uid]) users.last_playback_positions[req.user.uid] = {};

        users.last_playback_positions[req.user.uid][req.params.podcastId] = {
            position,
            updatedAt: new Date().toISOString()
        };

        if (saveUsers(users)) {
            res.json(success({ message: 'Position saved' }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/profile', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        let profile = users.users[req.user.uid];

        if (!profile) {
            profile = {
                uid: req.user.uid,
                email: req.user.email || '',
                displayName: req.user.name || req.user.email?.split('@')[0] || 'User',
                photoURL: req.user.picture || getAvatarURL(req.user.email, req.user.name),
                bio: '',
                interests: [],
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
            users.users[req.user.uid] = profile;
            saveUsers(users);
        }

        if (!profile.photoURL) {
            profile.photoURL = getAvatarURL(profile.email, profile.displayName);
            users.users[req.user.uid] = profile;
            saveUsers(users);
        }

        res.json(success({ profile }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.put('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const { displayName, photoURL, bio, interests } = req.body;
        const users = loadUsers();

        if (!users.users[req.user.uid]) {
            users.users[req.user.uid] = {
                uid: req.user.uid,
                email: req.user.email || '',
                displayName: req.user.name || req.user.email?.split('@')[0] || 'User',
                photoURL: req.user.picture || getAvatarURL(req.user.email, req.user.name),
                bio: '',
                interests: [],
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
        }

        if (displayName !== undefined) users.users[req.user.uid].displayName = displayName;

        if (photoURL !== undefined) {
            if (photoURL === null || photoURL === '') {
                users.users[req.user.uid].photoURL = getAvatarURL(
                    users.users[req.user.uid].email,
                    users.users[req.user.uid].displayName
                );
            } else if (photoURL.startsWith('http://') || photoURL.startsWith('https://')) {
                users.users[req.user.uid].photoURL = photoURL;
            } else {
                return res.status(400).json({ status: 'error', message: 'photoURL must be a valid HTTP/HTTPS URL or null' });
            }
        }

        if (bio !== undefined) users.users[req.user.uid].bio = bio;
        if (interests !== undefined) users.users[req.user.uid].interests = interests;
        users.users[req.user.uid].updatedAt = new Date().toISOString();

        try {
            if (displayName !== undefined && admin.apps.length > 0) {
                await admin.auth().updateUser(req.user.uid, { displayName });
            }
        } catch (authErr) {
            console.error('Firebase displayName sync error (non-fatal):', authErr.message);
        }

        if (saveUsers(users)) {
            res.json(success({ message: 'Profile updated successfully', profile: users.users[req.user.uid] }));
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.delete('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const users = loadUsers();
        const uid = req.user.uid;

        try {
            const profile = users.users[uid];
            if (profile?.photoURL?.includes('supabase')) {
                const fileName = profile.photoURL.split('/').pop().split('?')[0];
                await supabase.storage.from('avatars').remove([fileName]);
            }
        } catch (storageErr) {
            console.error('Supabase delete error (non-fatal):', storageErr.message);
        }

        delete users.users[uid];
        delete users.watchlists[uid];
        delete users.history[uid];
        delete users.last_playback_positions[uid];

        try {
            await admin.auth().deleteUser(uid);
        } catch (authErr) {
            console.error('Firebase delete error (non-fatal):', authErr.message);
        }

        if (saveUsers(users)) {
            res.json(success({ message: 'Account deleted successfully' }));
        } else {
            throw new Error('Failed to delete account');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/user/upload-photo', verifyToken, async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) return res.status(400).json({ status: 'error', message: 'base64Image required' });
        if (!base64Image.startsWith('data:image/')) return res.status(400).json({ status: 'error', message: 'Invalid image format. Must be base64 data URL (data:image/...)' });

        const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ status: 'error', message: 'Invalid base64 format' });

        const imageType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ status: 'error', message: 'Image too large. Maximum 5MB.' });
        }

        const fileName = `${req.user.uid}-${Date.now()}.${imageType}`;

        try {
            const users = loadUsers();
            const profile = users.users[req.user.uid];
            if (profile?.photoURL?.includes('supabase')) {
                const oldFileName = profile.photoURL.split('/').pop().split('?')[0];
                await supabase.storage.from('avatars').remove([oldFileName]);
            }
        } catch (deleteErr) {
            console.log('Old photo cleanup skipped (non-fatal):', deleteErr.message);
        }

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, buffer, {
                contentType: `image/${imageType}`,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({ status: 'error', message: `Upload failed: ${uploadError.message}` });
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        const users = loadUsers();
        if (!users.users[req.user.uid]) {
            users.users[req.user.uid] = {
                uid: req.user.uid,
                email: req.user.email || '',
                displayName: req.user.name || req.user.email?.split('@')[0] || 'User',
                createdAt: new Date().toISOString()
            };
        }
        users.users[req.user.uid].photoURL = publicUrl;
        users.users[req.user.uid].updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json(success({ message: 'Photo uploaded successfully', photoURL: publicUrl }));
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (e) {
        console.error('Upload photo error:', e.message);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.delete('/api/user/photo', verifyToken, async (req, res) => {
    try {
        const users = loadUsers();
        const profile = users.users[req.user.uid];

        if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

        if (profile.photoURL?.includes('supabase')) {
            try {
                const fileName = profile.photoURL.split('/').pop().split('?')[0];
                await supabase.storage.from('avatars').remove([fileName]);
            } catch (storageErr) {
                console.error('Supabase delete error (non-fatal):', storageErr.message);
            }
        }

        profile.photoURL = getAvatarURL(profile.email, profile.displayName);
        profile.updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json(success({ message: 'Photo deleted successfully', photoURL: profile.photoURL }));
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/notifications', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        let profile = users.users[req.user.uid];

        if (!profile) {
            profile = {
                uid: req.user.uid,
                email: req.user.email || '',
                displayName: req.user.name || req.user.email?.split('@')[0] || 'User',
                createdAt: new Date().toISOString()
            };
            users.users[req.user.uid] = profile;
            saveUsers(users);
        }

        const notifications = profile.notificationPreferences || {
            newPodcasts: true, channelUpdates: true,
            recommendations: true, email: true, push: true
        };

        res.json(success({ notifications }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.put('/api/user/notifications', verifyToken, (req, res) => {
    try {
        const { newPodcasts, channelUpdates, recommendations, email, push } = req.body;
        const users = loadUsers();

        if (!users.users[req.user.uid]) return res.status(404).json({ status: 'error', message: 'Profile not found' });
        if (!users.users[req.user.uid].notificationPreferences) users.users[req.user.uid].notificationPreferences = {};

        const prefs = users.users[req.user.uid].notificationPreferences;
        if (newPodcasts !== undefined) prefs.newPodcasts = newPodcasts;
        if (channelUpdates !== undefined) prefs.channelUpdates = channelUpdates;
        if (recommendations !== undefined) prefs.recommendations = recommendations;
        if (email !== undefined) prefs.email = email;
        if (push !== undefined) prefs.push = push;

        users.users[req.user.uid].updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json(success({ message: 'Notification preferences updated', notifications: prefs }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/settings', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const profile = users.users[req.user.uid];
        if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

        const settings = profile.settings || {
            language: 'en', theme: 'dark', autoplay: true,
            playbackSpeed: 1.0, quality: 'auto', dataUsage: 'standard'
        };

        res.json(success({ settings }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.put('/api/user/settings', verifyToken, (req, res) => {
    try {
        const { language, theme, autoplay, playbackSpeed, quality, dataUsage } = req.body;
        const users = loadUsers();

        if (!users.users[req.user.uid]) return res.status(404).json({ status: 'error', message: 'Profile not found' });
        if (!users.users[req.user.uid].settings) users.users[req.user.uid].settings = {};

        const settings = users.users[req.user.uid].settings;
        if (language !== undefined) settings.language = language;
        if (theme !== undefined) settings.theme = theme;
        if (autoplay !== undefined) settings.autoplay = autoplay;
        if (playbackSpeed !== undefined) settings.playbackSpeed = playbackSpeed;
        if (quality !== undefined) settings.quality = quality;
        if (dataUsage !== undefined) settings.dataUsage = dataUsage;

        users.users[req.user.uid].updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json(success({ message: 'Settings updated', settings }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/privacy', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const profile = users.users[req.user.uid];
        if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

        const privacy = profile.privacy || {
            profileVisibility: 'public', showHistory: false,
            showWatchlist: false, allowRecommendations: true
        };

        res.json(success({ privacy }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.put('/api/user/privacy', verifyToken, (req, res) => {
    try {
        const { profileVisibility, showHistory, showWatchlist, allowRecommendations } = req.body;
        const users = loadUsers();

        if (!users.users[req.user.uid]) return res.status(404).json({ status: 'error', message: 'Profile not found' });
        if (!users.users[req.user.uid].privacy) users.users[req.user.uid].privacy = {};

        const privacy = users.users[req.user.uid].privacy;
        if (profileVisibility !== undefined) privacy.profileVisibility = profileVisibility;
        if (showHistory !== undefined) privacy.showHistory = showHistory;
        if (showWatchlist !== undefined) privacy.showWatchlist = showWatchlist;
        if (allowRecommendations !== undefined) privacy.allowRecommendations = allowRecommendations;

        users.users[req.user.uid].updatedAt = new Date().toISOString();

        if (saveUsers(users)) {
            res.json(success({ message: 'Privacy settings updated', privacy }));
        } else {
            throw new Error('Failed to save');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/user/security', verifyToken, async (req, res) => {
    try {
        const users = loadUsers();
        const profile = users.users[req.user.uid];
        if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

        let emailVerified = false;
        let lastSignIn = null;

        try {
            const userRecord = await admin.auth().getUser(req.user.uid);
            emailVerified = userRecord.emailVerified;
            lastSignIn = userRecord.metadata.lastSignInTime;
        } catch (authErr) {
            console.error('Firebase getUser error (non-fatal):', authErr.message);
        }

        res.json(success({
            security: {
                emailVerified, lastSignIn,
                twoFactorEnabled: false,
                lastPasswordChange: profile.lastPasswordChange || null
            }
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/user/security/verify-email', verifyToken, async (req, res) => {
    try {
        const link = await admin.auth().generateEmailVerificationLink(req.user.email);
        // TODO: send link via Nodemailer / SendGrid
        console.log(`[DEV] Email verification link for ${req.user.email}:`, link);
        res.json(success({ message: 'Verification email sent' }));
    } catch (e) {
        console.error('Email verification error:', e.message);
        res.status(500).json({ status: 'error', message: 'Failed to send verification email' });
    }
});

app.get('/api/support/faq', (req, res) => {
    try {
        const faq = [
            { id: 1, question: 'How do I create an account?', answer: 'Click Sign Up and register using your email or Google account.', category: 'account' },
            { id: 2, question: 'How do I reset my password?', answer: 'Click "Forgot Password" on the login page and follow the instructions sent to your email.', category: 'account' },
            { id: 3, question: 'How do I add podcasts to my watchlist?', answer: 'Click the bookmark icon on any podcast to save it.', category: 'features' },
            { id: 4, question: 'Can I download podcasts for offline listening?', answer: 'Offline downloads are not available yet. Stay tuned!', category: 'features' },
            { id: 5, question: 'How do I change my notification settings?', answer: 'Go to Settings > Notifications to customize your preferences.', category: 'settings' }
        ];
        res.json(success({ faq, total: faq.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/api/support/contact', verifyToken, (req, res) => {
    try {
        const { subject, message, category } = req.body;
        if (!subject || !message) return res.status(400).json({ status: 'error', message: 'subject and message required' });

        const users = loadUsers();
        if (!users.supportTickets) users.supportTickets = [];

        const ticket = {
            id: `ticket-${Date.now()}`,
            uid: req.user.uid,
            email: req.user.email,
            subject, message,
            category: category || 'general',
            status: 'open',
            createdAt: new Date().toISOString()
        };

        users.supportTickets.push(ticket);

        if (saveUsers(users)) {
            res.json(success({ message: 'Support request submitted', ticket }));
        } else {
            throw new Error('Failed to submit request');
        }
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/support/tickets', verifyToken, (req, res) => {
    try {
        const users = loadUsers();
        const tickets = (users.supportTickets || []).filter(t => t.uid === req.user.uid);
        res.json(success({ tickets, total: tickets.length }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/support/about', (req, res) => {
    try {
        res.json(success({
            about: {
                appName: 'Ethiopodcasts',
                version: '2.0.0',
                description: 'Your gateway to Ethiopian podcasts',
                contact: { email: 'support@ethiopodcasts.com', website: 'https://ethiopodcasts.com' },
                social: { twitter: '@ethiopodcasts', facebook: 'ethiopodcasts', instagram: '@ethiopodcasts' }
            }
        }));
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/', (req, res) => res.json(success({ server: 'Ethiopodcasts API v2', status: 'running' })));
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Not found' }));
app.use((e, req, res, next) => res.status(500).json({ status: 'error', message: e.message }));

app.listen(port, () => {
    console.log(`\n🎧 Ethiopodcasts API v2 running at http://localhost:${port}`);
    console.log(`🔐 Auth: Firebase  |  📸 Photos: Supabase Storage\n`);
});

module.exports = app;