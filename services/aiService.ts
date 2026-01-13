
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

class AIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
  }

  async getStudyHelp(prompt: string, context?: string): Promise<string> {
    const systemInstruction = `
      You are FocusStudy AI, a brilliant personal tutor. 
      Your goal is to help students understand complex concepts, summarize their study materials, 
      and provide revision tips. 
      Use clear, encouraging language. 
      When explaining technical concepts, use analogies where appropriate.
      
      User Context: ${context || 'General study help requested.'}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 }
          // maxOutputTokens is intentionally omitted as per instructions
        },
      });

      return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "I encountered an error while thinking. Please check your connection and try again.";
    }
  }

  async *streamStudyHelp(prompt: string, context?: string) {
    const systemInstruction = `
      You are FocusStudy AI, a brilliant personal tutor. 
      Context: ${context || 'General help.'}
    `;

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 }
        },
      });

      for await (const chunk of responseStream) {
        const text = (chunk as GenerateContentResponse).text;
        if (text) yield text;
      }
    } catch (error) {
      console.error("Streaming Error:", error);
      yield " [An error occurred while streaming the response] ";
    }
  }
}

export const aiService = new AIService();
