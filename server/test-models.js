import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // For some reason listModels is not directly on genAI, it's on the model manager or similar?
    // Actually, in 0.24.1 it might be different.
    // Let's try to just make a simple generation call with a few candidates.
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.0-pro worked:", result.response.text());
  } catch (error) {
    console.error("gemini-1.0-pro failed:", error.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.5-pro worked:", result.response.text());
  } catch (error) {
    console.error("gemini-1.5-pro failed:", error.message);
  }
}

listModels();
