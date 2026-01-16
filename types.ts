
export interface AffectedEntity {
  region: string;
  entities: string[];
}

export interface TechNewsItem {
  id: string;
  index: number;
  topic: string;
  title: string;
  importance: number; // 1-5
  technicalSummary: string; // プロ向けの硬い原文
  simpleSummary: string;    // 初心者向けのやさしい解説
  affectedEntities: AffectedEntity[];
  whyWatch: string;
  risks: string;
  category: string;
  sourceUrls: { title: string; uri: string }[];
}

export interface ApiResponse {
  news: TechNewsItem[];
  timestamp: string;
}

export enum TechCategory {
  AI = 'AI / ソフトウェア',
  SEMICONDUCTOR = '半導体 / ハードウェア',
  CLOUD = 'クラウド / インフラ',
  EV = 'EV / クリーンエネルギー',
  QUANTUM = '量子 / 先端技術',
  WEB3 = 'Web3 / 暗号資産',
  ROBOTICS = 'ロボティクス / オートメーション'
}
