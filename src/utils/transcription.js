/**
 * Transcription Utility
 * Handles audio transcription and summary generation
 * Currently uses mock transcription - can be replaced with real API (Google Cloud Speech-to-Text, OpenAI Whisper, etc.)
 */

export async function transcribeAudio(audioBase64) {
  try {
    console.log('🔄 [Transcribe] Starting transcription...');
    
    // In production, send to backend endpoint that uses real transcription service
    // For now, returning mock transcription
    
    // TODO: Replace with actual backend call
    // const response = await fetch('/api/transcribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ audioBase64 })
    // });
    // const data = await response.json();
    // return data.text;

    // Mock transcription - in real implementation, call actual transcription API
    const mockTranscriptions = [
      "Today we discussed the fundamentals of React hooks and their applications in modern web development.",
      "We covered the importance of state management and how to use Context API effectively.",
      "Participants asked about performance optimization and we discussed memoization techniques.",
      "We reviewed lifecycle methods and their equivalents in functional components.",
      "Discussion included best practices for handling side effects in React applications.",
      "We explored custom hooks and how to extract component logic into reusable functions."
    ];

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const randomTranscript = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    console.log('✅ [Transcribe] Complete:', randomTranscript.substring(0, 50) + '...');

    return randomTranscript;
  } catch (error) {
    console.error('❌ [Transcribe] Error:', error);
    return null;
  }
}

export async function generateSummary(transcriptText) {
  try {
    console.log('🔄 [Summary] Generating summary from transcript...');

    // In production, send to backend that uses Gemini API or similar
    // For now, using simple extractive summarization

    if (!transcriptText || transcriptText.length < 20) {
      return 'Brief discussion on class topics.';
    }

    // Simple mock summary - extracts key parts
    const sentences = transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join('. ') + '.';

    console.log('✅ [Summary] Generated:', summary);

    return summary;
  } catch (error) {
    console.error('❌ [Summary] Error:', error);
    return 'Unable to generate summary.';
  }
}

export function generateAnalysisInsights(transcripts, sentiment) {
  /**
   * Generate actionable insights from transcripts and sentiment data
   */
  try {
    const insights = [];

    // Sentiment insight
    if (sentiment.good > sentiment.bad && sentiment.good > sentiment.neutral) {
      insights.push('✅ High positive sentiment - Class engaging well');
    } else if (sentiment.bad > sentiment.good) {
      insights.push('⚠️ Low sentiment - Consider review of content delivery');
    } else if (sentiment.neutral > sentiment.good && sentiment.neutral > sentiment.bad) {
      insights.push('📊 Mixed sentiment - Audience response varied');
    }

    // Transcript volume insight
    const totalWords = transcripts.reduce((sum, t) => sum + t.text.split(' ').length, 0);
    if (totalWords > 500) {
      insights.push('💬 High discussion volume - Active participation detected');
    } else if (totalWords < 100) {
      insights.push('📉 Low discussion volume - Consider more interactive elements');
    }

    // Topics identified (mock)
    const keywords = ['React', 'hooks', 'state', 'performance', 'optimization', 'API'];
    const detectedTopics = keywords.filter(kw => 
      transcripts.some(t => t.text.toLowerCase().includes(kw.toLowerCase()))
    );

    if (detectedTopics.length > 0) {
      insights.push(`🎯 Topics covered: ${detectedTopics.join(', ')}`);
    }

    console.log('✅ [Insights] Generated:', insights);

    return insights;
  } catch (error) {
    console.error('❌ [Insights] Error:', error);
    return [];
  }
}

export function calculateEngagementScore(sentiment, transcriptCount) {
  /**
   * Calculate engagement score 0-100
   */
  const total = sentiment.good + sentiment.neutral + sentiment.bad;
  const positiveRatio = total > 0 ? (sentiment.good / total) * 100 : 50;
  const participationScore = Math.min((transcriptCount / 5) * 20, 20); // Max 20 points
  const engagementScore = Math.round(positiveRatio * 0.6 + participationScore * 0.4);

  return Math.min(engagementScore, 100);
}
