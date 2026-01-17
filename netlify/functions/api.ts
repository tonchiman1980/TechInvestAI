
import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any, context: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ message: "API_KEY not configured in Netlify" }) };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "投資家向けテックニュースを3〜5件探して分析してください。必ず日本語で出力してください。",
      config: {
        systemInstruction: "あなたはプロの投資アナリストです。最新のテックニュースを深く分析し、投資家にとって有益な情報をすべて日本語で提供してください。",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.NUMBER },
                  topic: { type: Type.STRING },
                  title: { type: Type.STRING },
                  importance: { type: Type.NUMBER },
                  technicalSummary: { type: Type.STRING },
                  simpleSummary: { type: Type.STRING },
                  whyWatch: { type: Type.STRING },
                  risks: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["index", "topic", "title", "importance", "technicalSummary", "simpleSummary", "whyWatch", "risks"]
              }
            }
          }
        }
      },
    });

    const jsonStr = response.text;
    const data = JSON.parse(jsonStr || '{"news":[]}');

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ news: data.news || [] }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
