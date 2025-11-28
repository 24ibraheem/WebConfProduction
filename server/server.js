import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { transcribeAudioChunk, generateClassSummary } from './utils/aiService.js';
import { connectDB, disconnectDB } from './config/db.js';
import { User, Meeting, Transcript, ClassSummary, MCQ, Analytics } from './models/schemas.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// ============ In-Memory Data Store ============
const meetings = new Map();
const rooms = new Map();

// ============ API Routes ============

// Create a new meeting
app.post('/api/create-meeting', async (req, res) => {
  const meetingId = uuidv4().slice(0, 8).toUpperCase();
  console.log(`📅 [Meeting] Creating new meeting: ${meetingId}`);
  
  // In-memory storage
  meetings.set(meetingId, {
    id: meetingId,
    createdAt: new Date(),
    admin: null,
    participants: [],
    sentiment: { good: 0, neutral: 0, negative: 0 },
    mcqs: [],
    responses: new Map(),
    transcripts: [],
    classSummary: {
      totalTranscripts: 0,
      keyTopics: [],
      averageSentiment: 'neutral',
      engagementScore: 0,
      mainInsights: []
    }
  });
  console.log(`✅ [Meeting] Meeting stored in memory`);

  // Save to MongoDB if connected
  try {
    const newMeeting = new Meeting({
      meetingId,
      title: 'Class Session',
      status: 'active',
      participants: []
    });
    const savedMeeting = await newMeeting.save();
    console.log(`💾 [DB] Meeting ${meetingId} saved to database with ID: ${savedMeeting._id}`);
  } catch (dbError) {
    console.error(`❌ [DB] Failed to save meeting:`, dbError.message);
  }

  res.json({ meetingId });
});

// Admin Login (simplified - in production, use proper authentication)
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ token: 'admin-token', role: 'admin' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get meeting state
app.get('/api/meeting/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings.get(meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  res.json(meeting);
});

// Get meeting history from database
app.get('/api/meeting-history', async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate('instructorId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const meetingsWithAnalytics = await Promise.all(
      meetings.map(async (m) => {
        const transcripts = await Transcript.countDocuments({ meetingId: m._id });
        const summary = await ClassSummary.findOne({ meetingId: m._id });
        return {
          ...m.toObject(),
          transcriptCount: transcripts,
          summary: summary
        };
      })
    );
    
    res.json(meetingsWithAnalytics);
  } catch (error) {
    console.error('Error fetching meeting history:', error);
    res.status(500).json({ error: 'Failed to fetch meeting history' });
  }
});

// Get detailed analytics for a meeting
app.get('/api/meeting-analytics/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const dbMeeting = await Meeting.findOne({ meetingId });
    
    if (!dbMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const [transcripts, summary, mcqs, analytics] = await Promise.all([
      Transcript.find({ meetingId: dbMeeting._id }),
      ClassSummary.findOne({ meetingId: dbMeeting._id }),
      MCQ.find({ meetingId: dbMeeting._id }),
      Analytics.find({ meetingId: dbMeeting._id }).populate('userId', 'firstName lastName email')
    ]);

    res.json({
      meeting: dbMeeting,
      transcripts,
      summary,
      mcqs,
      analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ============ Socket.IO Events ============

io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // Request to join (Waiting Room Logic)
  socket.on('request-to-join', ({ roomId, displayName }) => {
    const meeting = meetings.get(roomId);
    
    // If meeting exists and has an admin, ask for approval
    if (meeting && meeting.admin) {
      console.log(`✋ [REQUEST] ${displayName} (${socket.id}) requesting to join ${roomId}`);
      io.to(meeting.admin.id).emit('participant-request', {
        socketId: socket.id,
        displayName
      });
    } else {
      // If no meeting or no admin, auto-approve (or handle as needed)
      // This allows joining if the instructor hasn't arrived yet, or if it's a new room
      console.log(`✅ [AUTO-APPROVE] ${displayName} (${socket.id}) approved for ${roomId} (no admin/meeting)`);
      socket.emit('participant-approved');
    }
  });

  // Approve participant
  socket.on('approve-participant', ({ roomId, socketId }) => {
    console.log(`✅ [APPROVE] Admin approved ${socketId} for room ${roomId}`);
    io.to(socketId).emit('participant-approved');
  });

  // Deny participant
  socket.on('deny-participant', ({ roomId, socketId }) => {
    console.log(`❌ [DENY] Admin denied ${socketId} for room ${roomId}`);
    io.to(socketId).emit('participant-denied');
  });

  // Join a room
  socket.on('join-room', ({ roomId, displayName, isAdmin }) => {
    console.log(`👤 [JOIN] Socket ${socket.id.substring(0, 8)} joining room ${roomId} as ${displayName} (admin: ${isAdmin})`);
    
    socket.join(roomId);
    console.log(`📍 [JOIN] Socket ${socket.id.substring(0, 8)} joined room ${roomId}`);

    let meeting = meetings.get(roomId);
    
    // If meeting doesn't exist and it's not an instructor creating it, check if it was created via API
    if (!meeting) {
      console.log(`[JOIN] Creating new meeting ${roomId}`);
      meeting = {
        id: roomId,
        admin: null,
        participants: [],
        sentiment: { good: 0, neutral: 0, negative: 0 },
        mcqs: [],
        responses: new Map(),
        transcripts: [],
        classSummary: {
          totalTranscripts: 0,
          keyTopics: [],
          averageSentiment: 'neutral',
          engagementScore: 0,
          mainInsights: []
        }
      };
    }

    const participant = {
      id: socket.id,
      displayName,
      isAdmin,
      joinedAt: new Date(),
      sentiment: null
    };

    if (isAdmin) {
      meeting.admin = participant;
    }
    meeting.participants.push(participant);
    meetings.set(roomId, meeting);

    console.log(`✅ [${roomId}] Total participants: ${meeting.participants.length}`);
    console.log(`📋 [${roomId}] Participants:`, meeting.participants.map(p => `${p.displayName} (${p.id.substring(0, 8)}...)`));

    // Notify everyone of the participant list
    console.log(`📤 [${roomId}] Broadcasting room-state to all in room...`);
    io.to(roomId).emit('room-state', {
      participants: meeting.participants,
      sentiment: meeting.sentiment
    });

    console.log(`✅ [${roomId}] Broadcasted room-state to room`);
  });

  // Update participant name
  socket.on('update-name', ({ roomId, newName }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const participant = meeting.participants.find((p) => p.id === socket.id);
    if (!participant) return;

    const oldName = participant.displayName;
    participant.displayName = newName;

    // Broadcast updated participant list
    io.to(roomId).emit('room-state', {
      participants: meeting.participants,
      sentiment: meeting.sentiment
    });

    console.log(`[${roomId}] ${oldName} changed name to ${newName}`);
  });

  // Submit sentiment feedback
  socket.on('submit-sentiment', ({ roomId, sentiment }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const participant = meeting.participants.find((p) => p.id === socket.id);
    if (!participant) return;

    // Update participant sentiment
    participant.sentiment = sentiment;

    // Recalculate sentiment distribution
    meeting.sentiment = { good: 0, neutral: 0, negative: 0 };
    meeting.participants.forEach((p) => {
      if (p.sentiment) {
        meeting.sentiment[p.sentiment]++;
      }
    });

    // Broadcast updated sentiment and full room state
    io.to(roomId).emit('sentiment-updated', {
      participantId: socket.id,
      sentiment,
      distribution: meeting.sentiment
    });

    // Also broadcast full room state to update participant sentiments
    io.to(roomId).emit('room-state', {
      participants: meeting.participants,
      sentiment: meeting.sentiment
    });

    console.log(`[${roomId}] Sentiment update: ${socket.id} -> ${sentiment}`, meeting.sentiment);
  });

  // Remove user (instructor only)
  socket.on('remove-user', ({ roomId, participantId }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const requester = meeting.participants.find((p) => p.id === socket.id);
    if (!requester?.isAdmin) {
      socket.emit('error', { message: 'Only instructors can remove users' });
      return;
    }

    // Find and remove the participant
    const participantIndex = meeting.participants.findIndex((p) => p.id === participantId);
    if (participantIndex === -1) return;

    const removedParticipant = meeting.participants[participantIndex];
    meeting.participants.splice(participantIndex, 1);

    // Recalculate sentiment if user had one
    if (removedParticipant.sentiment) {
      meeting.sentiment[removedParticipant.sentiment]--;
    }

    // Notify the removed user
    io.to(participantId).emit('user-removed');

    // Broadcast updated room state
    io.to(roomId).emit('room-state', {
      participants: meeting.participants,
      sentiment: meeting.sentiment
    });

    console.log(`[${roomId}] ${removedParticipant.displayName} was removed by instructor`);
  });

  // Mute user (instructor only)
  socket.on('mute-user', ({ roomId, participantId }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const requester = meeting.participants.find((p) => p.id === socket.id);
    if (!requester?.isAdmin) {
      socket.emit('error', { message: 'Only instructors can mute users' });
      return;
    }

    // Notify the user to mute themselves
    io.to(participantId).emit('force-mute');

    console.log(`[${roomId}] Instructor muted participant ${participantId}`);
  });

  // ============ WebRTC Signaling Handlers ============
  
  // Relay WebRTC offer from one peer to another
  socket.on('offer', ({ roomId, to, from, offer }) => {
    console.log(`📡 [WebRTC] Relaying offer from ${from.substring(0, 8)} to ${to.substring(0, 8)} in room ${roomId}`);
    io.to(to).emit('offer', { from, offer });
  });

  // Relay WebRTC answer from one peer to another
  socket.on('answer', ({ roomId, to, from, answer }) => {
    console.log(`📡 [WebRTC] Relaying answer from ${from.substring(0, 8)} to ${to.substring(0, 8)} in room ${roomId}`);
    io.to(to).emit('answer', { from, answer });
  });

  // Relay ICE candidate from one peer to another
  socket.on('ice-candidate', ({ roomId, to, from, candidate }) => {
    console.log(`❄️ [WebRTC] Relaying ICE candidate from ${from.substring(0, 8)} to ${to.substring(0, 8)} in room ${roomId}`);
    io.to(to).emit('ice-candidate', { from, candidate });
  });

  // ============ MCQ Generation ============

  // Generate MCQs (admin only)
  socket.on('generate-mcq', async ({ roomId, prompt, topic, difficulty }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const participant = meeting.participants.find((p) => p.id === socket.id);
    if (!participant?.isAdmin) {
      socket.emit('error', { message: 'Only admins can generate MCQs' });
      return;
    }

    try {
      // Handle both old 'prompt' and new 'topic/difficulty' formats
      const actualTopic = topic || prompt;
      const actualDifficulty = difficulty || 'Medium';

      console.log(`\n📝 [${roomId}] Instructor requesting MCQ generation`);
      console.log(`📝 Topic: "${actualTopic}", Difficulty: ${actualDifficulty}`);

      // Generate MCQs using Gemini API
      const mcqs = await generateMCQs(actualTopic, actualDifficulty, 5);

      const mcqSession = {
        id: uuidv4(),
        prompt: `${actualTopic} (${actualDifficulty})`,
        mcqs,
        createdAt: new Date(),
        responses: new Map()
      };

      meeting.mcqs.push(mcqSession);

      // Broadcast MCQs to all participants
      io.to(roomId).emit('mcq-broadcast', mcqSession);
      console.log(`✅ [${roomId}] MCQs broadcasted successfully: ${mcqs.length} questions`);
      console.log(`✅ Session ID: ${mcqSession.id}\n`);
    } catch (error) {
      console.error('❌ [MCQ Generation Error]', error.message);
      console.error('❌ Stack:', error.stack);
      socket.emit('error', { message: 'Failed to generate MCQs: ' + error.message });
    }
  });

  // Submit MCQ response
  socket.on('submit-mcq-response', ({ roomId, mcqSessionId, questionIndex, answer }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const mcqSession = meeting.mcqs.find((m) => m.id === mcqSessionId);
    if (!mcqSession) return;

    if (!mcqSession.responses.has(socket.id)) {
      mcqSession.responses.set(socket.id, {});
    }

    const userResponses = mcqSession.responses.get(socket.id);
    userResponses[questionIndex] = answer;

    // Broadcast updated response count to admin
    const totalResponses = mcqSession.responses.size;
    io.to(roomId).emit('mcq-response-update', {
      mcqSessionId,
      totalResponses,
      totalParticipants: meeting.participants.length - 1 // Exclude admin
    });

    console.log(`[${roomId}] Response recorded for question ${questionIndex}`);
  });

  // ============ Audio Transcription & Summarization ============

  // Handle text chunks from Web Speech API
  socket.on('send-transcript-chunk', async ({ roomId, text, speaker }) => {
    console.log(`📝 [Transcript] Received text chunk for room ${roomId}: "${text.substring(0, 50)}..."`);
    try {
      const meeting = meetings.get(roomId);
      if (!meeting) return;

      const transcriptEntry = {
        text,
        timestamp: new Date(),
        speaker: speaker || 'Instructor'
      };
      meeting.transcripts.push(transcriptEntry);

      // Emit to admin/room
      io.to(roomId).emit('transcript-created', {
        transcript: transcriptEntry,
        totalTranscripts: meeting.transcripts.length
      });

      // Save to DB
      try {
        const dbMeeting = await Meeting.findOne({ meetingId: roomId });
        if (dbMeeting) {
          await new Transcript({
            meetingId: dbMeeting._id,
            rawText: text,
            timestamp: new Date(),
            mimeType: 'text/plain'
          }).save();
        }
      } catch (err) {
        console.error('Error saving transcript:', err);
      }
    } catch (error) {
      console.error('Error processing transcript chunk:', error);
    }
  });

  socket.on('audio-chunk-recorded', async ({ roomId, audioBase64, mimeType }) => {
    console.log(`🎤 [Audio] Received chunk for room ${roomId} (${audioBase64?.length || 0} bytes)`);
    try {
      const meeting = meetings.get(roomId);
      if (!meeting) {
        console.warn(`⚠️ [Audio] Meeting ${roomId} not found in memory`);
        return;
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(audioBase64, 'base64');
      
      // Transcribe
      console.log(`⏳ [Transcript] Processing ${buffer.length} bytes...`);
      const text = await transcribeAudioChunk(buffer, mimeType);
      
      if (text && text.trim().length > 0) {
        console.log(`📝 [Transcript] Success: "${text.substring(0, 50)}..."`);
        
        // Store in memory
        const transcriptEntry = {
          text,
          timestamp: new Date(),
          speaker: 'Instructor' 
        };
        meeting.transcripts.push(transcriptEntry);
        
        // Emit to admin/room
        io.to(roomId).emit('transcript-created', { 
          transcript: transcriptEntry, 
          totalTranscripts: meeting.transcripts.length 
        });

        // Save to DB
        try {
          const dbMeeting = await Meeting.findOne({ meetingId: roomId });
          if (dbMeeting) {
            await new Transcript({
              meetingId: dbMeeting._id,
              rawText: text,
              timestamp: new Date(),
              mimeType
            }).save();
          }
        } catch (err) {
          console.error('Error saving transcript:', err);
        }
      } else {
        console.log(`⚠️ [Transcript] Empty or silent audio chunk`);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  });

  socket.on('end-meeting', async ({ roomId }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    console.log(`🛑 [Meeting] Ending meeting ${roomId}`);
    
    // Generate Summary
    const transcriptTexts = meeting.transcripts.map(t => t.text);
    if (transcriptTexts.length > 0) {
      console.log(`📊 [Summary] Generating summary for ${transcriptTexts.length} transcripts...`);
      const summaryData = await generateClassSummary(transcriptTexts);
      
      if (summaryData) {
        meeting.classSummary = { ...meeting.classSummary, ...summaryData };
        
        // Save summary to DB
        try {
          const dbMeeting = await Meeting.findOne({ meetingId: roomId });
          if (dbMeeting) {
            await new ClassSummary({
              meetingId: dbMeeting._id,
              totalTranscripts: transcriptTexts.length,
              keyTopics: summaryData.keyTopics,
              mainInsights: summaryData.mainInsights,
              averageSentiment: summaryData.averageSentiment,
              engagementScore: summaryData.engagementScore
            }).save();
            
            // Update meeting status
            dbMeeting.status = 'completed';
            dbMeeting.endTime = new Date();
            await dbMeeting.save();
          }
        } catch (err) {
          console.error('Error saving summary:', err);
        }
      }
    }
    
    io.to(roomId).emit('meeting-ended', { summary: meeting.classSummary });
  });

  // Get MCQ analytics (admin)
  socket.on('get-mcq-analytics', ({ roomId, mcqSessionId }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) return;

    const participant = meeting.participants.find((p) => p.id === socket.id);
    if (!participant?.isAdmin) return;

    const mcqSession = meeting.mcqs.find((m) => m.id === mcqSessionId);
    if (!mcqSession) return;

    const analytics = {
      mcqSessionId,
      totalParticipants: meeting.participants.length - 1,
      totalResponses: mcqSession.responses.size,
      questionAnalytics: mcqSession.mcqs.map((q, idx) => {
        const responses = {};
        mcqSession.responses.forEach((userResponses) => {
          const answer = userResponses[idx];
          responses[answer] = (responses[answer] || 0) + 1;
        });

        return {
          questionIndex: idx,
          question: q.question,
          correctAnswer: q.answer,
          responses,
          correctCount: Array.from(mcqSession.responses.values()).filter(
            (r) => r[idx] === q.answer
          ).length
        };
      })
    };

    socket.emit('mcq-analytics', analytics);
  });

  // Send message
  socket.on('send-message', ({ roomId, userId, userName, userRole, text }) => {
    const meeting = meetings.get(roomId);
    if (!meeting) {
      console.log(`❌ [send-message] Room ${roomId} not found`);
      return;
    }

    const messageId = uuidv4();
    const message = {
      id: messageId,
      userId,
      userName,
      userRole,
      text,
      timestamp: new Date(),
      reactions: {}
    };

    // Initialize messages array if it doesn't exist
    if (!meeting.messages) {
      meeting.messages = [];
    }
    meeting.messages.push(message);

    // Get all sockets in this room
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    const socketCount = socketsInRoom ? socketsInRoom.size : 0;
    
    // Broadcast message to all in room
    console.log(`📤 [send-message] Broadcasting to room ${roomId} (${socketCount} sockets): "${text.substring(0, 50)}..."`);
    io.to(roomId).emit('receive-message', message);
    console.log(`✅ [send-message] Message from ${userName} delivered to room ${roomId}`);
  });

  // React to message
  socket.on('react-to-message', ({ roomId, messageId, reactionType, userName, userId }) => {
    const meeting = meetings.get(roomId);
    if (!meeting || !meeting.messages) return;

    const message = meeting.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (!message.reactions[reactionType]) {
      message.reactions[reactionType] = [];
    }

    // Check if user already reacted with this reaction
    if (!message.reactions[reactionType].includes(userName)) {
      message.reactions[reactionType].push(userName);
    } else {
      // Remove reaction if already exists
      message.reactions[reactionType] = message.reactions[reactionType].filter((u) => u !== userName);
      if (message.reactions[reactionType].length === 0) {
        delete message.reactions[reactionType];
      }
    }

    // Broadcast updated message to all in room
    io.to(roomId).emit('message-reaction-updated', {
      messageId,
      reactions: message.reactions
    });
  });

  // ============ Audio Recording & Transcription Pipeline ============

  // Receive audio chunk from instructor and process it
  socket.on('audio-chunk-recorded', async ({ roomId, audioBase64, duration, mimeType, timestamp }) => {
    console.log(`🎙️ [Transcription] Audio chunk received from ${socket.id} in room ${roomId}`);
    const meeting = meetings.get(roomId);
    if (!meeting) {
      console.log(`❌ [Transcription] Room ${roomId} not found`);
      return;
    }

    try {
      // Transcribe audio (mock or real API based on utils implementation)
      console.log(`⏳ [Transcription] Starting transcription...`);
      
      // Convert base64 to buffer and use transcribeAudioChunk
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const transcriptText = await transcribeAudioChunk(audioBuffer, mimeType);
      
      console.log(`✅ [Transcription] Transcription complete: ${transcriptText.substring(0, 50)}...`);

      // Generate summary from transcript (Skipping for now as generateSummary is not defined)
      const summary = ""; // await generateSummary(transcriptText);
      // console.log(`📝 [Transcription] Summary generated`);

      // Create transcript object
      const transcript = {
        id: uuidv4(),
        timestamp,
        rawText: transcriptText,
        summary,
        duration,
        mimeType
      };

      // Store transcript in meeting
      if (!meeting.transcripts) meeting.transcripts = [];
      meeting.transcripts.push(transcript);
      console.log(`💾 [Transcription] Transcript stored (total: ${meeting.transcripts.length})`);

      // Save transcript to MongoDB
      try {
        const dbMeeting = await Meeting.findOne({ meetingId: roomId });
        if (dbMeeting) {
          const newTranscript = new Transcript({
            meetingId: dbMeeting._id,
            rawText: transcriptText,
            summary,
            duration,
            timestamp,
            mimeType
          });
          const savedTranscript = await newTranscript.save();
          console.log(`💾 [DB] Transcript saved to database with ID: ${savedTranscript._id}`);
        } else {
          console.warn(`⚠️ [DB] Meeting ${roomId} not found in database, skipping transcript save`);
        }
      } catch (dbError) {
        console.error(`❌ [DB] Failed to save transcript:`, dbError.message);
      }

      // Broadcast transcript to all participants in room
      io.to(roomId).emit('transcript-created', {
        transcript,
        totalTranscripts: meeting.transcripts.length
      });

      // Update class summary
      const classSummary = {
        totalTranscripts: meeting.transcripts.length,
        keyTopics: meeting.transcripts.map(t => t.summary).slice(-5), // Last 5 summaries
        averageSentiment: meeting.sentiment ? 
          (Object.entries(meeting.sentiment).reduce((acc, [k, v]) => acc + (v || 0), 0) / Object.values(meeting.sentiment).reduce((a, b) => a + b, 1)) : 
          'neutral',
        engagementScore: calculateEngagementScore(meeting.sentiment, meeting.transcripts.length),
        mainInsights: generateAnalysisInsights(meeting.transcripts, meeting.sentiment)
      };

      meeting.classSummary = classSummary;
      console.log(`📊 [Transcription] Class summary updated: ${classSummary.mainInsights.length} insights`);

      // Save class summary to MongoDB
      try {
        const dbMeeting = await Meeting.findOne({ meetingId: roomId });
        if (dbMeeting) {
          let classSummaryDoc = await ClassSummary.findOne({ meetingId: dbMeeting._id });
          if (classSummaryDoc) {
            // Update existing summary
            classSummaryDoc.totalTranscripts = classSummary.totalTranscripts;
            classSummaryDoc.keyTopics = classSummary.keyTopics;
            classSummaryDoc.averageSentiment = classSummary.averageSentiment;
            classSummaryDoc.engagementScore = classSummary.engagementScore;
            classSummaryDoc.mainInsights = classSummary.mainInsights;
            classSummaryDoc.sentiment = meeting.sentiment;
            classSummaryDoc.updatedAt = new Date();
            await classSummaryDoc.save();
            console.log(`💾 [DB] Class summary updated in database`);
          } else {
            // Create new summary
            const newSummary = new ClassSummary({
              meetingId: dbMeeting._id,
              ...classSummary,
              sentiment: meeting.sentiment
            });
            const savedSummary = await newSummary.save();
            console.log(`💾 [DB] Class summary saved to database with ID: ${savedSummary._id}`);
          }
        }
      } catch (dbError) {
        console.error(`❌ [DB] Failed to save class summary:`, dbError.message);
      }

      // Broadcast updated class summary to all participants
      io.to(roomId).emit('class-summary-updated', classSummary);

    } catch (error) {
      console.error(`❌ [Transcription] Error processing audio chunk:`, error);
      socket.emit('transcription-error', { message: 'Failed to process audio chunk' });
    }
  });

  // Request class analysis summary (typically from admin)
  socket.on('get-class-analysis', ({ roomId }) => {
    console.log(`📊 [Analysis] Class analysis requested for room ${roomId}`);
    const meeting = meetings.get(roomId);
    if (!meeting) {
      console.log(`❌ [Analysis] Room ${roomId} not found`);
      socket.emit('class-analysis-error', { message: 'Meeting not found' });
      return;
    }

    const analysis = {
      roomId,
      classSummary: meeting.classSummary || {
        totalTranscripts: 0,
        keyTopics: [],
        averageSentiment: 'neutral',
        engagementScore: 0,
        mainInsights: []
      },
      transcripts: meeting.transcripts || [],
      participants: meeting.participants || [],
      sentiment: meeting.sentiment || {},
      totalMCQs: meeting.mcqs ? meeting.mcqs.length : 0,
      totalResponses: meeting.responses ? meeting.responses.length : 0
    };

    console.log(`✅ [Analysis] Sending class analysis with ${analysis.transcripts.length} transcripts`);
    socket.emit('class-analysis-received', analysis);
  });

  // Generate question from class summary (replaces free-form prompt)
  socket.on('generate-from-summary', async ({ roomId }) => {
    console.log(`🤔 [Question] Generating question from class summary in room ${roomId}`);
    const meeting = meetings.get(roomId);
    if (!meeting) {
      console.log(`❌ [Question] Room ${roomId} not found`);
      socket.emit('question-generation-error', { message: 'Meeting not found' });
      return;
    }

    const participant = meeting.participants.find((p) => p.id === socket.id);
    if (!participant?.isAdmin) {
      socket.emit('error', { message: 'Only instructors can generate questions' });
      return;
    }

    if ((!meeting.classSummary || !meeting.classSummary.mainInsights || meeting.classSummary.mainInsights.length === 0) && (!meeting.transcripts || meeting.transcripts.length === 0)) {
      console.log(`⚠️ [Question] No insights or transcripts available for question generation`);
      socket.emit('question-generation-error', { message: 'No class content available yet. Please wait for initial transcription.' });
      return;
    }

    try {
      let prompt = '';
      
      if (meeting.classSummary && meeting.classSummary.mainInsights && meeting.classSummary.mainInsights.length > 0) {
        // Build context from summary and insights
        const summaryText = meeting.classSummary.mainInsights.join('. ');
        const engagementScore = meeting.classSummary.engagementScore;
        prompt = `Class discussion insights: "${summaryText}". Class engagement level: ${engagementScore}/100.`;
      } else {
        // Fallback to raw transcripts
        const recentTranscripts = meeting.transcripts.slice(-10).map(t => t.text).join(' ');
        prompt = `Recent class discussion: "${recentTranscripts}".`;
        console.log(`📝 [Question] Using raw transcripts for generation (fallback)`);
      }

      console.log(`📝 [Question] Prompt built, calling Gemini API...`);
      
      // Use existing MCQ generation function
      const mcqs = await generateMCQs(prompt, 'Medium', 3);

      const mcqSession = {
        id: uuidv4(),
        prompt: 'Generated from class summary',
        mcqs,
        createdAt: new Date(),
        responses: new Map(),
        generatedFromSummary: true
      };

      if (!meeting.mcqs) meeting.mcqs = [];
      meeting.mcqs.push(mcqSession);

      console.log(`✅ [Question] MCQ generated from summary and stored`);
      io.to(roomId).emit('mcq-broadcast', mcqSession);

    } catch (error) {
      console.error(`❌ [Question] Error generating question:`, error);
      socket.emit('question-generation-error', { message: 'Failed to generate question' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    // Remove participant from all rooms
    meetings.forEach((meeting, roomId) => {
      const idx = meeting.participants.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const removedParticipant = meeting.participants[idx];
        meeting.participants.splice(idx, 1);

        // Recalculate sentiment
        if (removedParticipant.sentiment) {
          meeting.sentiment[removedParticipant.sentiment]--;
        }

        io.to(roomId).emit('room-state', {
          participants: meeting.participants,
          sentiment: meeting.sentiment
        });
      }
    });
  });
});

// ============ Gemini MCQ Generation ============
async function generateMCQs(topic, difficulty = 'Medium', count = 5) {
  try {
    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not found. Using mock MCQs.');
      return generateMockMCQs(topic);
    }

    // Import Gemini API
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use gemini-pro (stable) without JSON mode since 1.5-flash is giving 404s
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro'
    });

    const requestedCount = count;
    
    console.log(`🔍 Topic: "${topic}"`);
    console.log(`🔍 Difficulty: "${difficulty}"`);
    console.log(`🔍 Number of questions requested: ${requestedCount}`);

    const systemPrompt = `You are an expert educational content generator.

TASK: Generate EXACTLY ${requestedCount} multiple-choice questions (MCQs) for a student assessment.

TOPIC: "${topic}"
DIFFICULTY LEVEL: ${difficulty}

OUTPUT FORMAT:
Return a raw JSON array of objects.

JSON STRUCTURE:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B",
    "explanation": "Brief explanation"
  }
]

REQUIREMENTS:
1. "answer" must be an EXACT STRING MATCH to one of the "options".
2. Provide 4 distinct options.
3. Ensure content is accurate and educational.
`;

    console.log(`📤 Sending request to Gemini API (model: gemini-1.5-flash, json mode)...`);

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Raw Gemini Response:', text.substring(0, 200) + '...');
    
    let mcqs;
    try {
      // Clean up potential markdown just in case, though json mode is usually clean
      const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      mcqs = JSON.parse(cleanText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', e);
      console.error('Raw text was:', text);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate MCQ structure
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error('Invalid MCQ format - not an array or empty');
    }
    
    // Validate each MCQ has required fields
    const validMcqs = mcqs.filter(mcq => 
      mcq.question && 
      Array.isArray(mcq.options) && 
      mcq.options.length >= 2 &&
      mcq.answer
    );
    
    if (validMcqs.length === 0) {
      throw new Error('No valid MCQs in response');
    }
    
    console.log(`✅ Generated ${validMcqs.length} valid questions from Gemini API`);
    
    // Check if we have enough questions
    if (validMcqs.length < requestedCount) {
      console.warn(`⚠️ Only ${validMcqs.length} questions generated, expected ${requestedCount}`);
    }
    
    // Return the requested number of questions (or all if less than requested)
    return validMcqs.slice(0, requestedCount);
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    console.warn('⚠️ Falling back to mock MCQs');
    // Return mock MCQs if API fails
    return generateMockMCQs(topic);
  }
}

function generateMockMCQs(prompt) {
  // Generate a unique identifier based on prompt and timestamp to ensure different questions
  const timestamp = Date.now();
  const promptHash = prompt.toLowerCase().substring(0, 20);
  
  console.log(`📝 Generating mock MCQs for prompt: "${prompt}"`);
  
  const topic = prompt.toLowerCase();
  
  // Pre-defined questions for common topics
  if (topic.includes('react')) {
    return [
      {
        question: "What is the primary purpose of React's useEffect hook?",
        options: ["To handle side effects in functional components", "To manage global state", "To create new components", "To optimize rendering speed"],
        answer: "To handle side effects in functional components",
        explanation: "useEffect is designed to handle side effects like data fetching, subscriptions, and DOM updates."
      },
      {
        question: "Which of the following is NOT a rule of Hooks?",
        options: ["Hooks can be called inside loops", "Hooks must be called at the top level", "Hooks must be called from React functions", "Hooks cannot be conditional"],
        answer: "Hooks can be called inside loops",
        explanation: "Hooks must always be called at the top level of your React function, not inside loops, conditions, or nested functions."
      },
      {
        question: "What is the virtual DOM in React?",
        options: ["A lightweight copy of the real DOM", "A direct reference to the browser DOM", "A database for React components", "A third-party library"],
        answer: "A lightweight copy of the real DOM",
        explanation: "The virtual DOM is a lightweight JavaScript representation of the DOM that React uses to optimize updates."
      },
      {
        question: "How do you pass data from a parent to a child component?",
        options: ["Using props", "Using state", "Using Redux", "Using local storage"],
        answer: "Using props",
        explanation: "Props (properties) are the standard way to pass data from parent to child components in React."
      },
      {
        question: "What is the purpose of the useState hook?",
        options: ["To add state to functional components", "To fetch data from an API", "To route between pages", "To style components"],
        answer: "To add state to functional components",
        explanation: "useState allows functional components to maintain and update their own internal state."
      }
    ];
  }
  
  if (topic.includes('javascript') || topic.includes('js')) {
    return [
      {
        question: "Which keyword is used to declare a constant variable in JavaScript?",
        options: ["const", "let", "var", "fixed"],
        answer: "const",
        explanation: "The 'const' keyword is used to declare variables that cannot be reassigned."
      },
      {
        question: "What is the output of '2' + 2 in JavaScript?",
        options: ["'22'", "4", "NaN", "Error"],
        answer: "'22'",
        explanation: "JavaScript performs string concatenation when the + operator is used with a string."
      },
      {
        question: "What is a closure in JavaScript?",
        options: ["A function bundled with its lexical environment", "A way to close a browser window", "A method to end a loop", "A database connection"],
        answer: "A function bundled with its lexical environment",
        explanation: "A closure gives you access to an outer function's scope from an inner function."
      },
      {
        question: "Which method is used to add an element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        answer: "push()",
        explanation: "The push() method adds one or more elements to the end of an array."
      },
      {
        question: "What does 'DOM' stand for?",
        options: ["Document Object Model", "Data Object Mode", "Document Oriented Module", "Digital Ordinance Model"],
        answer: "Document Object Model",
        explanation: "The DOM is a programming interface for web documents."
      }
    ];
  }

  // Generic fallback for other topics
  const titleCase = prompt.charAt(0).toUpperCase() + prompt.slice(1);
  return [
    {
      question: `What is the primary function of ${titleCase}?`,
      options: [
        `To facilitate core operations in its domain`,
        `To reduce system performance`,
        `To increase code complexity`,
        `To replace all other technologies`
      ],
      answer: `To facilitate core operations in its domain`,
      explanation: `${titleCase} is designed to solve specific problems efficiently within its context.`
    },
    {
      question: `Which of the following is a key benefit of using ${titleCase}?`,
      options: [
        `Improved efficiency and scalability`,
        `Higher cost of implementation`,
        `Slower processing times`,
        `Limited compatibility`
      ],
      answer: `Improved efficiency and scalability`,
      explanation: `One of the main reasons to adopt ${titleCase} is the improvement in workflow and scalability.`
    },
    {
      question: `In a typical workflow, when would you implement ${titleCase}?`,
      options: [
        `During the initial setup or optimization phase`,
        `Only after the project is deleted`,
        `Never, it is obsolete`,
        `Randomly without planning`
      ],
      answer: `During the initial setup or optimization phase`,
      explanation: `Implementing ${titleCase} at the right stage ensures better structure and performance.`
    },
    {
      question: `What is a common challenge associated with ${titleCase}?`,
      options: [
        `Learning curve for beginners`,
        `It is too easy to use`,
        `It requires no configuration`,
        `It works without electricity`
      ],
      answer: `Learning curve for beginners`,
      explanation: `Like many advanced concepts, ${titleCase} can be challenging to master initially.`
    },
    {
      question: `Which industry standard is often associated with ${titleCase}?`,
      options: [
        `Modern best practices`,
        `Legacy systems from the 1990s`,
        `Manual paper processing`,
        `Single-user environments`
      ],
      answer: `Modern best practices`,
      explanation: `${titleCase} is often aligned with current industry standards and best practices.`
    }
  ];
}

// ============ Serve Static Assets in Production ============
// Serve from the root 'dist' folder (Vite build output)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ============ Start Server ============
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Connect to MongoDB
  const dbConnected = await connectDB();
  
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    // Check API key status
    if (process.env.GEMINI_API_KEY) {
      console.log(`✅ Gemini API Key loaded (${process.env.GEMINI_API_KEY.substring(0, 10)}...)`);
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found. MCQs will use mock data.');
    }
    
    if (dbConnected) {
      console.log('✅ Database persistence enabled');
    } else {
      console.warn('⚠️ Using in-memory storage (data will not persist)');
    }
  });
}

startServer();
