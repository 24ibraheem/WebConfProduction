# Quick Test Guide - Transcription Feature

## 🚀 Quick Start

### Step 1: Verify Servers Running
```bash
# Terminal 1 - Backend (should already be running on :3000)
cd /Users/ibrahimmir/03tailwindProps
npm run dev

# Terminal 2 - Frontend (should already be running on :5174)
cd /Users/ibrahimmir/03tailwindProps
npm run dev
```

Expected output:
- Backend: `✅ Server running on http://localhost:3000`
- Frontend: `Local: http://localhost:5174`

---

## 🧪 Test Scenario

### Part A: Setup Meeting

1. Open browser: `http://localhost:5174`
2. Create a meeting room (copy the room ID, e.g., `ABCD1234`)
3. Open **2 tabs**:
   - Tab 1: Instructor - `http://localhost:5174/meeting/ABCD1234?role=instructor`
   - Tab 2: Participant - `http://localhost:5174/meeting/ABCD1234`

### Part B: Audio Recording (Instructor)

4. **Instructor joins** (Tab 1)
   - Should see "AI Question Generator" panel
   - Panel should show: `⏹️ Audio recording not started` (waiting for stream)
   - Backend should log:
     ```
     👤 [join-room] Joining room: ABCD1234 as Instructor-xxxx
     🎙️ [AudioRecorder] Starting for instructor
     ```

5. **Verify AudioRecorder started**
   - Check browser DevTools Console (Tab 1)
   - Should see: `🎙️ [AudioRecorder] Chunk ready: 60000ms`
   - OR Server console should show: `✅ [AudioRecorder] Initialized with MIME type: audio/webm`

### Part C: Wait for Transcription (1 minute)

6. **Wait 60 seconds** (audio chunk cycle)
   - Backend logs should appear:
     ```
     🎙️ [Transcription] Audio chunk received from socket_xyz
     ⏳ [Transcription] Starting transcription...
     ✅ [Transcription] Transcription complete: Today we discussed...
     📝 [Transcription] Summary generated
     💾 [Transcription] Transcript stored (total: 1)
     📊 [Transcription] Class summary updated
     ```

7. **UI Update in Tab 1**
   - "Generate Question" panel should NOW show:
     ```
     📊 Class Insights:
     • Today we discussed React hooks...
     
     [🎤 Generate Question]
     ```

### Part D: Generate Question from Summary

8. **Click "Generate Question"** button
   - Button should show loading: `⏳ Generating...`
   - Backend logs:
     ```
     🤔 [Question] Generating question from class summary
     📝 [Question] Prompt built from summary...
     ✅ [Question] MCQ generated from summary and stored
     📤 broadcast('mcq-broadcast', {3 MCQs})
     ```

9. **See New MCQ Questions**
   - Tab 1 (Instructor) should show new poll with 3 questions
   - Tab 2 (Participant) should also see questions
   - Questions should be about React (from mock transcription)

### Part E: Custom Prompt Fallback

10. **Test custom prompt** (instructor)
    - Scroll down in "AI Question Generator" panel
    - Type: `Generate 2 questions about artificial intelligence`
    - Click blue "Send" button
    - New MCQs should appear

---

## 📊 What to Check

### ✅ Successful Signs

| Component | What to Look For |
|-----------|------------------|
| **Audio Recording** | Console: `✅ Chunk ready` every 60s |
| **Transcription** | Console: `✅ Transcription complete:` |
| **Summary** | UI shows insights in summary panel |
| **Engagement Score** | ClassSummary.engagementScore is 0-100 number |
| **Question Generation** | New MCQ appears after clicking button |
| **Chat** | Chat visible for instructor (flex-shrink-0 fix) |
| **Broadcast** | Both tabs see same questions simultaneously |

### ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Audio recording not started" stays forever | Check browser console for MediaRecorder error. Might need to grant permissions. |
| No logs in backend | Backend might not be running. Check terminal. |
| Port 5174 shows blank page | Frontend not built. Kill old process: `kill -9 $(lsof -t -i:5174)` then `npm run dev` |
| Socket connection fails | Check backend is actually running on :3000 |
| "No class insights available" error | Need to wait for first 60-second audio chunk. It doesn't happen immediately on join. |

---

## 🔍 Console Log Locations

### Browser Console (Instructor Tab)

```javascript
// Should see every 60 seconds:
🎙️ [AudioRecorder] Started recording chunk
✅ [AudioRecorder] Chunk ready: 60000ms
🎤 [AudioRecorder] Chunk ready: 60ms  // (smaller values are socket emit)

// When summary updates:
📊 [class-summary-updated] Class summary updated: {insights, score, ...}
📝 [transcript-created] Transcript 1 received

// When new MCQ:
MCQ broadcasted: {id, prompt, mcqs}
```

### Server Console

```bash
# Every 60 seconds (audio chunk processed):
🎙️ [Transcription] Audio chunk received from socket_abc in room DEMO
📝 [Transcription] Summary generated
💾 [Transcription] Transcript stored (total: 1)
📊 [Transcription] Class summary updated

# When generating from summary:
🤔 [Question] Generating question from class summary in room DEMO
✅ [Question] MCQ generated from summary and stored

# When using custom prompt:
📝 [DEMO] Instructor requesting MCQ generation
📝 Prompt received: "Generate 2 questions..."
✅ [DEMO] MCQs broadcasted successfully: 2 questions
```

---

## 📱 Manual Test Commands (Browser Console)

```javascript
// Check if AudioRecorder initialized:
console.log(audioRecorderRef.current)  // Should show AudioRecorder object

// Manually trigger summary update:
socket.emit('get-class-analysis', { roomId: 'ABCD1234' })
// Listen: socket.on('class-analysis-received', console.log)

// Manually emit audio chunk (for testing):
socket.emit('audio-chunk-recorded', {
  roomId: 'ABCD1234',
  audioBase64: 'test123',
  duration: 60,
  mimeType: 'audio/webm',
  timestamp: new Date()
})
```

---

## ⏱️ Expected Timing

| Event | When |
|-------|------|
| Instructor joins | Immediate |
| AudioRecorder initializes | Within 2s of join |
| First audio chunk ready | +60s after join |
| Transcription processed | +65s after join (5s processing time) |
| Summary shows in UI | +65s after join |
| Can click "Generate Question" | +65s after join |
| New MCQ appears | +67s after join (2s generation time) |

---

## 🎬 Live Demo Flow (3 minutes)

**Timeline:**
- **0:00** - Instructor joins
- **0:02** - Audio recording starts (see logs)
- **1:00** - First audio chunk captured
- **1:05** - Transcription + summary ready in UI
- **1:07** - Instructor clicks "Generate Question"
- **1:09** - MCQs appear on screen
- **2:00** - Second audio chunk captured
- **2:05** - Updated summary (2 transcripts now)
- **2:07** - Click "Generate Question" again
- **2:09** - New MCQs based on updated summary

---

## 🔧 If Nothing Shows Up

**Step 1: Check Backend Logs**
```bash
# Terminal with server.js running should show:
✅ Server running on http://localhost:3000

# If not, kill and restart:
kill -9 $(lsof -t -i:3000)
cd /Users/ibrahimmir/03tailwindProps/server && npm run dev
```

**Step 2: Check Socket Connection**
```javascript
// In browser console:
socket.connected  // Should be TRUE
socket.id         // Should show socket ID (e.g., "abc123def456")
```

**Step 3: Check Frontend Code**
- Open `src/pages/MeetingRoom.jsx`
- Verify line ~220: Audio recorder initialization exists
- Verify line ~420: Event listeners for `class-summary-updated` exist

**Step 4: Check Network Tab**
- Open DevTools → Network → WS (WebSocket)
- Should see `socket.io` WebSocket connection
- Should see messages like `audio-chunk-recorded` every 60s

---

## ✅ Final Verification

After running the test:

- [ ] Backend running without errors
- [ ] Frontend loads at localhost:5174
- [ ] Can create and join meeting
- [ ] Instructor sees "Generate Question" panel
- [ ] After 60s, UI shows class insights
- [ ] Clicking button generates new MCQs
- [ ] Chat visible on instructor screen
- [ ] Console shows expected logs
- [ ] Custom prompt fallback works

**If all ✅: Implementation is successful!**

---

## 🐛 Debug Mode

Enable verbose logging:

```javascript
// In browser console, when on meeting page:
window.DEBUG = true;

// Then reload and watch for extra logs in:
// 1. Browser console (MeetingRoom.jsx logs)
// 2. Server console (server.js logs)
```

---

## 📸 Screenshots to Compare

### Expected UI - Waiting State
```
AI Question Generator
📍 Status: ⏹️ Audio recording not started
```

### Expected UI - Ready State (after 60s)
```
AI Question Generator
📍 Class Insights:
  • Today we discussed React hooks...
  • We covered state management...
  • Participants asked about performance...

[🎤 Generate Question]  <- CLICKABLE BUTTON

---
Or use custom prompt:
[Enter custom topic...] [Send]
```

### Expected UI - Active MCQ
```
Active Polls
Poll #1 - Generated from class summary
Question: What is a React hook?
○ Option 1
○ Option 2
○ Option 3
○ Option 4

1/2 participants responded
```

---

**Ready to Test? Start the servers and follow the scenario above! 🚀**
