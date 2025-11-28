# 🚀 QUICK START - Test the Complete Workflow

## Terminal 1: Start Backend Server
```bash
cd /Users/ibrahimmir/03tailwindProps/server
npm start
```

**Expected Output:**
```
Server listening on http://localhost:3000
```

---

## Terminal 2: Start Frontend Development Server
```bash
cd /Users/ibrahimmir/03tailwindProps
npm run dev
```

**Expected Output:**
```
VITE v7.1.12 ready in XXX ms
➜  Local:   http://localhost:5175
```

---

## Test Scenario 1: Create & Join Meeting

### Step 1: Open Home Page
- Browser Tab 1: http://localhost:5175

### Step 2: Create Meeting (Instructor)
```
1. Click "Create Meeting" (Blue Indigo Card)
2. See alert: "Meeting Created! Room Code: XXXXXX"
3. Copy the room code
4. Auto-navigates to Instructor Dashboard
5. Should see:
   ✅ "👨‍🏫 Instructor - Room: XXXXXX" in header
   ✅ Your Video feed (left)
   ✅ MCQ Generation prompt bar (top-right)
   ✅ Sentiment Analytics chart (middle-right)
   ✅ Participants list (bottom-right, showing only you)
   ✅ MCQ Sessions list (empty, bottom-right)
```

### Step 3: Join Meeting (Participant)
```
1. Open new Browser Tab 2: http://localhost:5175
2. Click "Join Meeting" (Green Card)
3. Enter room code from Step 2
4. Click "Join Meeting" button
5. Should see:
   ✅ "👥 Participant - Room: XXXXXX" in header
   ✅ Your Video feed (left)
   ✅ Sentiment Panel with 3 buttons (top-right):
      🟢 Good
      🟡 Neutral
      🔴 Bad
   ✅ Participants List (bottom-right):
      - Your name
      - Instructor name (marked as Instructor)
```

### Step 4: Verify Real-Time Connection
```
Participant: Click "Good" button
Expected Behavior:
  ✅ Button highlights/shows selection
  ✅ Socket.IO sends event to server
  ✅ Switch to Tab 1 (Instructor)
  ✅ Participant list updates with "Good" badge
  ✅ Sentiment chart updates (good count increases)
```

---

## Test Scenario 2: Sentiment Polling

### Testing Different Sentiments

**Participant Changes Sentiment:**
```
1. Tab 2: Click "Neutral" button
2. Tab 1 (Instructor):
   ✅ Participant's sentiment badge changes to Yellow
   ✅ Sentiment chart updates (neutral increases, good decreases)

3. Tab 2: Click "Bad" button  
4. Tab 1 (Instructor):
   ✅ Participant's sentiment badge changes to Red
   ✅ Sentiment chart updates (bad increases, neutral decreases)
```

---

## Test Scenario 3: MCQ Generation

### Instructor Generates MCQs

```
Tab 1 (Instructor):
1. See input: "E.g., 10 MCQs on Python..."
2. Type: "5 MCQs on React Hooks"
3. Click Send button (paper plane icon)
4. Button shows loading spinner briefly

Expected: Both tabs should see MCQ Modal
✅ Tab 1: MCQ modal appears
✅ Tab 2: MCQ modal appears simultaneously

MCQ Modal Shows:
  - Question
  - 4 Multiple choice options
  - Progress counter "Question 1 of 5"
```

### Participant Answers MCQs

```
Tab 2 (Participant):
1. See MCQ modal with first question
2. Click one of the 4 options
3. Answer auto-submits to server
4. Modal closes (or shows next question)

Tab 1 (Instructor):
5. Should see "Analytics" panel appear
6. Shows response data for the MCQ session:
   ✅ Question texts
   ✅ Response distribution for each question
   ✅ Accuracy metrics
```

### View MCQ History

```
Tab 1 (Instructor):
1. After generating MCQs, see "MCQ Sessions" list (bottom-right)
2. Shows: "Session 1" with prompt text
3. Click on session
4. Analytics panel updates to show that session's data
5. Can toggle between different MCQ sessions
```

---

## Test Scenario 4: Multiple Participants

### Add Second Participant

```
1. Open Browser Tab 3 (or Incognito Tab): http://localhost:5175
2. Click "Join Meeting"
3. Enter same room code
4. Click "Join"

Expected:
✅ Tab 1 (Instructor): Participant count increases (1 → 2)
✅ Tab 1: New participant appears in list
✅ Tab 2: New participant appears in participant list
✅ Tab 3: Sees all participants (instructor + others)

Real-time Updates:
4. Tab 3: Click "Good" button
5. Tab 1: Sentiment chart updates (good: 1 → 2)
6. Tab 1: New participant badge shows "Good"
7. Tab 2: Sees new participant with "Good" badge
```

---

## 📊 Verification Checklist

### ✅ Instructor Dashboard (Tab 1)
- [ ] Header shows "👨‍🏫 Instructor"
- [ ] Room ID displayed
- [ ] Your name displayed
- [ ] Video feed works
- [ ] MCQ Generation prompt bar visible
- [ ] Sentiment chart visible (starts empty/zero)
- [ ] Participants list shows connected users
- [ ] User sentiment badges update in real-time
- [ ] MCQ Sessions list (empty until generated)

### ✅ Participant Interface (Tab 2+)
- [ ] Header shows "👥 Participant"
- [ ] Room ID displayed
- [ ] Your name displayed
- [ ] Video feed works
- [ ] Sentiment Panel visible with 3 buttons (Good/Neutral/Bad)
- [ ] Participants list shows all connected users
- [ ] Participants list shows instructor designation
- [ ] Sentiment badges update when you click buttons
- [ ] Can see other participants' sentiments

### ✅ Real-Time Communication
- [ ] Participants see sentiment updates instantly
- [ ] Instructor sees participant sentiment updates instantly
- [ ] New participant joins → all see them immediately
- [ ] Participant disconnects → all see them leave
- [ ] MCQ modal appears on all screens simultaneously

### ✅ Browser Console (F12)
- [ ] No red errors
- [ ] Socket.IO connection established: "Socket connected: {id}"
- [ ] See Socket.IO events in Network tab
- [ ] WebSocket connection active (not failing)

---

## 🔍 Troubleshooting

### Issue: Can't see participant sentiment on instructor dashboard
**Solution:**
1. Check browser console (F12) for errors
2. Verify participant clicked a sentiment button
3. Check Socket.IO connection in Network tab (WebSocket)
4. Restart server if connection lost

### Issue: MCQ modal doesn't appear
**Solution:**
1. Verify backend is running on http://localhost:3000
2. Check browser console for Socket.IO errors
3. Instructor prompt must not be empty
4. Try clicking "Generate" again

### Issue: Video doesn't show
**Solution:**
1. Allow camera/microphone permissions when asked
2. Check browser console for getUserMedia errors
3. Ensure camera is not in use by other applications
4. Refresh page and try again

### Issue: Participant can't join with room code
**Solution:**
1. Verify room code is correct (case-sensitive)
2. Check server console for "join-room" event
3. Verify instructor is in the room first
4. Check network connection (ping localhost:3000)

### Issue: Build fails
**Solution:**
```bash
# Clear node_modules and rebuild
rm -rf node_modules
npm install
npm run build
```

---

## 📞 Key Commands

```bash
# Build frontend
npm run build

# Start frontend dev server  
npm run dev

# Start backend
cd server && npm start

# Check if services are running
curl http://localhost:3000  # Should get HTML response
curl http://localhost:5175  # Should get Vite response

# View backend logs
tail -f server/server.log
```

---

## 🎯 Success Criteria

**You've successfully tested the workflow when:**

1. ✅ Instructor can create meeting and see room code
2. ✅ Participant can join using room code
3. ✅ Participant sees 3 sentiment buttons throughout session
4. ✅ Clicking sentiment button → instant update on instructor dashboard
5. ✅ Instructor can generate MCQs from prompt bar
6. ✅ MCQ modal appears on participant screen
7. ✅ Participant answers → instructor sees analytics
8. ✅ Multiple participants → all see each other's sentiment in real-time
9. ✅ No build errors or console errors
10. ✅ Video feeds work for both instructor and participant

---

**If all checks pass: 🎉 YOUR IMPLEMENTATION IS COMPLETE AND WORKING!**

