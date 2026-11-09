'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="empty-state"><h1>新闻暂时无法加载</h1><p>请稍后重试，已归档的新闻仍保存在新闻库中。</p><button className="primary-button" onClick={reset}>重新加载</button></main>;}
