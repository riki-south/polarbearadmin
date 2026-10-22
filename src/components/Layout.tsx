import type { ReactNode } from "react";
type LayoutProps = { heading: string; sidebar: ReactNode; children: ReactNode };
export function Layout({ heading, sidebar, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-3 py-3 md:px-6 md:py-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white bg-white/80 px-5 py-4 shadow-[0_10px_36px_rgba(15,23,42,0.05)] backdrop-blur md:px-7">
          <a href="/" className="flex items-center gap-3 text-inherit no-underline">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-xl text-white">✦</span>
            <span><span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">FAN GROWTH ARCHIVE</span><span className="mt-1 block text-sm font-bold tracking-tight text-slate-900">남극곰 · 북극곰</span></span>
          </a>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">{heading}</div>
        </header>
        <div className="grid flex-1 gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[28px] border border-white bg-white p-3 shadow-[0_10px_36px_rgba(15,23,42,0.04)] md:p-4">{sidebar}</aside>
          <main className="min-w-0 rounded-[28px] border border-white bg-white p-3 shadow-[0_10px_36px_rgba(15,23,42,0.04)] md:p-5">{children}</main>
        </div>
        <footer className="px-2 py-4 text-center text-[11px] text-slate-400">팬 수 기록은 memberId 기준으로 연결되며, 화면에는 닉네임만 표시됩니다.</footer>
      </div>
    </div>
  );
}
