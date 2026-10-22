import { useEffect, useMemo, useState } from "react";
import { EditableTable } from "../../components/EditableTable";
import { StatCard } from "../../components/StatCard";
import { AchievementName } from "../achievements/AchievementName";
import { buildMemberAchievementStacks } from "../achievements/achievementUtils";
import { formatNumber, formatRate, formatSignedNumber } from "../../lib/format";
import { dataRepository } from "../../lib/repository";
import type { FanGrowthCategory } from "../../lib/types";
import type { FanGrowthDataset } from "./fanGrowthTypes";
import {
  buildComputedRecords,
  buildTrendPoints,
  getCategoryTitle,
  getCategoryUnit,
  getPreviousPeriodId,
} from "./fanGrowthUtils";
import { TrendLineChart } from "./TrendLineChart";

type GeneralViewProps = {
  category: FanGrowthCategory;
  dataVersion: number;
};

const THEMES = {
  "south-monthly": {
    hero: "from-slate-950 via-slate-900 to-slate-800",
    badge: "bg-white/12 text-slate-100",
    card: "border-slate-800 bg-slate-950/80",
    cardLabel: "text-slate-300",
    cardValue: "text-white",
    rankCard: "border-slate-800 bg-slate-950 text-white",
    rankBadge: "bg-slate-100 text-slate-900",
    select: "border-white/20 bg-white/10 text-white",
    lineAccent: "text-slate-900",
    searchShell: "border-slate-200 bg-white",
  },
  "north-weekly": {
    hero: "from-sky-500 via-sky-400 to-cyan-300",
    badge: "bg-white/22 text-sky-950",
    card: "border-sky-200 bg-sky-50/90",
    cardLabel: "text-sky-700",
    cardValue: "text-sky-950",
    rankCard: "border-sky-200 bg-white text-sky-950",
    rankBadge: "bg-sky-100 text-sky-700",
    select: "border-white/40 bg-white/20 text-white",
    lineAccent: "text-sky-500",
    searchShell: "border-sky-200 bg-sky-50/60",
  },
  "north-monthly": {
    hero: "from-sky-500 via-sky-400 to-cyan-300",
    badge: "bg-white/22 text-sky-950",
    card: "border-sky-200 bg-sky-50/90",
    cardLabel: "text-sky-700",
    cardValue: "text-sky-950",
    rankCard: "border-sky-200 bg-white text-sky-950",
    rankBadge: "bg-sky-100 text-sky-700",
    select: "border-white/40 bg-white/20 text-white",
    lineAccent: "text-sky-500",
    searchShell: "border-sky-200 bg-sky-50/60",
  },
} as const;

type RankChange = {
  delta: number;
  direction: "up" | "down" | "same";
  tier: "normal" | "extreme";
};

type LoadedHistory = {
  category: FanGrowthCategory;
  dataVersion: number;
  datasets: FanGrowthDataset[];
};

const EMPTY_DATASETS: FanGrowthDataset[] = [];

function RankChangeIndicator({ rankChange }: { rankChange: RankChange | null }) {
  if (!rankChange) return null;

  if (rankChange.direction === "same") {
    return (
      <span
        className="inline-flex min-w-7 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600"
        title="순위 유지"
      >
        -
      </span>
    );
  }

  const isUp = rankChange.direction === "up";
  const isExtreme = rankChange.tier === "extreme";
  const arrow = isUp ? "▲" : "▼";
  const className = isUp
    ? isExtreme
      ? "border-pink-200 bg-pink-50 text-pink-500"
      : "border-rose-200 bg-rose-50 text-rose-600"
    : isExtreme
      ? "border-violet-200 bg-violet-50 text-violet-600"
      : "border-sky-200 bg-sky-50 text-sky-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}
      title={isUp ? `${rankChange.delta}등 상승` : `${rankChange.delta}등 하락`}
    >
      {arrow} {rankChange.delta}
    </span>
  );
}

export function GeneralView({ category, dataVersion }: GeneralViewProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [loadedHistory, setLoadedHistory] = useState<LoadedHistory | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState("");

  const theme = THEMES[category];
  const unit = getCategoryUnit(category);
  const previousLabel = `직전 ${unit}`;
  const currentLabel = `이번 ${unit}`;
  const isDataReady =
    loadedHistory?.category === category && loadedHistory.dataVersion === dataVersion;
  const historyDatasets = isDataReady ? loadedHistory.datasets : EMPTY_DATASETS;
  const datasetsByPeriod = useMemo(
    () => new Map(historyDatasets.map((item) => [item.periodId, item])),
    [historyDatasets],
  );
  const periods = useMemo(
    () =>
      historyDatasets.map((item) => ({
        category: item.category,
        periodId: item.periodId,
        periodLabel: item.periodLabel,
        uploadedAt: item.uploadedAt,
        recordCount: item.records.length,
      })),
    [historyDatasets],
  );
  const dataset = useMemo(
    () => datasetsByPeriod.get(selectedPeriodId) ?? null,
    [datasetsByPeriod, selectedPeriodId],
  );
  const selectedPeriodIndex = historyDatasets.findIndex((item) => item.periodId === selectedPeriodId);
  const achievementStacks = useMemo(
    () => buildMemberAchievementStacks(historyDatasets.slice(0, Math.max(0, selectedPeriodIndex + 1))),
    [historyDatasets, selectedPeriodIndex],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDatasets() {
      setIsLoadingData(true);
      setError("");

      try {
        const nextDatasets = await dataRepository.listDatasets(category);
        if (!isMounted) return;

        setLoadedHistory({ category, dataVersion, datasets: nextDatasets });
        setSelectedPeriodId((current) => {
          if (current && nextDatasets.some((item) => item.periodId === current)) {
            return current;
          }

          return nextDatasets.at(-1)?.periodId ?? "";
        });
      } catch (loadError) {
        console.error(loadError);
        if (!isMounted) return;
        setLoadedHistory({ category, dataVersion, datasets: [] });
        setSelectedPeriodId("");
        setError("데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    void loadDatasets();

    return () => {
      isMounted = false;
    };
  }, [category, dataVersion]);

  const computedRows = useMemo(() => buildComputedRecords(dataset?.records ?? []), [dataset]);
  const previousDataset = useMemo(() => {
    if (!dataset) return null;

    const previousPeriodId = getPreviousPeriodId(category, dataset.periodId);
    if (!previousPeriodId) return null;

    return datasetsByPeriod.get(previousPeriodId) ?? null;
  }, [category, dataset, datasetsByPeriod]);
  const previousRankByMemberId = useMemo(() => {
    const rankByMemberId = new Map<string, number>();
    if (!previousDataset) return rankByMemberId;

    let previousRank = 0;

    for (const row of buildComputedRecords(previousDataset.records)) {
      if (row.isNew) {
        continue;
      }

      previousRank += 1;
      rankByMemberId.set(row.memberId, previousRank);
    }

    return rankByMemberId;
  }, [previousDataset]);
  const rankedRows = useMemo(() => {
    let displayRank = 0;

    return computedRows.map((row) => {
      const currentRank = row.isNew ? null : ++displayRank;
      const previousRank =
        currentRank === null ? null : (previousRankByMemberId.get(row.memberId) ?? null);
      const movement =
        currentRank !== null && previousRank !== null ? previousRank - currentRank : 0;
      const rankChange =
        previousRank === null
          ? null
          : movement === 0
            ? ({
                delta: 0,
                direction: "same",
                tier: "normal",
              } satisfies RankChange)
          : ({
              delta: Math.abs(movement),
              direction: movement > 0 ? "up" : "down",
              tier: Math.abs(movement) >= 10 ? "extreme" : "normal",
            } satisfies RankChange);

      return {
        ...row,
        displayRank: currentRank,
        previousRank,
        rankChange,
      };
    });
  }, [computedRows, previousRankByMemberId]);
  const topRows = useMemo(
    () => rankedRows.filter((row) => !row.isNew).slice(0, 3),
    [rankedRows],
  );
  const totalIncrease = useMemo(
    () => computedRows.reduce((sum, row) => sum + row.increase, 0),
    [computedRows],
  );
  const totalCurrentFans = useMemo(
    () => computedRows.reduce((sum, row) => sum + row.currentFans, 0),
    [computedRows],
  );
  const averageGrowthRate = useMemo(() => {
    const validRates = computedRows
      .map((row) => row.increaseRate)
      .filter((value): value is number => value !== null);

    if (validRates.length === 0) return null;
    return validRates.reduce((sum, value) => sum + value, 0) / validRates.length;
  }, [computedRows]);
  const positiveGrowthCount = useMemo(
    () => computedRows.filter((row) => row.increase > 0).length,
    [computedRows],
  );
  const memberOptions = useMemo(() => {
    const namesByMemberId = new Map<string, string>();

    for (const item of historyDatasets) {
      if (item.category !== category) continue;

      for (const record of item.records) {
        namesByMemberId.set(record.memberId, record.name);
      }
    }

    return [...namesByMemberId.entries()]
      .map(([memberId, name]) => ({ memberId, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
  }, [category, historyDatasets]);

  useEffect(() => {
    setSelectedMemberId((current) =>
      current && memberOptions.some((option) => option.memberId === current) ? current : "",
    );
  }, [category, memberOptions]);

  const trendPoints = useMemo(
    () => buildTrendPoints(selectedMemberId, historyDatasets, selectedPeriodId),
    [selectedMemberId, historyDatasets, selectedPeriodId],
  );

  if (isLoadingData || !isDataReady) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-600">
        불러오는 중
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="space-y-4">
        <div
          className={`rounded-[32px] bg-gradient-to-br ${theme.hero} p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]`}
        >
          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
          >
            {getCategoryTitle(category)}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            {getCategoryTitle(category)}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            아직 등록된 데이터가 없습니다. 관리자 화면에서 JSON 파일을 업로드해 주세요.
          </p>
        </div>
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className={`rounded-[32px] bg-gradient-to-br ${theme.hero} p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] md:p-7`}
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
            >
              {getCategoryTitle(category)}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              {dataset?.periodLabel ?? getCategoryTitle(category)}
            </h2>
          </div>

          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="이전 달"
                disabled={selectedPeriodIndex <= 0}
                onClick={() => setSelectedPeriodId(historyDatasets[selectedPeriodIndex - 1]?.periodId ?? "")}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-lg hover:bg-white/25 disabled:opacity-30"
              >‹</button>
              <div className="text-lg font-semibold">{dataset?.periodLabel ?? "월 선택"}</div>
              <button
                type="button"
                aria-label="다음 달"
                disabled={selectedPeriodIndex < 0 || selectedPeriodIndex >= historyDatasets.length - 1}
                onClick={() => setSelectedPeriodId(historyDatasets[selectedPeriodIndex + 1]?.periodId ?? "")}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-lg hover:bg-white/25 disabled:opacity-30"
              >›</button>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, historyDatasets.length - 1)}
              step={1}
              value={Math.max(0, selectedPeriodIndex)}
              onChange={(event) => setSelectedPeriodId(historyDatasets[Number(event.target.value)]?.periodId ?? "")}
              aria-label="조회 월"
              className="mt-3 accent-white"
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/70">
              <span>{historyDatasets[0]?.periodLabel}</span>
              <span>{historyDatasets.at(-1)?.periodLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        직전 {unit} 수치가 0명인 항목은 <span className="font-semibold">신규</span>로 분류되어
        순위와 BEST 3에서 제외되고, 표의 맨 아래에 표시됩니다.
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="인원"
          value={`${computedRows.length}명`}
          className={theme.card}
          labelClassName={theme.cardLabel}
          valueClassName={theme.cardValue}
        />
        <StatCard
          label="전체 팬 수"
          value={formatNumber(totalCurrentFans)}
          className={theme.card}
          labelClassName={theme.cardLabel}
          valueClassName={theme.cardValue}
        />
        <StatCard
          label="증가량"
          value={formatSignedNumber(totalIncrease)}
          className={theme.card}
          labelClassName={theme.cardLabel}
          valueClassName={theme.cardValue}
        />
        <StatCard
          label="증가 인원"
          value={`${positiveGrowthCount}명`}
          className={theme.card}
          labelClassName={theme.cardLabel}
          valueClassName={theme.cardValue}
        />
        <StatCard
          label="평균 증가율"
          value={formatRate(averageGrowthRate)}
          className={theme.card}
          labelClassName={theme.cardLabel}
          valueClassName={theme.cardValue}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            {getCategoryTitle(category)} BEST 3
          </h3>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {topRows.length > 0 ? (
            topRows.map((row, index) => (
              <div
                key={row.memberId}
                className={`rounded-[28px] border p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${theme.rankCard}`}
              >
                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.rankBadge}`}
                >
                  BEST {index + 1}
                </div>
                <AchievementName name={row.name} stacks={achievementStacks.get(row.memberId) ?? 0} className="mt-4 text-2xl font-semibold tracking-tight" />
                <div className="mt-4 grid gap-2 text-sm opacity-80">
                  <div>{formatSignedNumber(row.increase)}</div>
                  <div>
                    {previousLabel} {formatNumber(row.previousFans)}
                  </div>
                  <div>
                    {currentLabel} {formatNumber(row.currentFans)}
                  </div>
                  <div>{formatRate(row.increaseRate)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-500 xl:col-span-3">
              신규를 제외하면 순위 데이터가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">
            {getCategoryTitle(category)} 리스트
          </h3>
              <span className="text-sm text-slate-500">{dataset?.periodLabel ?? selectedPeriodId}</span>
        </div>

        <EditableTable
          rows={rankedRows}
          getRowKey={(row) => row.memberId}
          emptyMessage="데이터 없음"
          columns={[
            {
              key: "rank",
              header: "순위",
              render: (row) =>
                row.isNew ? (
                  <span className="text-slate-400">-</span>
                ) : (
                  <span>{row.displayRank}</span>
                ),
            },
            {
              key: "name",
              header: "이름",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <RankChangeIndicator rankChange={row.rankChange} />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(row.memberId);
                      window.requestAnimationFrame(() => document.getElementById("member-trend")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }}
                    className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-sky-700"
                  ><AchievementName name={row.name} stacks={achievementStacks.get(row.memberId) ?? 0} /></button>
                </div>
              ),
            },
            {
              key: "previousFans",
              header: previousLabel,
              render: (row) => formatNumber(row.previousFans),
            },
            {
              key: "currentFans",
              header: currentLabel,
              render: (row) => formatNumber(row.currentFans),
            },
            {
              key: "increase",
              header: "증가량",
              render: (row) => formatSignedNumber(row.increase),
            },
            {
              key: "increaseRate",
              header: "증가율",
              render: (row) => formatRate(row.increaseRate),
            },
            {
              key: "status",
              header: "구분",
              render: (row) =>
                row.isNew ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    신규
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                ),
            },
          ]}
        />
      </section>

      <section id="member-trend" className={`scroll-mt-8 rounded-[32px] border p-5 ${theme.searchShell}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">MEMBER HISTORY</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">서클원별 증감 추이</h3>
          </div>
          <div className="w-full max-w-sm">
            <label htmlFor="member-trend-select" className="mb-1 block text-xs font-medium text-slate-500">닉네임</label>
            <select id="member-trend-select" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
              <option value="">닉네임을 선택하세요</option>
              {memberOptions.map(({ memberId, name }) => <option key={memberId} value={memberId}>{name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5">
          {selectedMemberId && trendPoints.length > 0 ? (
            <TrendLineChart points={trendPoints} accentClassName={theme.lineAccent} />
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              {selectedMemberId ? "선택한 월의 추이 데이터가 없습니다." : "표에서 닉네임을 누르면 선택한 월 기준 최근 7개월 추이를 보여줍니다."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
