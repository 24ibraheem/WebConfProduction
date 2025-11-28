import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // Should be hashed in production
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  firstName: String,
  lastName: String,
  profilePicture: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Meeting Schema
const meetingSchema = new mongoose.Schema({
  meetingId: { type: String, unique: true, required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  status: { type: String, enum: ['scheduled', 'active', 'completed'], default: 'active' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recordingUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Transcript Schema
const transcriptSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  rawText: String,
  summary: String,
  duration: Number,
  timestamp: Date,
  mimeType: String,
  createdAt: { type: Date, default: Date.now }
});

// Class Summary Schema
const classSummarySchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  totalTranscripts: Number,
  keyTopics: [String],
  averageSentiment: String,
  engagementScore: Number,
  mainInsights: [String],
  sentiment: {
    good: Number,
    neutral: Number,
    negative: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// MCQ Schema
const mcqSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  prompt: String,
  generatedFromSummary: Boolean,
  questions: [{
    id: String,
    question: String,
    options: [String],
    answer: String,
    explanation: String
  }],
  responses: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: [String],
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentimentHistory: [{
    sentiment: String,
    timestamp: Date
  }],
  engagementLevel: Number,
  participationCount: Number,
  responseAccuracy: Number,
  createdAt: { type: Date, default: Date.now }
});

// Create models
export const User = mongoose.model('User', userSchema);
export const Meeting = mongoose.model('Meeting', meetingSchema);
export const Transcript = mongoose.model('Transcript', transcriptSchema);
export const ClassSummary = mongoose.model('ClassSummary', classSummarySchema);
export const MCQ = mongoose.model('MCQ', mcqSchema);
export const Analytics = mongoose.model('Analytics', analyticsSchema);
