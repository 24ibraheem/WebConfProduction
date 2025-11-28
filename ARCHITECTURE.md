# WebRTC Conference Platform - Complete Implementation Guide

## Project Architecture

```
webrtc-conference/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── SentimentDashboard.jsx    # Admin sentiment chart
│   │   ├── SentimentPanel.jsx         # Participant sentiment voting
│   │   ├── MCQDisplay.jsx             # MCQ modal for participants
│   │   ├── MCQAnalytics.jsx           # Admin analytics dashboard
│   │   ├── Card.jsx
│   │   └── Sidebar.jsx
│   ├── pages/
│   │   ├── Home.jsx                   # Landing page
│   │   ├── MeetingRoom.jsx            # Participant meeting interface
│   │   └── admin/
│   │       ├── AdminLogin.jsx         # Admin login
│   │       └── AdminDashboard.jsx     # Admin control panel
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/                       # Backend (Node.js)
│   ├── server.js                     # Express + Socket.IO server
│   ├── package.json
│   └── README.md
├── package.json                  # Frontend dependencies
├── vite.config.js               # Vite configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

## Key Features

### 1. **Sentiment Polling System**
Real-time sentiment feedback from participants with instant admin dashboard updates.

**Components:**
- `SentimentPanel.jsx` - User sentiment voting interface (Good/Neutral/Bad)
- `SentimentDashboard.jsx` - Admin sentiment distribution chart

**Flow:**
1. Participant clicks sentiment button (Good/Neutral/Bad)
2. Client emits `submit-sentiment` event to server
3. Server updates sentiment distribution
4. Server broadcasts `sentiment-updated` to all clients in room
5. Admin dashboard updates in real-time with doughnut chart

**Data Model:**
```javascript
sentiment: {
  good: 5,
  neutral: 3,
  negative: 1
}
```

### 2. **MCQ Generation & Broadcasting**
Admin generates MCQs using Gemini API, which are instantly broadcast to all participants.

**Components:**
- `MCQDisplay.jsx` - Participant MCQ modal interface
- `MCQAnalytics.jsx` - Admin analytics and response tracking

**Flow:**
1. Admin enters prompt (e.g., "Generate 10 MCQs on Data Structures")
2. Admin clicks "Generate"
3. Server calls Gemini API with the prompt
4. Server generates MCQ session with unique ID
5. Server broadcasts `mcq-broadcast` event to all participants
6. Participants see MCQ modal and auto-submit answers
7. Admin can view analytics for each MCQ

**Data Model:**
```javascript
mcqSession: {
  id: "uuid",
  prompt: "Generate 10 MCQs on Data Structures",
  mcqs: [
    {
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      answer: "O(log n)",
      explanation: "Binary search divides the search space in half..."
    }
  ],
  responses: Map {
    "socketId1": { 0: "O(log n)", 1: "Stack", ... },
    "socketId2": { 0: "O(log n)", 1: "Queue", ... }
  }
}
```

### 3. **Real-time Room State Management**
Participants and sentiment tracking synchronized across all clients.

**Socket Events:**

**Client → Server:**
```javascript
// Join a room
socket.emit('join-room', { roomId, displayName, isAdmin: false });

// Submit sentiment
socket.emit('submit-sentiment', { roomId, sentiment: 'good' });

// Generate MCQs (admin only)
socket.emit('generate-mcq', { roomId, prompt });

// Submit MCQ response
socket.emit('submit-mcq-response', { roomId, mcqSessionId, questionIndex, answer });

// Get MCQ analytics (admin only)
socket.emit('get-mcq-analytics', { roomId, mcqSessionId });
```

**Server → Client:**
```javascript
// Room state updated
socket.on('room-state', { participants, sentiment });

// Sentiment feedback updated
socket.on('sentiment-updated', { participantId, sentiment, distribution });

// MCQs broadcasted
socket.on('mcq-broadcast', mcqSession);

// Response count updated
socket.on('mcq-response-update', { mcqSessionId, totalResponses, totalParticipants });

// Analytics data
socket.on('mcq-analytics', analytics);

// Error message
socket.on('error', { message });
```

## Setup Instructions

### Prerequisites
- Node.js 16+
- npm or yarn
- Google Gemini API key (from https://makersuite.google.com/app/apikey)

### Backend Setup

```bash
cd server
npm install

# Create .env file
cat > .env << EOF
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Start server
npm run dev  # Development with auto-reload
npm start    # Production
```

### Frontend Setup

```bash
# Install dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
VITE_API_URL=http://localhost:3000
EOF

# Start development server
npm run dev

# Build for production
npm build
```

## API Endpoints

### `POST /api/create-meeting`
Creates a new meeting and returns a unique meeting ID.

**Request:** None (POST body empty)

**Response:**
```json
{
  "meetingId": "ABC12345"
}
```

### `POST /api/admin-login`
Authenticates admin credentials.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "admin-token",
  "role": "admin"
}
```

### `GET /api/meeting/:meetingId`
Retrieves current meeting state.

**Response:**
```json
{
  "id": "ABC12345",
  "createdAt": "2025-11-06T10:30:00Z",
  "admin": { ... },
  "participants": [ ... ],
  "sentiment": { "good": 5, "neutral": 3, "negative": 1 },
  "mcqs": [ ... ]
}
```

## Usage Examples

### Participant Workflow
1. Go to `http://localhost:5173/` (frontend)
2. Click "Start Meeting" or enter Meeting ID and "Join"
3. Allow camera/microphone access
4. Enter display name and click "Join Room"
5. Use sentiment panel to vote (Good/Neutral/Bad)
6. Answer MCQs when admin broadcasts them

### Admin Workflow
1. Go to `http://localhost:5173/admin`
2. Login with credentials (default: admin/admin123)
3. Enter Meeting ID and click "Join as Admin"
4. View real-time sentiment distribution
5. Enter prompt and click "Generate" to create MCQs
6. Monitor participant responses in real-time
7. Click MCQ session to view detailed analytics

## Integration with Gemini API

The system uses Google's Generative AI to generate MCQs dynamically.

**Function:** `generateMCQs(prompt)`

```javascript
async function generateMCQs(prompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Sends structured prompt to Gemini
  // Returns JSON array of MCQs
  // Fallback to mock MCQs if API fails
}
```

**Fallback Mechanism:**
If Gemini API is unavailable, the system automatically generates mock MCQs to ensure uninterrupted functionality.

## Data Flow Diagrams

### Sentiment Polling Flow
```
Participant          Client Socket        Server          Other Participants
    │                    │                   │                    │
    │──Click "Good"──→   │                   │                    │
    │                    │──emit sentiment──→│                    │
    │                    │                   │──broadcast──→       │
    │                    │←─sentiment-update─│                    │
    │←─UI update────────│                   │←─sentiment-update──│
    │                    │                   │                    │
    └────────────────────────────────────────────────────────────────
                         Admin Dashboard updated with new distribution
```

### MCQ Generation & Broadcasting Flow
```
Admin               Client Socket        Server          Gemini API
  │                    │                   │                │
  │─Enter Prompt──→    │                   │                │
  │─Click Generate─→   │                   │                │
  │                    │──emit generate───→│                │
  │                    │                   │──call Gemini──→│
  │                    │                   │←─MCQs JSON────│
  │                    │                   │                │
  │                    │←──mcq-broadcast──│                │
  │←─MCQ Modal────────│                   │                │
  │                    │                   │                │
  └──mcq-broadcast──────────────────→ All Participants see MCQ Modal
                                            │
                                      Each participant
                                      auto-submits answers
                                            │
                                      Analytics displayed on
                                      Admin Dashboard
```

## Production Considerations

1. **Authentication:** Replace mock authentication with proper JWT/OAuth
2. **Database:** Use MongoDB/PostgreSQL for persistent storage instead of in-memory
3. **Scaling:** Use Redis for distributed sessions with multiple servers
4. **Security:** Add rate limiting, input validation, and HTTPS
5. **Monitoring:** Integrate logging and error tracking (e.g., Sentry)
6. **CDN:** Deploy frontend to CDN for faster delivery
7. **WebRTC:** Implement TURN/STUN servers for NAT traversal
8. **Rate Limiting:** Limit MCQ generation to prevent API abuse

## Troubleshooting

### Sentiment not updating
- Check Socket.IO connection in browser console
- Verify server is running on port 3000
- Check for CORS errors

### MCQs not displaying
- Verify Gemini API key is set in `.env`
- Check browser console for errors
- Ensure server received the generate-mcq event

### Admin dashboard blank
- Confirm you're logged in as admin
- Check that participants are in the room
- Verify room ID matches between admin and participants

## File Descriptions

| File | Purpose |
|------|---------|
| `server.js` | Main Express + Socket.IO server with all event handlers |
| `MeetingRoom.jsx` | Participant interface with video, sentiment panel, and MCQ display |
| `AdminDashboard.jsx` | Admin control panel with sentiment chart and MCQ management |
| `SentimentPanel.jsx` | Interactive sentiment voting buttons for participants |
| `SentimentDashboard.jsx` | Chart.js doughnut chart showing sentiment distribution |
| `MCQDisplay.jsx` | Modal for displaying and answering MCQs |
| `MCQAnalytics.jsx` | Detailed breakdown of MCQ responses and correct answers |

## Next Steps for Enhancement

1. **Video Conferencing:** Implement full WebRTC peer-to-peer video/audio
2. **Screen Sharing:** Add ability for admin to share screen
3. **Recording:** Record sessions and save to cloud storage
4. **Polls:** Create custom polling system for other types of questions
5. **Chat:** Add real-time messaging between participants
6. **Breakout Rooms:** Divide participants into smaller groups
7. **Leaderboard:** Show top performers based on MCQ accuracy
8. **Push Notifications:** Notify participants of MCQ availability
