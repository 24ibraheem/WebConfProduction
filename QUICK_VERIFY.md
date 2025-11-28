# 🚀 Quick Start: Database & Transcription Testing

## ⚡ 5-Minute Setup

### Step 1: Verify Everything is Running (1 min)
```bash
# Check MongoDB
lsof -i :27017
# Output: mongod should be listening

# Check Backend (port 3000)
lsof -i :3000
# If not running: cd server && npm run dev

# Check Frontend (port 5174)
lsof -i :5174
# If not running: npm run dev
```

### Step 2: Open the App (1 min)
```
Browser: http://localhost:5174
```

### Step 3: Create a Meeting (1 min)
```
1. Click "Create Meeting"
2. Note the Meeting ID (e.g., ABC123)
3. Copy the link
```

### Step 4: Join as Instructor (1 min)
```
1. Append ?role=instructor to the link
2. Example: http://localhost:5174/?role=instructor&id=ABC123
3. Allow microphone permissions
```

### Step 5: Wait for Audio Recording (1 min)
```
- AudioRecorder auto-records 60-second chunks
- After 60 seconds, watch backend console for:
  🎙️ [Transcription] Audio chunk received...
  ✅ [Transcription] Transcription complete...
  💾 [DB] Transcript saved to database...
```

---

## 🔍 Verify Data in Database

### Check 1: Meeting Persisted
```bash
mongosh mongodb://localhost:27017/ly_conference --eval "
db.meetings.countDocuments()
" --quiet

# Should show: 1 or more
```

### Check 2: Transcripts Persisted (after audio)
```bash
mongosh mongodb://localhost:27017/ly_conference --eval "
db.transcripts.countDocuments()
" --quiet

# After instructor speaks: Should show 1 or more
```

### Check 3: Class Summary Persisted
```bash
mongosh mongodb://localhost:27017/ly_conference --eval "
db.classsummaries.countDocuments()
" --quiet

# After first transcript: Should show 1
```

---

## 📊 What's Saved Where

### In Memory (Instant, Live)
```
meetings.Map({
  'ABC123': {
    transcripts: [1, 2, 3...],
    classSummary: {...},
    participants: [...]
  }
})
```

### MongoDB (Persistent, Queryable)
```
db.meetings
  └─ meetingId, title, status, createdAt

db.transcripts
  └─ rawText, summary, duration, mimeType

db.classsummaries
  └─ engagementScore, mainInsights, sentiment
```

---

## 🎤 Transcription Pipeline

```
60 seconds pass
      ↓
AudioRecorder captures chunk
      ↓
emit('audio-chunk-recorded')
      ↓
Backend receives
      ↓
transcribeAudio() → Gets mock/real transcript
      ↓
generateSummary() → Creates 2-3 sentence summary
      ↓
store in meeting.transcripts
      ↓
save to db.transcripts
      ↓
generateAnalysisInsights() → 3-4 actionable insights
      ↓
save to db.classsummaries
      ↓
emit('transcript-created') → Real-time update to UI
      ↓
emit('class-summary-updated') → UI shows insights
      ↓
User can click "Generate Question" → Uses summary to create MCQs
```

---

## 📝 Console Logs to Watch

### Backend Console (Terminal Running `npm run dev` in `server/`)

**Good Signs:**
```
✅ MongoDB Connected: mongodb://localhost:27017/ly_conference
✅ Server running on http://localhost:3000
✅ Database persistence enabled
```

**During Audio Recording:**
```
🎙️ [Transcription] Audio chunk received from [socket] in room [ID]
⏳ [Transcription] Starting transcription...
✅ [Transcription] Transcription complete: Today we discussed...
📝 [Transcription] Summary generated
💾 [Transcription] Transcript stored (total: 1)
💾 [DB] Transcript saved to database with ID: [ObjectId]
📊 [Transcription] Class summary updated: 3 insights
💾 [DB] Class summary saved to database with ID: [ObjectId]
```

### Frontend Console (Browser F12 → Console)

**Good Signs:**
```
✅ [AudioRecorder] Starting for instructor
🎤 [AudioRecorder] Chunk ready: 60000ms
📊 [class-summary-updated] Class summary updated:
  ├─ totalTranscripts: 1
  ├─ engagementScore: 75
  └─ mainInsights: ["✅ High positive...", ...]
```

---

## 🎯 Test Scenarios

### Scenario 1: Meeting Persistence ✅
```
1. Create meeting
2. Close window
3. Restart backend
4. Check database still has meeting
   → mongosh: db.meetings.countDocuments()
   → Should still show 1+
```

### Scenario 2: Transcription Working ✅
```
1. Create meeting
2. Join as instructor (?role=instructor)
3. Wait 60 seconds (1 audio chunk)
4. Check console for transcription logs
5. Query database: db.transcripts.countDocuments()
   → Should be 1
```

### Scenario 3: Class Summary With Insights ✅
```
1. After transcript is saved
2. Check console for: "📊 [Transcription] Class summary updated: X insights"
3. Query database: db.classsummaries.findOne()
   → Should have engagementScore and mainInsights
```

### Scenario 4: Generate Question From Summary ✅
```
1. Wait for 1 transcription to complete
2. Instructor clicks "Generate Question"
3. Should generate MCQs from class insights
   (uses summary + engagement score for context)
```

---

## 🆘 Troubleshooting Quick Links

### Database not saving?
1. Check MongoDB is running: `lsof -i :27017`
2. Check server shows: `✅ Database persistence enabled`
3. Look for specific save logs: `💾 [DB]`

### Transcription not happening?
1. Check audio is recording: Look for `🎤 [AudioRecorder] Chunk ready`
2. Check chunk received: Look for `🎙️ [Transcription] Audio chunk received`
3. Check it's instructor: URL should have `?role=instructor`

### Data showing in memory but not database?
1. Run: `mongosh mongodb://localhost:27017/ly_conference`
2. Query: `db.meetings.findOne()`
3. If empty: Database saves are failing, check error logs

---

## 📦 What Should Increase

| Metric | Increases When | How to Check |
|--------|---|---|
| db.meetings | Create meeting | `db.meetings.countDocuments()` |
| db.transcripts | Instructor speaks (60s) | `db.transcripts.countDocuments()` |
| db.classsummaries | First transcript | `db.classsummaries.countDocuments()` |
| db.mcqs | Click "Generate Question" | `db.mcqs.countDocuments()` |

---

## ✨ Key Features

### ✅ Meeting Persistence
- Saves instantly to in-memory
- Saves to MongoDB for durability
- Survives server restart

### ✅ Audio Recording
- Auto-records 60-second chunks (instructor only)
- Sends to backend for processing
- Chunks can be chained together

### ✅ Transcription Pipeline
- Mock transcription (realistic test data)
- Real API ready (Whisper, Google Cloud)
- Generates summary from transcription
- Creates actionable insights

### ✅ Real-Time Updates
- Socket.IO broadcasts new transcripts
- Class summary updates live
- Engagement score updates in real-time
- UI shows insights as they're generated

### ✅ Question Generation
- Uses class summary for context
- Incorporates engagement score
- Calls Gemini API for MCQs
- Falls back to custom prompt

---

## 🎬 Complete Test Flow (5-10 minutes)

```
1. Start all services (1 min)
   ✅ Backend running on 3000
   ✅ Frontend running on 5174
   ✅ MongoDB connected

2. Create meeting (1 min)
   ✅ Meeting ID shown
   ✅ Check console: "Meeting stored in memory"
   ✅ Check console: "Meeting saved to database"

3. Join as instructor (1 min)
   ✅ Allow microphone
   ✅ Wait for AudioRecorder to initialize
   ✅ Check console: "AudioRecorder starting for instructor"

4. Wait for audio chunk (1 min)
   ✅ After 60 seconds
   ✅ Check console: "Audio chunk received"
   ✅ Check console: "Transcription complete"

5. Verify database (2 min)
   ✅ mongosh: db.meetings.countDocuments() → 1+
   ✅ mongosh: db.transcripts.countDocuments() → 1+
   ✅ mongosh: db.classsummaries.countDocuments() → 1

6. Test question generation (1 min)
   ✅ Click "Generate Question"
   ✅ Should show MCQs generated from summary
   ✅ Check: "Generated from class summary"

Total: 7-10 minutes to full verification ✅
```

---

## 🚀 You're Ready!

Everything is set up and ready for testing. Start with the 5-minute setup above and work your way through the scenarios.

**Current Status:**
- ✅ Backend: Running
- ✅ Frontend: Running  
- ✅ MongoDB: Connected
- ✅ Meetings: Persisting (2 confirmed)
- ✅ Audio Recording: Ready
- ✅ Transcription: Ready
- ✅ Database Saving: Enhanced with logging

**Next Step:** Create a meeting and have the instructor record audio! 🎤
