# WebRTC Conference Server Setup

## Installation

```bash
cd server
npm install
```

## Environment Variables

Create a `.env` file in the server directory:

```
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

## Running the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

- `POST /api/create-meeting` - Create a new meeting
- `POST /api/admin-login` - Admin login
- `GET /api/meeting/:meetingId` - Get meeting state

## Socket.IO Events

### Client → Server
- `join-room` - Join a meeting room
- `submit-sentiment` - Submit sentiment feedback
- `generate-mcq` - Generate MCQs (admin only)
- `submit-mcq-response` - Submit MCQ answer
- `get-mcq-analytics` - Get MCQ analytics (admin only)

### Server → Client
- `room-state` - Current room state and participants
- `sentiment-updated` - Sentiment feedback updated
- `mcq-broadcast` - MCQs broadcasted to all
- `mcq-response-update` - Response count updated
- `mcq-analytics` - MCQ analytics data
- `error` - Error message
