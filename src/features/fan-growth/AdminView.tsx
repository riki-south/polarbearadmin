import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { EditableTable } from "../../components/EditableTable";
import {
  getStoredAdminState,
  lockAdminSession,
  signInAdmin,
} from "../../lib/admin";
import { readJsonFile } from "../../lib/file";
import { formatDateTime } from "../../lib/format";
import { dataRepository } from "../../lib/repository";
import type { FanGrowthCategory } from "../../lib/types";
import type { FanGrowthPeriodSummary } from "./fanGrowthTypes";
import {
  FAN_GROWTH_CATEGORIES,
  getCategoryTitle,
  normalizeUploadedDataset,
} from "./fanGrowthUtils";

type AdminViewProps = {
  dataVersion: number;
  onAdminAccessChange: (unlocked: boolean) => void;
  onDatasetUpdated: (category: FanGrowthCategory) => void;
};

const CARD_THEMES = {
  "south-monthly": {
    shell: "border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#eef2ff_100%)]",
    badge: "bg-slate-900 text-white",
    action: "bg-slate-900 text-white hover:bg-slate-800",
  },
  "north-weekly": {
    shell: "border-sky-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#ecfeff_100%)]",
    badge: "bg-sky-500 text-white",
    action: "bg-sky-500 text-white hover:bg-sky-400",
  },
  "north-monthly": {
    shell: "border-sky-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#ecfeff_100%)]",
    badge: "bg-sky-500 text-white",
    action: "bg-sky-500 text-white hover:bg-sky-400",
  },
} as const;

async function fetchPeriodsByCategory(): Promise<
  Record<FanGrowthCategory, FanGrowthPeriodSummary[]>
> {
  const entries = await Promise.all(
    FAN_GROWTH_CATEGORIES.map(async (category) => [
      category,
      await dataRepository.listPeriods(category),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<
    FanGrowthCategory,
    FanGrowthPeriodSummary[]
  >;
}

export function AdminView({
  dataVersion,
  onAdminAccessChange,
  onDatasetUpdated,
}: AdminViewProps) {
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => getStoredAdminState());
  const [periodsByCategory, setPeriodsByCategory] = useState<
    Record<FanGrowthCategory, FanGrowthPeriodSummary[]>
  >({
    "south-monthly": [],
    "north-weekly": [],
    "north-monthly": [],
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [uploadingCategory, setUploadingCategory] = useState<FanGrowthCategory | null>(null);
  const southMonthlyInputRef = useRef<HTMLInputElement | null>(null);
  const northMonthlyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPeriods() {
      try {
        const nextPeriods = await fetchPeriodsByCategory();

        if (!isMounted) return;

        setPeriodsByCategory(nextPeriods);
      } catch (loadError) {
        console.error(loadError);
        if (!isMounted) return;
        setError("목록을 불러오지 못했습니다.");
      }
    }

    void loadPeriods();

    return () => {
      isMounted = false;
    };
  }, [dataVersion]);

  async function handleUnlock() {
    setIsSigningIn(true);
    setError("");
    setNotice("");

    try {
      await signInAdmin(password);

      setIsUnlocked(true);
      onAdminAccessChange(true);
      setPassword("");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleLock() {
    lockAdminSession();
    setIsUnlocked(false);
    onAdminAccessChange(false);
    setNotice("");
    setError("");
    setPassword("");
  }

  async function refreshPeriods() {
    setPeriodsByCategory(await fetchPeriodsByCategory());
  }

  async function handleFileUpload(
    category: FanGrowthCategory,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCategory(category);
    setError("");
    setNotice("");

    try {
      const payload = await readJsonFile(file);
      const dataset = normalizeUploadedDataset(payload, category);

      await dataRepository.upsertDataset(dataset);
      await refreshPeriods();
      setNotice(`${dataset.periodLabel} 업로드가 완료되었습니다.`);
      onDatasetUpdated(category);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingCategory(null);
      event.target.value = "";
    }
  }

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:p-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">관리자 로그인</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleUnlock();
              }
            }}
            placeholder="비밀번호"
          />
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={isSigningIn || !password}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            {isSigningIn ? "로그인 중..." : "관리자 로그인"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">관리자</h2>
          <button
            type="button"
            onClick={handleLock}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            잠그기
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {FAN_GROWTH_CATEGORIES.map((category) => {
          const theme = CARD_THEMES[category];
          const periods = periodsByCategory[category];
          const inputRef =
            category === "south-monthly"
              ? southMonthlyInputRef
              : northMonthlyInputRef;
          const isUploading = uploadingCategory === category;
          const isBusy = uploadingCategory !== null;

          return (
            <div
              key={category}
              className={`rounded-[32px] border p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] ${theme.shell}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
                  >
                    {getCategoryTitle(category)}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-900">월간 JSON 업로드</h3>
                    <button
                      type="button"
                      aria-label="JSON 업로드 안내"
                      title="UTF-8로 저장한 JSON 객체를 선택해 주세요. 최상위 periodId는 YYYY-MM 형식이고, records 배열에는 각 멤버의 memberId, name(또는 nickname), currentFans가 필요합니다. previousFans는 생략하면 직전 월 기록에서 자동으로 가져옵니다. memberId는 해당 서클 기준표에 등록된 고유 ID여야 하며 중복 ID는 허용되지 않습니다. 같은 연월을 다시 올리면 해당 월 데이터가 교체됩니다. 화면에는 memberId를 표시하지 않습니다."
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:border-slate-500 hover:text-slate-800"
                    >ⓘ</button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isBusy}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.action}`}
                  >
                    {isUploading ? "업로드 중" : "월간 데이터 업로드"}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <EditableTable
                  rows={periods}
                  getRowKey={(row) => row.periodId}
                  emptyMessage="업로드 이력이 없습니다."
                  columns={[
                    {
                      key: "periodLabel",
                      header: "기간",
                      render: (row) => (
                        <div>
                          <div className="font-semibold text-slate-900">{row.periodLabel}</div>
                          <div className="text-xs text-slate-500">{row.periodId}</div>
                        </div>
                      ),
                    },
                    {
                      key: "recordCount",
                      header: "건수",
                      render: (row) => `${row.recordCount}명`,
                    },
                    {
                      key: "uploadedAt",
                      header: "업로드 일시",
                      render: (row) => formatDateTime(row.uploadedAt),
                    },
                  ]}
                />
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => void handleFileUpload(category, event)}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
