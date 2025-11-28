# Database and Transcription Verification Guide

## System Status ✅

### Running Services:
- **Backend**: http://localhost:3000 (Node.js + Express + Socket.IO)
- **Frontend**: http://localhost:5174 (React + Vite)
- **MongoDB**: mongodb://localhost:27017/ly_conference (Mongoose ODM)
- **Database Persistence**: ✅ Enabled

## Data Flow Verification

### 1. Meeting Creation Flow

**When instructor creates a meeting:**

```
POST /api/create-meeting
  ↓
  ├─ In-memory: meetings.set(meetingId, {...})
  │  └─ Status: ✅ Instant
  │
  └─ MongoDB: new Meeting({meetingId, title, status}).save()
     └─ Status: ✅ Persisted to database
     └─ Console Log: "💾 [DB] Meeting {ID} saved to database with ID: {ObjectId}"
```

**Expected Console Output:**
```
📅 [Meeting] Creating new meeting: ABC123
✅ [Meeting] Meeting stored in memory
💾 [DB] Meeting ABC123 saved to database with ID: 507f1f77bcf86cd799439011
```

---

### 2. Audio Recording & Transcription Flow

**When instructor's AudioRecorder captures a 60-second chunk:**

```
AudioRecorder (Frontend)
  ↓ emit('audio-chunk-recorded', {audioBase64, duration, mimeType, timestamp})
  ↓
Server Handler (Backend)
  ├─ Log: "🎙️ [Transcription] Audio chunk received from {socketId} in room {roomId}"
  │
  ├─ 1️⃣ TRANSCRIPTION
  │   ├─ transcribeAudio(audioBase64)
  │   ├─ Returns: Mock transcript (or real API result)
  │   └─ Console: "✅ [Transcription] Transcription complete: {preview}..."
  │
  ├─ 2️⃣ SUMMARY GENERATION
  │   ├─ generateSummary(transcriptText)
  │   ├─ Returns: 2-3 sentence summary
  │   └─ Console: "📝 [Transcription] Summary generated"
  │
  ├─ 3️⃣ IN-MEMORY STORAGE
  │   ├─ meeting.transcripts.push(transcript)
  │   └─ Console: "💾 [Transcription] Transcript stored (total: X)"
  │
  ├─ 4️⃣ DATABASE SAVE - TRANSCRIPT
  │   ├─ Meeting.findOne({meetingId})
  │   ├─ new Transcript({meetingId, rawText, summary, ...}).save()
  │   └─ Console: "💾 [DB] Transcript saved to database with ID: {ObjectId}"
  │
  ├─ 5️⃣ CLASS SUMMARY UPDATE
  │   ├─ Calculate insights from all transcripts
  │   ├─ calculateEngagementScore()
  │   └─ Console: "📊 [Transcription] Class summary updated: X insights"
  │
  ├─ 6️⃣ DATABASE SAVE - CLASS SUMMARY
  │   ├─ ClassSummary.findOne or create new
  │   ├─ Save/update summary data
  │   └─ Console: "💾 [DB] Class summary saved/updated in database"
  │
  └─ 7️⃣ BROADCAST TO PARTICIPANTS
      ├─ emit('transcript-created', {transcript, totalTranscripts})
      ├─ emit('class-summary-updated', classSummary)
      └─ Participants see real-time insights
```

**Expected Console Output:**
```
🎙️ [Transcription] Audio chunk received from abc123def456 in room MEETING
⏳ [Transcription] Starting transcription...
✅ [Transcription] Transcription complete: Today we discussed the fundamentals of React...
📝 [Transcription] Summary generated
💾 [Transcription] Transcript stored (total: 1)
💾 [DB] Transcript saved to database with ID: 507f191e810c19729de860ea
📊 [Transcription] Class summary updated: 3 insights
💾 [DB] Class summary saved to database with ID: 507f191e810c19729de860eb
```

---

## MongoDB Collections Structure

### Collections Created:
1. **meetings** - Class sessions
   - Field: `meetingId` (indexed, unique)
   - Field: `status` (active, completed, scheduled)
   - Field: `participants` (user references)

2. **transcripts** - Audio transcriptions
   - Field: `meetingId` (reference to meeting)
   - Field: `rawText` (full transcription)
   - Field: `summary` (key points)
   - Field: `timestamp` (when transcribed)

3. **classsummaries** - Analytics per meeting
   - Field: `meetingId` (reference to meeting)
   - Field: `engagementScore` (0-100)
   - Field: `mainInsights` (array of key findings)
   - Field: `sentiment` (distribution of positive/neutral/negative)

4. **mcqs** - Quiz questions
   - Generated from class summary
   - Tracks responses

5. **users** - Student/instructor profiles
   - For future authentication

6. **analytics** - Per-user engagement data
   - Sentiment history
   - Participation count

---

## How to Verify Everything is Working

### Step 1: Check MongoDB Connection
```bash
# Check if MongoDB is running
lsof -i :27017

# Should see: mongod listening on TCP localhost:27017
```

### Step 2: Check Server Logs
```bash
# Terminal running backend should show:
✅ MongoDB Connected: mongodb://localhost:27017/ly_conference
✅ Server running on http://localhost:3000
✅ Database persistence enabled
```

### Step 3: Create a Meeting
```
1. Go to http://localhost:5174
2. Click "Create Meeting"
3. Note the Meeting ID (e.g., ABC123)
4. Share link with instructor
```

**Check Backend Console:**
```
📅 [Meeting] Creating new meeting: ABC123
✅ [Meeting] Meeting stored in memory
💾 [DB] Meeting ABC123 saved to database with ID: 507f1f77bcf86cd799439011
```

### Step 4: Join as Instructor with Audio
```
1. Use the shared link with ?role=instructor
2. Allow microphone permissions
3. AudioRecorder will auto-record 60-second chunks
4. Wait for first chunk to process
```

**Check Backend Console (should see all steps from Section 2):**
```
🎙️ [Transcription] Audio chunk received...
✅ [Transcription] Transcription complete...
💾 [DB] Transcript saved to database...
📊 [Transcription] Class summary updated...
💾 [DB] Class summary saved to database...
```

### Step 5: Verify Data in Database

**Using MongoDB Shell:**
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/ly_conference

# Check collections
show collections

# Count documents in each collection
db.meetings.countDocuments()      # Should be ≥ 1
db.transcripts.countDocuments()   # Should be ≥ 1 (after instructor speaks)
db.classsummaries.countDocuments() # Should be ≥ 1 (after first transcript)

# View latest meeting
db.meetings.findOne({}, {sort: {createdAt: -1}})

# View transcripts for a meeting
db.transcripts.find({meetingId: ObjectId("...")})

# View class summary
db.classsummaries.findOne({meetingId: ObjectId("...")})
```

---

## What Gets Stored in Database

### On Meeting Creation:
✅ Meeting document with:
- meetingId, title, status, createdAt, participants array

### On Audio Recording (per 60-second chunk):
✅ Transcript document with:
- meetingId (reference to meeting)
- rawText (full transcription)
- summary (extracted key points)
- duration (length of audio)
- timestamp (when recorded)
- mimeType (audio format)

✅ ClassSummary document with:
- meetingId (reference to meeting)
- totalTranscripts (count of all transcripts)
- keyTopics (array of last 5 summaries)
- averageSentiment (calculated from all participants)
- engagementScore (0-100 based on activity & sentiment)
- mainInsights (generated insights from transcriptions)
- sentiment object (good: 0, neutral: 0, negative: 0)

---

## Troubleshooting

### Issue: Data not appearing in database

**Check 1: MongoDB Connection**
```bash
# Verify MongoDB is running
lsof -i :27017

# If not running, start MongoDB:
brew services start mongodb-community
# or
mongod
```

**Check 2: Server Console Logs**
```
Look for: "✅ MongoDB Connected"
- If missing: MongoDB connection failed, check MONGO_URI env var
- If present: Database persistence is active
```

**Check 3: Individual Save Logs**
```
For meetings: "💾 [DB] Meeting {ID} saved to database"
For transcripts: "💾 [DB] Transcript saved to database with ID"
For summaries: "💾 [DB] Class summary saved to database"

If these logs are MISSING: Database saves are failing silently
If present but saying "Could not save": Check error message in logs
```

**Check 4: Database Permissions**
```bash
# Verify you can connect to MongoDB
mongosh mongodb://localhost:27017/ly_conference

# List collections
show collections

# If error: Check MongoDB daemon is fully started
```

### Issue: Transcription not working

**Check 1: AudioRecorder is running**
```
Frontend console should show:
🎙️ [AudioRecorder] Starting for instructor
🎤 [AudioRecorder] Chunk ready: 60000ms
```

**Check 2: Audio chunk is being sent**
```
Backend should show:
🎙️ [Transcription] Audio chunk received from {socketId} in room {roomId}
```

**Check 3: Transcription is completing**
```
Backend should show:
✅ [Transcription] Transcription complete: {text preview}
```

If any of these steps are missing, check the respective console (browser or server).

---

## Data Persistence Benefits

### Before (In-Memory Only):
❌ Data lost when server restarts
❌ No historical reports
❌ Can't analyze past sessions
❌ No user profiles

### After (MongoDB + In-Memory):
✅ Data persists across restarts
✅ Historical reports available
✅ Analytics and trends
✅ Multiple meetings can be analyzed
✅ User accounts and progress tracking
✅ Hybrid performance (in-memory for live, DB for persistence)

---

## Next Steps

1. ✅ Verify all systems running (MongoDB, Backend, Frontend)
2. ✅ Create test meeting
3. ✅ Join as instructor with audio
4. ✅ Monitor console logs
5. ✅ Query database to confirm data
6. ✅ Check that class summary updates in real-time
7. ✅ Verify "Generate Question" button works (uses stored summaries)

All enhanced logging is now active. You should see detailed console output for every step! 🚀
