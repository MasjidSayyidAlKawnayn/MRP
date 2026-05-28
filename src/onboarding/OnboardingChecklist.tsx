import {
  Check,
  CheckCircle2,
  Circle,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useOnboarding } from "./OnboardingProvider";
import {
  buildOnboardingChecklist,
  getCompletedChecklistIds,
  getTourIdForPhase,
  resolveOnboardingPhase,
  type WorkspaceOnboardingFacts,
} from "./state";

type OnboardingChecklistProps = {
  facts: WorkspaceOnboardingFacts;
};

export function OnboardingChecklist({ facts }: OnboardingChecklistProps) {
  const {
    completeItem,
    dismissChecklist,
    error,
    isLoading,
    openTour,
    resetOnboarding,
    state,
  } = useOnboarding();
  const phase = resolveOnboardingPhase(facts);
  const items = buildOnboardingChecklist(phase, facts);
  const completedIds = getCompletedChecklistIds(state, items);
  const completedCount = items.filter((item) => completedIds.includes(item.id)).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);
  const tourId = getTourIdForPhase(phase);
  const wasTourSeen = state.dismissedTourIds.includes(tourId);

  if (state.checklistDismissedPhases.includes(phase)) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cedar/15 bg-white/80 px-4 py-3 text-sm shadow-sm">
        <span className="font-bold text-slate-700">
          الشرح مخفي لهذه المرحلة.
        </span>
        <Button onClick={resetOnboarding} size="sm" type="button" variant="outline">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          إظهار الشرح
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-cedar/15 bg-white/92 p-4 shadow-xl shadow-cedar/5 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-cedar/10 px-3 py-1 text-xs font-bold text-cedar">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {phase === "setup" ? "تجهيز أول استخدام" : "سير العمل اليومي"}
          </p>
          <h2 className="mt-3 text-xl font-bold text-ink sm:text-2xl">
            {phase === "setup"
              ? "لنجهز المنصة بدون إزعاج"
              : "اختصار هادئ لما يهمك يوميا"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {phase === "setup"
              ? "اتبع هذه الخطوات بالترتيب المناسب لك. البنود التي اكتملت من البيانات ستظهر منجزة تلقائيا."
              : "هذه القائمة تساعد المستخدم الجديد على فهم الأماكن المهمة، ويمكن إخفاؤها أو فتح الجولة عند الحاجة."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => openTour(phase)} type="button">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            {wasTourSeen ? "إعادة الجولة" : "بدء جولة قصيرة"}
          </Button>
          <Button
            onClick={() => dismissChecklist(phase)}
            type="button"
            variant="outline"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            إخفاء
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
          <span>{completedCount} من {items.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-cedar transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-2 lg:grid-cols-2">
        {items.map((item) => {
          const isComplete = completedIds.includes(item.id);

          return (
            <button
              className={`flex min-h-20 items-start gap-3 rounded-2xl border px-3 py-3 text-right transition ${
                isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white hover:border-cedar/25 hover:bg-cedar/5"
              }`}
              disabled={isComplete}
              key={item.id}
              onClick={() => completeItem(item.id)}
              type="button"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="mt-1 block text-xs leading-6 text-slate-600">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isLoading ? "جاري تحميل حالة الشرح..." : "تقدم الشرح محفوظ للحساب."}
        </span>
        {error ? <span className="text-amber-800">{error}</span> : null}
      </div>
    </section>
  );
}
