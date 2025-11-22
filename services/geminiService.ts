
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeConfession = async (text: string, imageBase64?: string): Promise<AIAnalysisResult> => {
  try {
    const prompt = `
      Analyze this university student confession.
      1. Check if the content is safe (no hate speech, severe bullying, explicit NSFW, or self-harm). Set isSafe to true or false.
      2. Determine the sentiment (happy, sad, angry, funny, neutral, romantic).
      3. Choose a single emoji that best represents the mood.
      4. Generate 3 short, relevant tags (hashtags without the #).
      5. Suggest a vibrant hex color code that matches the mood.
    `;

    const parts: any[] = [{ text: prompt }];
    
    // Add text content
    parts.push({ text: `Confession Text: "${text}"` });

    // Add image if exists
    if (imageBase64) {
      // Remove header if present
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', 
          data: cleanBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ['happy', 'sad', 'angry', 'funny', 'neutral', 'romantic'] },
            emoji: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            colorTheme: { type: Type.STRING },
            isSafe: { type: Type.BOOLEAN },
            flagReason: { type: Type.STRING }
          },
          required: ['sentiment', 'emoji', 'tags', 'colorTheme', 'isSafe']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback if AI fails
    return {
      sentiment: 'neutral',
      emoji: '😶',
      tags: ['anonymous', 'student'],
      colorTheme: '#64748b',
      isSafe: true
    };
  }
};

export const generateStyledImage = async (imageBase64: string, style: 'cartoon' | 'sketch' | 'kawaii' | 'anime'): Promise<string> => {
  try {
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    
    let stylePrompt = "";
    switch (style) {
      case 'cartoon':
        stylePrompt = "Turn this person into a 3D Pixar-style cartoon character. High quality, vibrant colors, smooth textures.";
        break;
      case 'sketch':
        stylePrompt = "Turn this photo into a detailed pencil sketch drawing. Black and white, artistic shading.";
        break;
      case 'kawaii':
        stylePrompt = "Turn this person into a cute 'Kawaii' illustration. Soft pink pastel colors, big eyes, dreamy aesthetic.";
        break;
      case 'anime':
        stylePrompt = "Turn this person into a high-quality Anime character. Studio Ghibli style, detailed background.";
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `${stylePrompt} Keep the facial expression and composition similar to the original image. Return ONLY the image.`,
          },
        ],
      },
    });

    for (const part of response.candidates![0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated");

  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
