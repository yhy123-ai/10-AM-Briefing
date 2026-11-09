export type Category = 'politics' | 'finance' | 'ai';
export interface Source { sourceId: string; name: string; url: string; publishedAt: string; readAt: string; timeNote?: string; }
export interface Article {
  id: string; editionDate: string; category: Category; rank: number; eventKey: string;
  title: string; summary: string; body: string[]; background: string[];
  timeline: { date: string; event: string; sourceUrl: string }[];
  glossary: { term: string; explanation: string }[];
  sources: Source[]; tags: string[]; retrospective: boolean; checkedAt: string;
  updatedAt?: string; correction?: string;
  selectionStatus?: 'replaced'; replacementId?: string;
}
export interface Edition { date: string; status: 'draft' | 'published'; version: number; note: string; publishedAt: string | null; articles: Article[]; }
export const categories = [
  { key: 'politics', name: '时政', english: 'WORLD & POLICY', intro: '在变化中，理解世界', color: '#6ea9ff' },
  { key: 'finance', name: '金融', english: 'MARKETS & ECONOMY', intro: '循着资金，读懂趋势', color: '#efbb63' },
  { key: 'ai', name: 'AI 科技', english: 'ARTIFICIAL INTELLIGENCE', intro: '看见正在发生的未来', color: '#6adacb' },
] as const;
