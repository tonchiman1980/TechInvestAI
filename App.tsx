
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Star, BookOpen, GraduationCap, Settings, Search, Zap, AlertCircle, Info } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { TechNewsItem } from './types';

// Fix: Use the recommended model for complex reasoning and follow initialization guidelines
const fetchDirectlyFromGemini = async (): Promise<TechNewsItem[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    console.error("DEBUG: API_KEY is missing in the frontend build.");
    throw new Error("APIキーがアプリに紐付いていません。NetlifyでEnvironment variablesを設定した後、一度『Clear cache and deploy site』を実行してください。");
  }

  // Fix: Create a new instance right before the call to ensure up-to-date config
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Complex analysis task
      contents: "半導体、AI、ロボティクス、EV、量子コンピュータに関する最新の重要投資ニュースを3〜5件探して分析してください。必ず日本語で出力してください。",
      config: {
        systemInstruction: "あなたはプロの投資アナリストです。最新のテックニュースを深く分析し、投資家にとって有益な情報をすべて日本語で提供してください。専門用語は適切に使いつつ、初心者にも分かりやすい解説を心がけてください。回答は必ず日本語で行ってください。",
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

    // Fix: Clean markdown code blocks from the response text if present
    const jsonStr = response.text.replace(/```json\n?|```/g, '').trim();
    if (!jsonStr) throw new Error("AIからの応答が空でした。");
    const data = JSON.parse(jsonStr);

    // Fix: Correctly extract URLs from grounding chunks
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "参考ソース",
        uri: chunk.web.uri
      }));

    return (data.news || []).map((n: any, i: number) => ({
      ...n,
      id: `n-${Date.now()}-${i}`,
      sourceUrls: urls,
      affectedEntities: n.affectedEntities || [] // Ensure missing required properties are handled
    }));
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Google検索機能の制限に達しました。使用率が0%に見えても、無料枠の検索機能には非常に厳しい回数制限があります。1分ほど待つか、しばらく時間をおいてください。");
    }
    throw err;
  }
};

const fetchTechNews = async (): Promise<TechNewsItem[]> => {
  try {
    const response = await fetch('/.netlify/functions/api');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Function Error");
    }
    const data = await response.json();
    return data.news || [];
  } catch (e: any) {
    console.warn("Function failed, falling back to direct call:", e.message);
    return await fetchDirectlyFromGemini();
  }
};

// Fix: Use React.FC to allow the 'key' prop when mapping over components
const NewsCard: React.FC<{ item: TechNewsItem }> = ({ item }) => (
  <div className="bg-white rounded-[2.8rem] p-7 mb-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] border border-slate-100 relative active:scale-[0.97] transition-all duration-300">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-xl text-[11px] font-[1000] italic">
          {item.index}
        </span>
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">
          {item.topic}
        </span>
      </div>
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < item.importance ? 'fill-yellow-400 text-yellow-400' : 'text-slate-100'}`} />
        ))}
      </div>
    </div>
    
    <h3 className="text-[22px] font-[1000] leading-[1.2] mb-8 text-slate-900 tracking-tighter">
      {item.title}
    </h3>
    
    <div className="space-y-6">
      <div className="bg-slate-50/60 rounded-[1.8rem] p-5 border border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5 opacity-40">
          <GraduationCap className="w-3.5 h-3.5" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em]">Technical Analysis</h4>
        </div>
        <p className="text-[14px] text-slate-600 leading-relaxed font-semibold italic">{item.technicalSummary}</p>
      </div>

      <div className="bg-blue-50/50 rounded-[1.8rem] p-5 border border-blue-100/40">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">やさしい解説</h4>
        </div>
        <p className="text-[15px] text-blue-900/80 leading-relaxed font-bold">{item.simpleSummary}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50/40 rounded-2xl p-4 border border-green-100/30">
          <h4 className="text-[10px] font-black text-green-600 mb-1.5 uppercase flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> 注目</h4>
          <p className="text-[12px] text-green-900/70 font-bold leading-snug">{item.whyWatch}</p>
        </div>
        <div className="bg-red-50/40 rounded-2xl p-4 border border-red-100/30">
          <h4 className="text-[10px] font-black text-red-600 mb-1.5 uppercase">リスク</h4>
          <p className="text-[12px] text-red-900/70 font-bold leading-snug">{item.risks}</p>
        </div>
      </div>
    </div>

    {item.sourceUrls && item.sourceUrls.length > 0 && (
      <div className="mt-7 pt-7 border-t border-slate-50 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {item.sourceUrls.slice(0, 3).map((url, i) => (
            <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 whitespace-nowrap active:bg-slate-50 transition-colors shadow-sm">
              <ExternalLink className="w-3 h-3" />
              ソース {i + 1}
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default function App() {
  const [news, setNews] = useState<TechNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchTechNews();
      setNews(data);
      setLastUpdated(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFDFF] flex flex-col font-sans select-none">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-3xl border-b border-slate-50/50 px-7 pt-16 pb-7 flex justify-between items-end safe-area-top">
        <div>
          <h1 className="text-[28px] font-[1000] text-slate-900 tracking-tighter leading-none mb-1.5 italic">TechInvest <span className="text-blue-600">AI</span></h1>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Alpha Insight Engine</p>
        </div>
        <button onClick={loadData} disabled={loading} className="w-14 h-14 flex items-center justify-center bg-slate-900 rounded-[1.6rem] active:scale-90 transition-all shadow-xl">
          <RefreshCw className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 px-6 py-8">
        {errorMsg ? (
          <div className="py-12 text-center px-8 bg-white rounded-[3.5rem] shadow-xl border border-red-50 mx-2">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-subtle">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-red-950 mb-3 uppercase tracking-wider">System Alert</h3>
            <p className="text-[14px] text-red-900/60 mb-8 leading-relaxed font-bold">{errorMsg}</p>
            
            <div className="bg-slate-50 rounded-3xl p-5 mb-8 text-left">
               <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">How to Fix</span>
               </div>
               <ul className="text-[12px] text-slate-600 space-y-2 font-semibold">
                  <li>1. Netlifyの管理画面で <b>API_KEY</b> が正しく設定されているか確認</li>
                  <li>2. 設定後、<b>Deploys > Trigger deploy > Clear cache and deploy site</b> を実行</li>
                  <li>3. 1分ほど待ってから下のボタンを押す</li>
               </ul>
            </div>

            <button onClick={loadData} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-[13px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              再試行する
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-48">
            <div className="w-24 h-24 border-[8px] border-slate-50 border-t-blue-600 rounded-full animate-spin mb-10"></div>
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse text-center">Scanning Tech Markets...</p>
          </div>
        ) : (
          <div className="pb-28">
            <div className="flex items-center justify-between mb-10 px-2 opacity-50">
               <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-blue-600" /> Intel Feed
               </h2>
               <span className="text-[10px] font-black text-slate-400 tracking-tighter">{lastUpdated} Updated</span>
            </div>
            {news.map(item => <NewsCard key={item.id} item={item} />)}
          </div>
        )}
      </main>
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
    </div>
  );
}
