import type { AppSection } from "../lib/types";

type SidebarProps = {
  activeSection: AppSection;
  isAdminUnlocked: boolean;
  onNavigate: (page: AppSection) => void;
};

const navigationItems: Array<{ page: AppSection; label: string; detail: string }> = [
  { page: "home", label: "메인", detail: "이번 달 TOP 3" },
  { page: "south", label: "남극곰", detail: "월간 팬 수" },
  { page: "north", label: "북극곰", detail: "월간 팬 수" },
];

export function Sidebar({
  activeSection,
  isAdminUnlocked,
  onNavigate,
}: SidebarProps) {
  return (
    <nav className="flex h-full flex-col gap-2" aria-label="주요 페이지">
      {navigationItems.map((item) => (
          <button
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            className={`w-full rounded-[24px] border p-4 text-left transition ${
              activeSection === item.page
                ? item.page === "south"
                  ? "border-orange-200 bg-orange-50 text-orange-950 shadow-[0_18px_40px_rgba(234,88,12,0.08)]"
                  : item.page === "north"
                    ? "border-sky-200 bg-sky-50 text-sky-950 shadow-[0_18px_40px_rgba(14,165,233,0.08)]"
                    : "border-slate-800 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <div className="text-sm font-semibold">{item.label}</div>
            <div className={`mt-1 text-xs ${activeSection === item.page ? "opacity-65" : "text-slate-500"}`}>{item.detail}</div>
          </button>
      ))}

      <div className="h-px bg-slate-200" />

      <button
        type="button"
        onClick={() => onNavigate("admin")}
        className={`w-full rounded-[24px] border p-4 text-left transition ${
          activeSection === "admin"
            ? "border-emerald-200 bg-emerald-50 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">관리자</div>
          {isAdminUnlocked ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              열림
            </span>
          ) : null}
        </div>
      </button>
    </nav>
  );
}
