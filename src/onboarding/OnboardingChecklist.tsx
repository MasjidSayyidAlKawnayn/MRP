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
import { cn } from "../lib/utils";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cedar/15 bg-white/85 px-4 py-3 text-sm shadow-sm">
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
    <section className="rounded-2xl border border-cedar/15 bg-white/90 p-3 shadow-lg shadow-cedar/5 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-bold text-cedar">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {phase === "setup" ? "تجهيز أول استخدام" : "سير العمل اليومي"}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-8 text-ink sm:text-xl">
            {phase === "setup"
              ? "خطوات قصيرة لتجهيز المنصة"
              : "تذكير سريع بأهم أماكن العمل"}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-600">
            {phase === "setup"
              ? "اتبع ما يناسبك من هذه القائمة. البنود المرتبطة بالبيانات تكتمل تلقائيا عند توفرها."
              : "يمكنك إخفاء هذه القائمة أو فتح الجولة عند الحاجة، وسيبقى تقدم الشرح محفوظا لحسابك."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => openTour(phase)} size="sm" type="button">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            {wasTourSeen ? "إعادة الجولة" : "بدء الجولة"}
          </Button>
          <Button
            onClick={() => dismissChecklist(phase)}
            size="sm"
            type="button"
            variant="outline"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            إخفاء
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[12rem_1fr] lg:items-start">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
            <span>
              {completedCount} من {items.length}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-cedar transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-cedar" aria-hidden="true" />
            )}
            <span>
              {isLoading ? "جاري تحميل حالة الشرح..." : "التقدم محفوظ للحساب."}
            </span>
          </div>
          {error ? <p className="mt-2 text-xs text-amber-800">{error}</p> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isComplete = completedIds.includes(item.id);

            return (
              <button
                className={cn(
                  "flex min-h-[5.25rem] items-start gap-3 rounded-xl border px-3 py-3 text-right transition",
                  isComplete
                    ? "border-emerald-200/80 bg-emerald-50/60 text-slate-800"
                    : "border-slate-200 bg-white hover:border-cedar/25 hover:bg-cedar/5",
                )}
                disabled={isComplete}
                key={item.id}
                onClick={() => completeItem(item.id)}
                type="button"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    isComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-6">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-slate-600">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
