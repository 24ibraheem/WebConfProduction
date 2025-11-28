# WebRTC Conference Platform with Sentiment Analysis & MCQ Generation

A real-time video conferencing platform built with React, Node.js, WebRTC, and Socket.IO featuring live sentiment polling and AI-powered MCQ generation using Google Gemini API.

## ✨ Features

### 🎤 Real-time Video Conferencing
- WebRTC-based peer-to-peer communication
- Low-latency audio/video streaming
- Real-time participant list updates

### 💭 Live Sentiment Polling
- Participants vote on their sentiment (Good/Neutral/Bad)
- Admin dashboard with real-time sentiment distribution chart
- Auto-updating doughnut chart visualization
- Instant feedback on participation

### 🤖 AI-Powered MCQ Generation
- Admin generates MCQs using natural language prompts
- Google Gemini API integration
- Auto-broadcast MCQs to all participants
- Real-time response tracking and analytics
- Question-wise accuracy breakdown

### 📊 Admin Analytics Dashboard
- Real-time sentiment distribution visualization
- Active participant monitoring
- MCQ response analytics
- Per-question accuracy metrics
- Response distribution charts

### 🔒 Role-Based Access
- **Admin/Instructor:** Generate content, view analytics, monitor sessions
- **Participants/Students:** Join meetings, vote sentiment, answer MCQs

## 🏗 Architecture

**Frontend:** React.js + Tailwind CSS + Socket.IO Client  
**Backend:** Node.js + Express + Socket.IO  
**Real-time:** WebRTC + Socket.IO (WebSocket)  
**AI:** Google Generative AI (Gemini API)  
**Charts:** Chart.js + Recharts  
**UI Components:** Lucide React Icons  

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Google Gemini API key: https://makersuite.google.com/app/apikey

### 1. Backend Setup
```bash
cd server
npm install

# Create .env file
cat > .env << EOF
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
EOF

npm run dev
```

### 2. Frontend Setup (new terminal)
```bash
npm install
npm run dev
```

### 3. Access Application
- **Participant:** http://localhost:5173
- **Admin:** http://localhost:5173/admin (Login: admin/admin123)

## 📖 Detailed Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed technical architecture
- **[server/README.md](./server/README.md)** - Backend API reference

## 📁 Project Structure

```
├── server/                          # Node.js Backend
│   ├── server.js                   # Express + Socket.IO server
│   ├── package.json
│   └── .env.example
├── src/                             # React Frontend
│   ├── pages/
│   │   ├── Home.jsx                # Landing page
│   │   ├── MeetingRoom.jsx         # Participant interface
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       └── AdminDashboard.jsx  # Admin control panel
│   ├── components/
│   │   ├── SentimentPanel.jsx      # Sentiment voting
│   │   ├── SentimentDashboard.jsx  # Sentiment chart
│   │   ├── MCQDisplay.jsx          # MCQ modal
│   │   └── MCQAnalytics.jsx        # Analytics dashboard
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json                     # Frontend dependencies
├── vite.config.js
├── tailwind.config.js
├── ARCHITECTURE.md                  # Technical documentation
└── QUICKSTART.md                    # Setup guide
```

## 🔄 Data Flow

### Sentiment Polling
1. Participant clicks sentiment button (Good/Neutral/Bad)
2. Client emits `submit-sentiment` event via Socket.IO
3. Server updates sentiment distribution in-memory
4. Server broadcasts `sentiment-updated` to all connected clients
5. Admin dashboard chart updates in real-time

### MCQ Generation
1. Admin enters prompt (e.g., "Generate 10 MCQs on Data Structures")
2. Server calls Google Gemini API with prompt
3. Gemini returns structured MCQ JSON
4. Server broadcasts MCQs to all participants via Socket.IO
5. Participants see MCQ modal and answer questions
6. Responses auto-submit and are tracked server-side
7. Admin views detailed analytics per question

## 🎯 Usage Examples

### For Participants
```javascript
// Join a room
socket.emit('join-room', {
  roomId: 'ABC12345',
  displayName: 'Alice',
  isAdmin: false
});

// Submit sentiment
socket.emit('submit-sentiment', {
  roomId: 'ABC12345',
  sentiment: 'good'  // 'good' | 'neutral' | 'negative'
});

// Answer MCQ
socket.emit('submit-mcq-response', {
  roomId: 'ABC12345',
  mcqSessionId: 'uuid',
  questionIndex: 0,
  answer: 'O(log n)'
});
```

### For Admin
```javascript
// Generate MCQs
socket.emit('generate-mcq', {
  roomId: 'ABC12345',
  prompt: 'Generate 10 easy MCQs on Data Structures'
});

// Get analytics
socket.emit('get-mcq-analytics', {
  roomId: 'ABC12345',
  mcqSessionId: 'uuid'
});
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/create-meeting` | Create new meeting |
| `POST` | `/api/admin-login` | Admin login |
| `GET` | `/api/meeting/:meetingId` | Get meeting state |

## 🔌 Socket.IO Events

### Server → Client
- `room-state` - Current participants and sentiment
- `sentiment-updated` - New sentiment vote
- `mcq-broadcast` - MCQs available for participants
- `mcq-response-update` - Live response count
- `mcq-analytics` - Detailed analytics data
- `error` - Error messages

### Client → Server
- `join-room` - Join meeting
- `submit-sentiment` - Submit feedback
- `generate-mcq` - Generate MCQs (admin only)
- `submit-mcq-response` - Answer MCQ
- `get-mcq-analytics` - Get stats (admin only)

## 🔐 Security Features

- Admin authentication (JWT recommended in production)
- CORS enabled for trusted origins
- Input validation on server side
- Socket.IO namespace isolation per room
- Fallback to mock MCQs if API fails

## 🌐 Deployment

### Backend (Heroku)
```bash
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

### Frontend (Vercel)
```bash
npm run build
vercel deploy dist/
```

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS 3 |
| Backend | Node.js, Express 4, Socket.IO 4 |
| Real-time | WebRTC, Socket.IO |
| AI | Google Generative AI (Gemini) |
| Charts | Chart.js 4, Recharts 2, React-ChartJS-2 |
| UI | Lucide React Icons |
| Build | Vite 7 |
| Styling | Tailwind CSS with custom config |

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot GET /api" | Start backend server: `cd server && npm run dev` |
| WebSocket connection failed | Check if backend runs on port 3000 |
| Gemini API errors | Verify API key in `.env` file |
| Camera permission denied | Check browser permissions |
| MCQs not displaying | Check browser console for errors |

## 📚 Learning Resources

- [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Docs](https://socket.io/docs/)
- [Google Gemini API](https://ai.google.dev/)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)

## 🚀 Future Enhancements

- [ ] Full P2P WebRTC implementation
- [ ] Screen sharing capability
- [ ] Session recording and playback
- [ ] Custom quiz builder
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User authentication with JWT
- [ ] Chat messaging system
- [ ] Leaderboard based on MCQ accuracy
- [ ] Breakout room functionality
- [ ] Push notifications

## 📝 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the GitHub repository.

---

**Ready to get started?** Follow the [QUICKSTART.md](./QUICKSTART.md) guide.
