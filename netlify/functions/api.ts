
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any, context: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing in Netlify environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Configuration Error: API_KEY is missing." }),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // 検索グラウンディングを有効にするため、スキーマ指定ではなくプロンプトでJSON構造を指示
    const prompt = `
      あなたは最先端テック分野とグローバル株式市場の専門アナリストです。
      「今日（現在時点）」で投資家が絶対に知っておくべき重要なテックニュースを3〜5件提供してください。

      【重要】出力は必ず以下のJSON形式のみを返してください。説明文や装飾（\`\`\`jsonなど）は不要です。
      
      {
        "news": [
          {
            "index": 1,
            "topic": "トピック名",
            "title": "ニュースタイトル",
            "importance": 5,
            "summary": "3行以内の事実要約",
            "affectedEntities": [
              { "region": "日本", "entities": ["銘柄名1", "銘柄名2"] },
              { "region": "米国", "entities": ["銘柄名3"] }
            ],
            "whyWatch": "投資家が注目すべき理由と短期・中期・長期の視点",
            "risks": "考えられるリスクや未確定要素",
            "category": "カテゴリー名"
          }
        ]
      }

      対象分野: AI, 半導体, クラウド, EV, 量子コンピュータ, Web3, ロボティクス
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // googleSearch使用時はresponseMimeTypeを避けるのが安定動作のコツです
      },
    });

    const rawText = response.text || "";
    // JSON部分のみを抽出（前後に文字が入る可能性を考慮）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawText;
    
    let newsData;
    try {
      newsData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", rawText);
      throw new Error("AIからのレスポンスを解析できませんでした。");
    }

    // Google Searchの引用元（グラウンディング）を抽出
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    // ID付与とソースの紐付け
    const enrichedNews = newsData.news.map((item: any, idx: number) => ({
      ...item,
      id: `news-${Date.now()}-${idx}`,
      sourceUrls: sourceUrls.length > 0 ? sourceUrls.slice(idx * 2, (idx * 2) + 2) : []
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ news: enrichedNews }),
    };
  } catch (error: any) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message 
      }),
    };
  }
};
