/* Native document links avoid the deployed Vinext client-router failure and keep navigation usable without hydration. */
/* oxlint-disable next/no-html-link-for-pages */
import {SiteHeader,SiteFooter} from '@/components/site-header';
export default function NotFound(){return <><SiteHeader/><main id="main" className="empty-state"><p>404</p><h1>这条新闻尚未收录</h1><p>链接可能有误，或稿件尚未发布。</p><a href="/archive">前往历史新闻查找 →</a></main><SiteFooter/></>;}
