# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Prerequisites
- Node.js 16+ installed
- Google Gemini API key (free): https://makersuite.google.com/app/apikey

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Start server (runs on http://localhost:3000)
npm run dev
```

### 3. Frontend Setup (new terminal)

```bash
# From root directory
npm install

# Start development server (runs on http://localhost:5173)
npm run dev
```

### 4. Access the Application

**Participant:**
1. Open http://localhost:5173
2. Click "Start Meeting" (or enter meeting ID from admin)
3. Allow camera/microphone access
4. Click "Join Room"
5. Use sentiment panel to vote

**Admin:**
1. Open http://localhost:5173/admin
2. Login: `username: admin`, `password: admin123`
3. Enter the meeting ID you created
4. Click "Join as Admin"
5. Enter a prompt like "Generate 10 MCQs on Data Structures"
6. Click "Generate" to create MCQs
7. View real-time sentiment and response analytics

## 📊 Features Overview

### Sentiment Panel
- Participants can vote: Good 👍, Neutral 😐, Bad 👎
- Admin sees real-time distribution in doughnut chart
- Auto-updates when any participant votes

### MCQ Generation
- Admin types prompt for MCQs
- Server uses Google Gemini API to generate questions
- All participants instantly see the MCQ modal
- Answers auto-submit when participants select options
- Admin views detailed analytics for each question

### Real-time Updates
- All events are socket-based (WebSocket)
- Sentiment updates broadcast to all clients
- MCQ responses tracked in real-time
- Participant list updated instantly

## 🔧 Configuration

### Changing Server Port
Edit `server/.env`:
```
PORT=4000
```

### Disabling Gemini API (Use Mock Data)
Comment out the Gemini API call in `server/server.js`:
```javascript
// const mcqs = await generateMCQs(prompt);
const mcqs = generateMockMCQs(prompt); // Uses fallback
```

### Admin Credentials
Edit `server/server.js` (Admin Login route):
```javascript
if (username === 'admin' && password === 'admin123') {
  // Change credentials here
}
```

## 📁 Project Structure

```
├── server/                    # Node.js backend
│   ├── server.js             # Main server file
│   ├── package.json
│   └── .env
├── src/                       # React frontend
│   ├── pages/
│   │   ├── Home.jsx          # Landing page
│   │   ├── MeetingRoom.jsx   # Participant interface
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       └── AdminDashboard.jsx
│   ├── components/
│   │   ├── SentimentPanel.jsx
│   │   ├── SentimentDashboard.jsx
│   │   ├── MCQDisplay.jsx
│   │   └── MCQAnalytics.jsx
│   ├── App.jsx
│   └── main.jsx
├── package.json              # Frontend dependencies
└── ARCHITECTURE.md          # Detailed docs
```

## 🐛 Troubleshooting

### "Cannot GET /api/meeting"
- Backend server not running on port 3000
- Solution: Run `npm run dev` in server directory

### "WebSocket connection failed"
- Check if backend is running
- Verify Socket.IO connection: Check browser console
- Ensure CORS is enabled (it is by default)

### "Gemini API Error"
- Invalid API key in `.env`
- Get key from: https://makersuite.google.com/app/apikey
- System will use mock MCQs as fallback

### Camera/Microphone Permission Denied
- Browser blocked permissions
- Check browser settings and reload
- Firefox/Chrome: Click lock icon → Permissions

### MCQs not appearing
- Check browser console for errors
- Verify Gemini API key is set
- Test with mock MCQs by disabling API call

## 📱 Browser Support
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔐 Security Notes
- Don't commit `.env` files to git
- Admin credentials should be replaced with proper auth in production
- Use HTTPS in production
- Set up proper database instead of in-memory storage

## 📚 API Reference

### Socket Events (Client → Server)
- `join-room` - Join a meeting
- `submit-sentiment` - Submit feedback
- `generate-mcq` - Generate questions (admin)
- `submit-mcq-response` - Answer question
- `get-mcq-analytics` - Get stats (admin)

### Socket Events (Server → Client)
- `room-state` - Current participants and sentiment
- `sentiment-updated` - New sentiment vote received
- `mcq-broadcast` - MCQs available
- `mcq-response-update` - Response count updated
- `mcq-analytics` - Analytics data

## 🚀 Deployment

### Heroku Deployment
```bash
# Create Heroku apps
heroku create your-app-backend
heroku create your-app-frontend

# Set environment variables
heroku config:set GEMINI_API_KEY=your_key -a your-app-backend

# Deploy
git push heroku main
```

### Vercel Deployment (Frontend)
```bash
npm run build
vercel deploy dist/
```

## 📖 Learn More
- WebRTC: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- Socket.IO: https://socket.io/docs/
- Google Gemini: https://ai.google.dev/
- React: https://react.dev
- Express.js: https://expressjs.com

## ✨ Next Steps
- Implement full WebRTC video conferencing
- Add chat messaging system
- Create custom quiz builder
- Add user authentication with database
- Implement screen sharing
- Create session recordings

---

**Questions?** Check `ARCHITECTURE.md` for detailed documentation.
