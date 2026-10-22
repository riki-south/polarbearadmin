import { useEffect, useState } from "react";
import heroImage from "../../assets/home-hero.svg";
import { formatNumber, formatSignedNumber } from "../../lib/format";
import { dataRepository } from "../../lib/repository";
import { AchievementName } from "../achievements/AchievementName";
import { buildMemberAchievementStacks } from "../achievements/achievementUtils";
import { buildComputedRecords } from "../fan-growth/fanGrowthUtils";
import type { FanGrowthDataset, FanGrowthComputedRecord } from "../fan-growth/fanGrowthTypes";

type GroupLeaders = {
  dataset: FanGrowthDataset | null;
  leaders: FanGrowthComputedRecord[];
  achievementStacks: Map<string, number>;
};

type HomeViewProps = {
  dataVersion: number;
  onOpen: (page: "south" | "north") => void;
};

function LeaderColumn({
  title,
  periodLabel,
  leaders,
  achievementStacks,
  color,
  onOpen,
}: {
  title: string;
  periodLabel: string;
  leaders: FanGrowthComputedRecord[];
  achievementStacks: Map<string, number>;
  color: "amber" | "ice";
  onOpen: () => void;
}) {
  const palette = color === "amber"
    ? { eyebrow: "text-orange-700", medal: "text-amber-700", rail: "bg-orange-100", amount: "text-orange-700" }
    : { eyebrow: "text-sky-700", medal: "text-sky-700", rail: "bg-sky-100", amount: "text-sky-700" };

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_48px_rgba(19,38,59,0.08)] backdrop-blur md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${palette.eyebrow}`}>MONTHLY TOP 3</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{periodLabel || "데이터 대기 중"}</p>
        </div>
        <button type="button" onClick={onOpen} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900">월간 기록 보기 ↗</button>
      </div>
      <div className="mt-5 space-y-2">
        {leaders.length ? leaders.map((leader, index) => (
          <div key={leader.memberId} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${index === 0 ? palette.rail : "bg-slate-50"}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold shadow-sm ${palette.medal}`}>0{index + 1}</span>
            <AchievementName name={leader.name} stacks={achievementStacks.get(leader.memberId) ?? 0} className="min-w-0 flex-1 text-sm font-semibold text-slate-800" />
            <span className={`shrink-0 text-sm font-bold tabular-nums ${palette.amount}`}>{formatSignedNumber(leader.increase)}</span>
          </div>
        )) : <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">등록된 월간 기록이 없습니다.</div>}
      </div>
      {leaders[0] ? <p className="mt-4 text-right text-[11px] text-slate-400">1위 현재 팬 수 {formatNumber(leaders[0].currentFans)}</p> : null}
    </section>
  );
}

function makeLeaders(datasets: FanGrowthDataset[]): GroupLeaders {
  const dataset = datasets.at(-1) ?? null;
  const leaders = dataset
    ? buildComputedRecords(dataset.records).filter((record) => !record.isNew).slice(0, 3)
    : [];
  return { dataset, leaders, achievementStacks: buildMemberAchievementStacks(datasets) };
}

export function HomeView({ dataVersion, onOpen }: HomeViewProps) {
  const [groups, setGroups] = useState<Record<"south" | "north", GroupLeaders>>({
    south: { dataset: null, leaders: [], achievementStacks: new Map() },
    north: { dataset: null, leaders: [], achievementStacks: new Map() },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroImageAvailable, setHeroImageAvailable] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      dataRepository.listDatasets("south-monthly"),
      dataRepository.listDatasets("north-monthly"),
    ]).then(([south, north]) => {
      if (!mounted) return;
      setGroups({ south: makeLeaders(south), north: makeLeaders(north) });
      setError("");
    }).catch((loadError) => {
      console.error(loadError);
      if (!mounted) return;
      setError("팬 수 기록을 불러오지 못했습니다.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [dataVersion]);

  const centralLabel = [groups.south.dataset, groups.north.dataset]
    .filter((dataset): dataset is FanGrowthDataset => dataset !== null)
    .sort((left, right) => left.periodId.localeCompare(right.periodId))
    .at(-1)?.periodLabel ?? "새로운 기록을 기다리고 있어요";

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(250px,0.9fr)_minmax(340px,1.25fr)_minmax(250px,0.9fr)]">
        <div className="order-2 xl:order-1">
          <LeaderColumn title="남극곰" periodLabel={groups.south.dataset?.periodLabel ?? ""} leaders={groups.south.leaders} achievementStacks={groups.south.achievementStacks} color="amber" onOpen={() => onOpen("south")} />
        </div>
        <div className="relative order-1 min-h-[360px] overflow-hidden rounded-[32px] border border-white/70 bg-[#dbe9ef] shadow-[0_28px_80px_rgba(20,43,61,0.13)] xl:order-2">
          {heroImageAvailable ? <img src={heroImage} alt="메인 대문 이미지" className="absolute inset-0 h-full w-full object-cover" onError={() => setHeroImageAvailable(false)} /> : null}
          {!heroImageAvailable ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.96)_0_4%,transparent_4.3%),radial-gradient(ellipse_at_50%_58%,rgba(255,255,255,0.7)_0_18%,transparent_18.5%),linear-gradient(135deg,#d7e9ea_0%,#a7cad1_52%,#8eaeb8_100%)]" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,33,49,0.08)_0%,rgba(14,33,49,0.2)_44%,rgba(14,33,49,0.78)_100%)]" />
          <div className="absolute inset-0 flex flex-col justify-between p-6 text-white md:p-8">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] backdrop-blur">SOUTH & NORTH POLARBEAR</span>
              <span className="text-xs font-medium text-white/85">{loading ? "불러오는 중" : centralLabel}</span>
            </div>
            <div className="relative max-w-lg">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/75">FAN GROWTH ARCHIVE</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">함께 쌓아온<br />성장의 기록</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">두 서클의 월간 팬 수와 멤버별 성장 흐름을 한곳에서 확인해요.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpen("south")} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-50">남극곰 기록</button>
                <button type="button" onClick={() => onOpen("north")} className="rounded-full border border-white/45 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">북극곰 기록</button>
              </div>
              {!heroImageAvailable ? <p className="mt-5 text-[11px] text-white/70">메인 이미지 교체: src/assets/home-hero.svg</p> : null}
            </div>
          </div>
          {loading ? <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden bg-white/20"><div className="h-full w-1/3 animate-pulse rounded-full bg-white/80" /></div> : null}
        </div>
        <div className="order-3">
          <LeaderColumn title="북극곰" periodLabel={groups.north.dataset?.periodLabel ?? ""} leaders={groups.north.leaders} achievementStacks={groups.north.achievementStacks} color="ice" onOpen={() => onOpen("north")} />
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["01", "월간 팬 수", "남극곰과 북극곰의 월간 기록을 비교해요."],
          ["02", "성장 순위", "직전 달 대비 상승량으로 멤버 순위를 확인해요."],
          ["03", "개인 추이", "닉네임을 눌러 선택 월 기준 최근 흐름을 살펴봐요."],
        ].map(([number, title, copy]) => <article key={number} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4"><span className="text-[11px] font-bold tracking-[0.2em] text-slate-400">{number}</span><h3 className="mt-2 text-sm font-bold text-slate-800">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></article>)}
      </section>
    </div>
  );
}
