
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, ExternalLink, Star, BookOpen, GraduationCap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { TechNewsItem } from './types';

const getTechNews = async (): Promise<TechNewsItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEYが設定されていません。Netlifyの環境変数を確認してください。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    あなたはテック・投資専門家であり、同時に「教育者」でもあります。
    「今日（現在時点）」で投資家が絶対に知っておくべき重要なテックニュースを3〜5件提供してください。

    【ニュース選定と出力のルール】
    1. 「technicalSummary」には、プロの投資アナリストが使うような、専門用語（例：LLM、ファウンドリ、露光装置、利回り等）を正しく含めた原文を書いてください。
    2. 「simpleSummary」には、同じ内容を専門知識がない人でも完全に理解できるよう、身近な例え話を使ってかみ砕いて説明してください。
    3. 難しい専門用語については、simpleSummaryの中で自然に補足してください。

    【出力形式】
    必ず以下のJSON形式のみを返してください。
    
    {
      "news": [
        {
          "index": 1,
          "topic": "トピック（例：半導体、AI）",
          "title": "ニュース見出し",
          "importance": 5,
          "technicalSummary": "プロフェッショナルな専門用語を含む原文",
          "simpleSummary": "日常の言葉と例え話を使ったやさしい解説",
          "affectedEntities": [
            { "region": "日本", "entities": ["企業名1", "企業名2"] },
            { "region": "グローバル", "entities": ["企業名3"] }
          ],
          "whyWatch": "投資家が注目すべき具体的な理由",
          "risks": "将来的なリスクや懸念点",
          "category": "カテゴリー"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawText;
    const newsData = JSON.parse(cleanedJson);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return newsData.news.map((item: any, idx: number) => ({
      ...item,
      id: `news-${Date.now()}-${idx}`,
      sourceUrls: sourceUrls.length > 0 ? sourceUrls.slice(idx * 2, (idx * 2) + 2) : []
    }));
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("ニュースの取得に失敗しました。再試行してください。");
  }
};

const NewsCard = ({ item }: { item: TechNewsItem }) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 mb-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-2xl text-xs font-black italic">
            {item.index}
          </span>
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {item.topic}
          </span>
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < item.importance ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
          ))}
        </div>
      </div>
      
      <h3 className="text-xl font-black leading-snug mb-6 text-slate-800 tracking-tight">
        {item.title}
      </h3>
      
      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">プロの原文（用語学習用）</h4>
          </div>
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50">
            <p className="text-[14px] text-slate-700 leading-relaxed font-semibold italic">
              {item.technicalSummary}
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">やさしいかみ砕き解説</h4>
          </div>
          <div className="bg-blue-50/40 rounded-2xl p-4 border border-blue-100/30">
            <p className="text-[15px] text-blue-900/80 leading-relaxed font-bold">
              {item.simpleSummary}
            </p>
          </div>
        </section>

        <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">注目銘柄</h4>
          <div className="flex flex-col gap-3">
            {item.affectedEntities.map((group, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-center">
                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {group.region}
                </span>
                <div className="flex flex-wrap gap-x-3">
                  {group.entities.map((entity, eIdx) => (
                    <span key={eIdx} className="text-sm text-slate-800 font-black underline decoration-blue-500/30 underline-offset-4">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          <section className="bg-green-50/50 rounded-3xl p-5 border border-green-100/50">
            <h4 className="text-[10px] font-black text-green-600 mb-2 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> なぜ注目？
            </h4>
            <p className="text-sm text-green-900/70 leading-relaxed font-medium">{item.whyWatch}</p>
          </section>

          <section className="bg-red-50/50 rounded-3xl p-5 border border-red-100/50">
            <h4 className="text-[10px] font-black text-red-600 mb-2 uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> リスク
            </h4>
            <p className="text-sm text-red-900/70 leading-relaxed font-medium">{item.risks}</p>
          </section>
        </div>
      </div>

      {item.sourceUrls && item.sourceUrls.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-50 overflow-x-auto no-scrollbar">
          <div className="flex gap-3">
            {item.sourceUrls.map((url, i) => (
              <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 whitespace-nowrap">
                <ExternalLink className="w-3 h-3" />
                {url.title || "情報源"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [news, setNews] = useState<TechNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getTechNews();
      setNews(data);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFDFF] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-50 px-6 pt-12 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-[1000] text-slate-900 tracking-tighter leading-none mb-1.5">TechInvest <span className="text-blue-600">AI</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Education & Insights</p>
        </div>
        <button onClick={loadData} disabled={loading} className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-[1.25rem] active:scale-90 transition-all shadow-xl shadow-slate-200">
          <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Latest Analysis</h2>
            <div className="w-8 h-1 bg-blue-600 rounded-full"></div>
          </div>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">{lastUpdated} 更新</span>
        </div>

        {errorMsg ? (
          <div className="mb-10 p-8 bg-red-50 border border-red-100 rounded-[3rem] text-center">
            <p className="text-sm font-black text-red-800 mb-6">{errorMsg}</p>
            <button onClick={loadData} className="px-10 py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest">再読み込み</button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-[6px] border-slate-50 rounded-full animate-pulse"></div>
              <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Analyzing Trends...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {news.map(item => <NewsCard key={item.id} item={item} />)}
          </div>
        )}
      </main>

      <footer className="px-10 py-16 bg-white border-t border-slate-50 text-slate-300 text-[10px] text-center safe-area-bottom">
        <p className="font-black uppercase tracking-[0.2em] mb-4 opacity-30">Education First</p>
        <p className="leading-relaxed font-bold mb-4">プロの原文から用語を学び、やさしい解説で内容を掴みましょう。</p>
        <p className="opacity-50">© 2024 TechInvest AI.</p>
      </footer>
    </div>
  );
}
