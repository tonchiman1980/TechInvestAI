
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Star, BookOpen, GraduationCap, Settings, Search, Zap } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { TechNewsItem } from './types';

const fetchDirectlyFromGemini = async (): Promise<TechNewsItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("APIキーが設定されていません。Netlifyの環境変数を確認してください。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "半導体、AI、ロボティクス、EV、量子コンピュータに関する最新の重要投資ニュースを3〜5件探して分析してください。各ニュースには詳細な解説をつけてください。",
    config: {
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
  if (!jsonStr) throw new Error("AIから有効なデータが返されませんでした。");
  
  const data = JSON.parse(jsonStr);

  // Google SearchのURLを抽出
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
    sourceUrls: urls.length > 0 ? urls : []
  }));
};

const fetchTechNews = async (): Promise<TechNewsItem[]> => {
  try {
    const response = await fetch('/.netlify/functions/api');
    if (!response.ok) {
      // サーバーサイドが未設定・エラーの場合はフロントエンドで直接取得を試みる
      return await fetchDirectlyFromGemini();
    }
    const data = await response.json();
    return data.news || [];
  } catch (e) {
    return await fetchDirectlyFromGemini();
  }
};

const NewsCard = ({ item }: { item: TechNewsItem }) => (
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
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em]">Tech Briefing</h4>
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
          {item.sourceUrls.map((url, i) => (
            <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 whitespace-nowrap active:bg-slate-50 transition-colors shadow-sm">
              <ExternalLink className="w-3 h-3" />
              {url.title?.substring(0, 18) || "ソースを表示"}...
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
      if (data.length === 0) throw new Error("ニュースが見つかりませんでした。");
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
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFDFF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-50/50 px-7 pt-16 pb-7 flex justify-between items-end safe-area-top">
        <div>
          <h1 className="text-[28px] font-[1000] text-slate-900 tracking-tighter leading-none mb-1.5 italic">TechInvest <span className="text-blue-600">AI</span></h1>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Alpha Insight Engine</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading} 
          className={`w-14 h-14 flex items-center justify-center bg-slate-900 rounded-[1.6rem] active:scale-90 transition-all shadow-2xl shadow-slate-200 ${loading ? 'opacity-50' : ''}`}
        >
          <RefreshCw className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-blue-600" /> Real-time Intel
            </h2>
            <div className="w-12 h-0.5 bg-blue-600 rounded-full"></div>
          </div>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full uppercase tracking-tighter">
            {loading ? 'Analyzing...' : `${lastUpdated} Updated`}
          </span>
        </div>

        {errorMsg ? (
          <div className="py-20 text-center px-8 bg-white rounded-[3.5rem] shadow-xl border border-red-50">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-subtle">
              <Settings className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-red-950 mb-3 uppercase">System Alert</h3>
            <p className="text-[13px] text-red-900/50 mb-10 leading-relaxed font-bold">{errorMsg}</p>
            <button 
              onClick={loadData} 
              className="w-full py-5 bg-red-600 text-white rounded-[2rem] text-[13px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              再試行
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-48">
            <div className="relative mb-10">
              <div className="w-24 h-24 border-[8px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse">Deep Market Scanning...</p>
          </div>
        ) : (
          <div className="pb-28">
            {news.map(item => <NewsCard key={item.id} item={item} />)}
            <div className="text-center py-10 opacity-10">
              <p className="text-[9px] font-black uppercase tracking-[0.6em]">Alpha Intelligence v4.4</p>
            </div>
          </div>
        )}
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-white/40 backdrop-blur-2xl border-t border-slate-100/30 pointer-events-none"></div>
    </div>
  );
}
