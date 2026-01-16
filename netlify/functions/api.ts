
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any, context: any) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Config Error", 
        message: "Netlifyの環境変数に API_KEY が設定されていません。" 
      }),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      あなたは世界トップクラスのテック専門投資家です。
      Google検索を使用して、半導体、AI、ロボティクス、量子、EVなどの「過去72時間以内」の最新ニュースを3〜5件ピックアップしてください。
      
      各ニュースについて以下のJSON形式で出力してください：
      {
        "news": [
          {
            "index": 1,
            "topic": "分野 (AI, 半導体など)",
            "title": "投資家が注目すべきタイトル",
            "importance": 5,
            "technicalSummary": "専門家向けの技術的・経済的影響を3文程度で詳しく要約（ですます調ではなく、硬い口調で）",
            "simpleSummary": "日常生活に例えた、子供でもわかるやさしい解説",
            "whyWatch": "今後の投資判断における最重要ポイント",
            "risks": "懸念されるリスクや技術的課題",
            "category": "カテゴリ"
          }
        ]
      }
      必ず日本語で、JSONのみを返してください。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AIの応答からJSONを抽出できませんでした。");
    
    const data = JSON.parse(jsonMatch[0]);

    // ソースURLの抽出
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

    const enrichedNews = (data.news || []).map((item: any, idx: number) => ({
      ...item,
      id: `news-${Date.now()}-${idx}`,
      sourceUrls: webSources.slice(idx * 2, (idx * 2) + 2)
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ news: enrichedNews }),
    };
  } catch (error: any) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Server Error", 
        message: error.message || "予期せぬエラーが発生しました。" 
      }),
    };
  }
};
