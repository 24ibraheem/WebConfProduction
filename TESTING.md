# Testing Guide

## Manual Testing Checklist

### 1. Participant Workflow

#### Setup
- [ ] Start backend: `cd server && npm run dev`
- [ ] Start frontend: `npm run dev` (new terminal)
- [ ] Open http://localhost:5173 in browser 1 (participant 1)
- [ ] Open http://localhost:5173 in browser 2 (participant 2)

#### Create & Join Meeting
- [ ] Click "Start Meeting" → Copy meeting ID
- [ ] In browser 1: Meeting ID should appear in URL
- [ ] In browser 2: Paste meeting ID and click "Join"
- [ ] Both should see "Join Room" button

#### Camera/Microphone
- [ ] Click "Join Room" → Allow permissions
- [ ] Video feed should appear in your local area
- [ ] Verify no console errors

#### Sentiment Polling
- [ ] In browser 1: Click "Good" sentiment button
  - [ ] Button highlights in green
  - [ ] "✓ Feedback submitted" message appears
- [ ] In browser 2: Should see participant 1 listed with "Good" status
- [ ] Click "Neutral" → Button highlights yellow
- [ ] Click "Bad" → Button highlights red
- [ ] Verify participant list updates correctly

#### Participant List
- [ ] Browser 1 shows browser 2 participant
- [ ] Browser 2 shows browser 1 participant
- [ ] Names display correctly
- [ ] Sentiment status shown for each participant

### 2. Admin Workflow

#### Admin Login
- [ ] Open http://localhost:5173/admin
- [ ] Enter credentials: `admin` / `admin123`
- [ ] Click "Login"
- [ ] Should redirect to `/admin/dashboard`

#### Join Meeting as Admin
- [ ] At admin dashboard, enter a meeting ID
- [ ] Click "Join as Admin"
- [ ] Should show "Start Admin Session" completed
- [ ] Sentiment chart appears (empty initially)
- [ ] Participants list appears (empty initially)

#### Real-time Sentiment Tracking
- [ ] Have 2-3 participants vote with different sentiments
- [ ] Admin should see:
  - [ ] Doughnut chart updates in real-time
  - [ ] Count increases for each sentiment type
  - [ ] Three colored boxes showing: Good, Neutral, Bad counts
  - [ ] Total responses count updates

#### MCQ Generation
- [ ] Enter prompt: "Generate 3 easy MCQs on Python lists"
- [ ] Click "Generate"
  - [ ] Button shows "Generating..."
  - [ ] Button is disabled
  - [ ] After 2 seconds, returns to normal
- [ ] MCQ should appear in "MCQ Sessions" list
- [ ] All participants should see MCQ modal popup

#### MCQ Answering (Participant Side)
- [ ] Participant sees modal with title of prompt
- [ ] 3 questions should display (or configured amount)
- [ ] Each question has multiple choice options
- [ ] Clicking option:
  - [ ] Selected option highlights in indigo
  - [ ] "✓ Answer submitted" appears
  - [ ] Counter at bottom increases
  - [ ] Moves to next question automatically (or on click)
- [ ] Can change answers by clicking different option
- [ ] All participants should see same questions

#### MCQ Analytics (Admin Side)
- [ ] Click MCQ session in admin dashboard
- [ ] Should show detailed analytics:
  - [ ] Total participants count
  - [ ] Total responses count
  - [ ] Average accuracy percentage
- [ ] For each question:
  - [ ] Question text displays
  - [ ] Correct answer highlighted in green
  - [ ] Response distribution shown as bars
  - [ ] Percentage of correct vs incorrect
  - [ ] Count for each option

### 3. Real-time Synchronization

#### Test Setup
- [ ] Open 4 browser windows: Admin + 3 Participants
- [ ] All join same meeting

#### Sentiment Sync
- [ ] Each participant votes different sentiment
- [ ] [ ] Admin chart updates instantly (no page refresh needed)
- [ ] All participants see each other's sentiment status
- [ ] Admin sees all sentiments in pie chart immediately

#### MCQ Sync
- [ ] Admin generates MCQ
- [ ] All 3 participants should see modal within 1 second
- [ ] Different participants answer different options
- [ ] Admin sees response count increasing in real-time
- [ ] Click on MCQ session → Analytics updates as responses come in

### 4. Edge Cases

#### Disconnection
- [ ] Close browser window (participant)
  - [ ] Admin dashboard updates participant list
  - [ ] Remaining participants see updated list
- [ ] Restart server while connected
  - [ ] Participants get disconnected
  - [ ] Manual reconnect required

#### No Gemini API Key
- [ ] Don't set `GEMINI_API_KEY` in `.env`
- [ ] Try to generate MCQ
- [ ] Should use mock MCQs and still work
- [ ] Check server console for fallback message

#### Empty Values
- [ ] Admin: Try generating MCQ with empty prompt
  - [ ] Should show error: "Enter a prompt..."
- [ ] Participant: Try joining without name
  - [ ] Default name should be used

#### Multiple MCQ Sessions
- [ ] Generate 3 different MCQs
- [ ] All should appear in MCQ Sessions list
- [ ] Click each one to view different analytics
- [ ] Participants should only see the latest MCQ
- [ ] (Or see all if you modify modal handling)

### 5. Performance Testing

#### Load Testing
- [ ] Open 10+ browser tabs (participant instances)
- [ ] All join same meeting
- [ ] Check sentiment updates still work smoothly
- [ ] Generate MCQ with all connected
- [ ] All should receive MCQ instantly
- [ ] Admin analytics should load without lag

#### Network Latency
- [ ] Use Chrome DevTools → Throttle network (Slow 3G)
- [ ] Perform sentiment voting
- [ ] Verify still works (may be slower)
- [ ] Submit MCQ answers
- [ ] Verify eventual consistency

### 6. Browser Compatibility

Test on:
- [ ] Chrome/Chromium (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Edge (Latest)

For each browser:
- [ ] Camera/microphone works
- [ ] Sentiment buttons functional
- [ ] Charts render correctly
- [ ] MCQ modal displays properly

### 7. UI/UX Testing

#### Visual Verification
- [ ] Tailwind CSS styling applied correctly
- [ ] Colors match design (indigo, green, red, yellow)
- [ ] Responsive on mobile (test with DevTools)
- [ ] Icons from lucide-react display properly
- [ ] Charts from Chart.js/Recharts render correctly

#### Accessibility
- [ ] Tab navigation works through all buttons
- [ ] Labels descriptive for screen readers
- [ ] Sufficient color contrast
- [ ] Focus states visible

## Automated Test Examples

```javascript
// Example Jest test for sentiment submission
describe('Sentiment Panel', () => {
  it('should submit sentiment when button clicked', () => {
    const mockSocket = { emit: jest.fn() };
    render(
      <SentimentPanel 
        socket={mockSocket} 
        roomId="TEST123" 
        currentSentiment={null}
      />
    );
    
    const goodButton = screen.getByText('Good');
    fireEvent.click(goodButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'submit-sentiment',
      { roomId: 'TEST123', sentiment: 'good' }
    );
  });
});
```

## Performance Benchmarks

Target metrics:
- Sentiment update latency: < 500ms
- MCQ broadcast latency: < 1s
- Chart rendering: < 200ms
- Response count update: < 300ms

## Troubleshooting Common Test Issues

### MCQs not displaying
1. Check if backend returned MCQ data
2. Verify Socket.IO connection is established
3. Check browser console for errors
4. Verify Gemini API key if not using mock

### Sentiment not syncing
1. Verify Socket.IO namespace matches
2. Check if `sentiment-updated` event fires
3. Confirm room ID matches across clients
4. Check for CORS issues in console

### Analytics shows 0 responses
1. Ensure participants actually clicked answers
2. Check if `submit-mcq-response` events received
3. Verify MCQ session ID matches
4. Check server logs for event processing

### Styling broken
1. Verify Tailwind CSS is loaded
2. Check if Tailwind config matches
3. Ensure lucide-react icons installed
4. Check for CSS conflicts

## Load Testing Script (Node.js)

```javascript
// test-load.js
const io = require('socket.io-client');

const ROOM_ID = 'LOADTEST';
const NUM_CLIENTS = 50;

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io('http://localhost:3000');
  
  socket.emit('join-room', {
    roomId: ROOM_ID,
    displayName: `Bot-${i}`,
    isAdmin: false
  });
  
  setInterval(() => {
    const sentiment = ['good', 'neutral', 'negative'][Math.floor(Math.random() * 3)];
    socket.emit('submit-sentiment', { roomId: ROOM_ID, sentiment });
  }, Math.random() * 10000 + 5000);
}

console.log(`Started ${NUM_CLIENTS} test clients`);
```

Run with: `node test-load.js`
