import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},title:{default:'十点晨报 · 时政、金融与AI',template:'%s · 十点晨报'},description:'每日时政、金融与AI新闻精选，读懂核心事实、来龙去脉和专业知识。按关键词与日期查阅历史新闻。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><a href="#main-content" className="skip-link">跳到正文</a><div id="main-content">{children}</div></body></html>}
