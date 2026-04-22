import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="not-found-panel">
        <p className="eyebrow-text">404</p>
        <h1 className="page-title">页面不存在</h1>
        <p className="page-description">
          你访问的页面可能还没有建立，或者对应的数据已经被移除。可以回到工作台或项目总览继续推进。
        </p>
        <div className="link-row">
          <Link href="/" className="action-button">
            返回工作台
          </Link>
          <Link href="/projects" className="ghost-link">
            查看项目总览
          </Link>
        </div>
      </section>
    </main>
  );
}
