# Quick Reference Card

## 🎯 Core Commands

### Start Backend
```bash
cd server && npm run dev
# Runs on http://localhost:3000
```

### Start Frontend
```bash
npm run dev
# Runs on http://localhost:5173
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

---

## 🌐 URLs

| Purpose | URL |
|---------|-----|
| Participant Home | http://localhost:5173 |
| Admin Dashboard | http://localhost:5173/admin |
| Backend API | http://localhost:3000 |
| Backend Socket.IO | ws://localhost:3000 |

---

## 🔑 Default Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

---

## 📱 Key Features Quick Access

### For Participants
1. Go to http://localhost:5173
2. Click "Start Meeting" OR enter meeting ID and "Join"
3. Allow camera/microphone
4. Click "Join Room"
5. Use sentiment panel (Good/Neutral/Bad)
6. Answer MCQs when they appear

### For Admin
1. Go to http://localhost:5173/admin
2. Login with admin/admin123
3. Enter meeting ID, click "Join as Admin"
4. View real-time sentiment chart
5. Enter prompt, click "Generate" for MCQs
6. Click MCQ session to view analytics

---

## 🔌 Key Socket Events

### Sentiment
```javascript
// Client → Server
socket.emit('submit-sentiment', { roomId, sentiment: 'good' });

// Server → Client
socket.on('sentiment-updated', (data) => {});
```

### MCQ
```javascript
// Client → Server (Admin)
socket.emit('generate-mcq', { roomId, prompt: '...' });

// Participant
socket.emit('submit-mcq-response', { 
  roomId, mcqSessionId, questionIndex, answer 
});

// Server → Client
socket.on('mcq-broadcast', (mcqSession) => {});
socket.on('mcq-analytics', (analytics) => {});
```

### Room
```javascript
// Client → Server
socket.emit('join-room', { roomId, displayName, isAdmin });

// Server → Client
socket.on('room-state', (data) => {});
```

---

## 📊 Data Models Quick Reference

### Sentiment Object
```javascript
{ good: 5, neutral: 3, negative: 1 }
```

### MCQ Session
```javascript
{
  id: "uuid",
  prompt: "string",
  mcqs: [{ question, options, answer, explanation }],
  responses: Map<socketId, answers>
}
```

### Participant
```javascript
{
  id: "socketId",
  displayName: "string",
  isAdmin: boolean,
  sentiment: "good" | "neutral" | "negative" | null
}
```

---

## 🛠 API Endpoints

```bash
# Create Meeting
POST /api/create-meeting
→ { meetingId: "ABC12345" }

# Admin Login
POST /api/admin-login
→ { token: "...", role: "admin" }

# Get Meeting State
GET /api/meeting/:meetingId
→ { id, participants, sentiment, mcqs }
```

---

## 🎨 UI Components

### SentimentPanel
- Voting interface for participants
- Three buttons: Good (green), Neutral (yellow), Bad (red)

### SentimentDashboard
- Doughnut chart of sentiment distribution
- Three stat boxes showing counts

### MCQDisplay
- Modal popup for answering questions
- Auto-submit on selection
- Shows progress counter

### MCQAnalytics
- Shows total participants, responses, accuracy
- Per-question breakdown with response distribution

---

## 📁 File Reference

| File | Purpose |
|------|---------|
| `server/server.js` | Backend server |
| `src/pages/Home.jsx` | Landing page |
| `src/pages/MeetingRoom.jsx` | Participant interface |
| `src/pages/admin/AdminDashboard.jsx` | Admin control panel |
| `src/components/SentimentPanel.jsx` | Sentiment voting |
| `src/components/SentimentDashboard.jsx` | Sentiment chart |
| `src/components/MCQDisplay.jsx` | MCQ modal |
| `src/components/MCQAnalytics.jsx` | Analytics dashboard |

---

## 🔧 Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

### Backend (.env)
```
PORT=3000
GEMINI_API_KEY=your_key_here
```

---

## 🐛 Quick Debugging

**Issue:** Server not connecting
```bash
# Check if running
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Restart
cd server && npm run dev
```

**Issue:** Gemini API error
- Verify `.env` has `GEMINI_API_KEY`
- System falls back to mock MCQs
- Check console for specific error

**Issue:** Socket connection failed
- Ensure backend is running
- Check browser console
- Verify CORS enabled

---

## 📊 Testing Quick Checklist

- [ ] Create meeting
- [ ] Join as 2+ participants
- [ ] Vote sentiments
- [ ] Admin joins, sees sentiment chart update
- [ ] Admin generates MCQ
- [ ] All see MCQ modal
- [ ] Answer MCQ, submit
- [ ] Admin sees analytics
- [ ] Check response counts increase

---

## 📈 Performance Tips

- Don't open 100+ browser tabs
- Use Chrome for best performance
- Check network throttling if slow
- Verify Gemini API isn't rate limited

---

## 🚀 Common Tasks

### Create Test Meeting
```javascript
// In browser console:
fetch('/api/create-meeting', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d.meetingId))
```

### Check Server Logs
```bash
# Look for Socket.IO events
# Watch for "Room created", "Sentiment update", "MCQ generated"
```

### View Admin Dashboard
```
http://localhost:5173/admin
Username: admin
Password: admin123
```

---

## 📚 Documentation Links

- **Setup:** QUICKSTART.md
- **Architecture:** ARCHITECTURE.md
- **Testing:** TESTING.md
- **Backend API:** server/README.md
- **Full Summary:** IMPLEMENTATION_SUMMARY.md

---

## ⚡ Pro Tips

1. **Multiple Instances:** Open multiple browser tabs/windows for testing
2. **Incognito Mode:** Use incognito to test without cache
3. **DevTools:** Use DevTools Network tab to monitor Socket.IO events
4. **Mock Data:** System uses mock MCQs if Gemini API fails
5. **Auto-reload:** Both frontend and backend support hot reload
6. **Room IDs:** Use uppercase letters (auto-converted)
7. **Sentiment:** Can change vote multiple times per session
8. **MCQs:** Auto-submit on selection (can re-answer)

---

**Last Updated:** November 6, 2025  
**Status:** Production Ready ✅
