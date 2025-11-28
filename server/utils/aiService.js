import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Transcribes an audio buffer using Gemini Flash
 * @param {Buffer} audioBuffer - The audio buffer to transcribe
 * @param {string} mimeType - The mime type of the audio (e.g., 'audio/webm')
 * @returns {Promise<string>} - The transcription text
 */
export async function transcribeAudioChunk(audioBuffer, mimeType = 'audio/webm') {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString('base64')
        }
      },
      { text: "Transcribe this audio exactly as spoken. Do not add any descriptions or timestamps. If the audio is silent or unintelligible, return an empty string." }
    ]);

    const response = await result.response;
    const text = response.text();
    console.log(`🤖 [Gemini] Transcription result: "${text.substring(0, 50)}..."`);
    return text;
  } catch (error) {
    console.error("❌ [Gemini] Error transcribing audio:", error.message);
    // Return mock transcription for testing if API fails
    return `[Mock Transcription] Audio received at ${new Date().toLocaleTimeString()}. (API Error: ${error.message})`;
  }
}

/**
 * Generates a class summary based on accumulated transcripts
 * @param {string[]} transcripts - Array of transcript strings
 * @returns {Promise<Object>} - Structured summary object
 */
export async function generateClassSummary(transcripts) {
  try {
    const fullText = transcripts.join("\n");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze the following class transcript and provide a structured summary.
      
      Transcript:
      ${fullText}

      Return the response in valid JSON format with the following structure:
      {
        "keyTopics": ["topic1", "topic2"],
        "mainInsights": ["insight1", "insight2"],
        "averageSentiment": "positive" | "neutral" | "negative",
        "engagementScore": number (0-100)
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
}
