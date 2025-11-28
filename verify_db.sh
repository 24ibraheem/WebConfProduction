#!/bin/bash

# MongoDB Database Verification Script
# This script checks the ly_conference database for stored data

echo "🔍 MongoDB Database Verification"
echo "=================================="
echo ""

# Check if mongosh is available
if ! command -v mongosh &> /dev/null; then
    echo "❌ mongosh not found. Install it with: brew install mongosh"
    exit 1
fi

echo "📊 Connecting to MongoDB..."
echo ""

# Connect and run queries
mongosh mongodb://localhost:27017/ly_conference --eval "
db.admin.ping()
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to MongoDB"
    echo "   Make sure MongoDB is running: brew services start mongodb-community"
    exit 1
fi

echo "✅ Connected to MongoDB"
echo ""
echo "📋 Collections in ly_conference database:"
mongosh mongodb://localhost:27017/ly_conference --eval "show collections" | grep -v "^MongoDB shell"

echo ""
echo "📊 Document Counts:"
echo "━━━━━━━━━━━━━━━━━━━"

mongosh mongodb://localhost:27017/ly_conference --eval "
console.log('Meetings:', db.meetings.countDocuments());
console.log('Transcripts:', db.transcripts.countDocuments());
console.log('Class Summaries:', db.classsummaries.countDocuments());
console.log('MCQs:', db.mcqs.countDocuments());
console.log('Users:', db.users.countDocuments());
console.log('Analytics:', db.analytics.countDocuments());
" 2>/dev/null

echo ""
echo "📅 Latest Meeting:"
echo "━━━━━━━━━━━━━━━━━━━"
mongosh mongodb://localhost:27017/ly_conference --eval "
db.meetings.findOne({}, {sort: {createdAt: -1}})
" 2>/dev/null | head -20

echo ""
echo "🎤 Latest Transcript:"
echo "━━━━━━━━━━━━━━━━━━━"
mongosh mongodb://localhost:27017/ly_conference --eval "
db.transcripts.findOne({}, {sort: {createdAt: -1}})
" 2>/dev/null | head -20

echo ""
echo "📊 Latest Class Summary:"
echo "━━━━━━━━━━━━━━━━━━━"
mongosh mongodb://localhost:27017/ly_conference --eval "
db.classsummaries.findOne({}, {sort: {createdAt: -1}})
" 2>/dev/null | head -25

echo ""
echo "✅ Database verification complete"
