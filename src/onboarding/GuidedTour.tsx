import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { useOnboarding } from "./OnboardingProvider";
import type { OnboardingPhase } from "./state";

type TourStep = {
  body: string;
  target: string;
  title: string;
};

type HighlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type PanelPlacement = {
  arrowLeft: string;
  arrowClassName: string;
  left: number;
  mode: "anchored" | "centered";
  side: "bottom" | "top";
  top: number;
};

const PANEL_WIDTH = 432;
const PANEL_GAP = 18;
const VIEWPORT_MARGIN = 16;

const setupSteps: TourStep[] = [
  {
    body: "ابدأ باختيار الدورة التي يعمل عليها الفريق. إن لم توجد دورة بعد، افتح صفحة الدورات وأنشئ واحدة.",
    target: "[data-onboarding='home-course-selector']",
    title: "الدورة أولا",
  },
  {
    body: "بطاقات الصفحة الرئيسية تختصر الوصول إلى أكثر الصفحات استخداما دون البحث في القوائم.",
    target: "[data-onboarding='home-actions']",
    title: "اختصارات العمل",
  },
  {
    body: "استخدم لوحة الإدارة لإضافة المجموعات والطلاب والمعلمين ومراجعة السجلات.",
    target: "[data-onboarding='home-dashboard-action']",
    title: "لوحة الإدارة",
  },
  {
    body: "بعد إضافة الطلاب، جرّب صفحة أخذ الحضور لتثبيت أول سير عمل يومي.",
    target: "[data-onboarding='home-attendance-action']",
    title: "أول حضور",
  },
  {
    body: "من القائمة الشخصية يمكنك فتح الشرح لاحقا أو الوصول إلى الحساب والإعدادات.",
    target: "[data-onboarding='account-menu']",
    title: "الشرح لا يختفي",
  },
];

const dailySteps: TourStep[] = [
  {
    body: "اختر الدورة التي تريد العمل عليها ثم انتقل مباشرة إلى الصفحة المناسبة.",
    target: "[data-onboarding='home-course-selector']",
    title: "اختيار الدورة",
  },
  {
    body: "افتح لوحة الإدارة عند الحاجة إلى الجداول الكاملة وإجراءات الإضافة والتعديل.",
    target: "[data-onboarding='home-dashboard-action']",
    title: "لوحة الإدارة",
  },
  {
    body: "أقسام اللوحة تجمع الطلاب والمجموعات والحضور والنقاط وباقي السجلات في مكان واحد.",
    target: "[data-onboarding='dashboard-nav']",
    title: "أقسام اللوحة",
  },
  {
    body: "أعلى كل جدول ستجد أدوات البحث والتحديث والإضافة عندما يكون القسم قابلا للإضافة.",
    target: "[data-onboarding='dashboard-table-tools']",
    title: "أدوات الجداول",
  },
  {
    body: "سجل الحضور اليومي من الاختصار السريع، خصوصا أثناء الحلقة.",
    target: "[data-onboarding='home-attendance-action']",
    title: "الحضور السريع",
  },
  {
    body: "راجع المخططات بعد تسجيل عدة جلسات لمعرفة نسب الحضور والتأخر.",
    target: "[data-onboarding='home-charts-action']",
    title: "مخططات الحضور",
  },
  {
    body: "القائمة الشخصية تجمع الحساب والإعدادات وزر إعادة فتح الشرح.",
    target: "[data-onboarding='account-menu']",
    title: "القائمة الشخصية",
  },
];

function getSteps(phase: OnboardingPhase) {
  return phase === "setup" ? setupSteps : dailySteps;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getHighlightRect(selector: string): HighlightRect | null {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function scrollTargetIntoView(selector: string) {
  document
    .querySelector(selector)
    ?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
}

function getPanelPlacement(rect: HighlightRect | null): PanelPlacement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = Math.min(PANEL_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);

  if (!rect || viewportWidth < 640) {
    return {
      arrowLeft: "50%",
      arrowClassName: "hidden",
      left: Math.round((viewportWidth - panelWidth) / 2),
      mode: "centered",
      side: "bottom",
      top: Math.round(Math.max(VIEWPORT_MARGIN, viewportHeight * 0.5 - 170)),
    };
  }

  const left = clamp(
    rect.left + rect.width / 2 - panelWidth / 2,
    VIEWPORT_MARGIN,
    viewportWidth - panelWidth - VIEWPORT_MARGIN,
  );
  const spaceBelow = viewportHeight - (rect.top + rect.height);
  const side = spaceBelow > 280 || rect.top < 280 ? "bottom" : "top";
  const top =
    side === "bottom"
      ? Math.min(rect.top + rect.height + PANEL_GAP, viewportHeight - 260)
      : Math.max(VIEWPORT_MARGIN, rect.top - 260 - PANEL_GAP);
  const targetCenter = rect.left + rect.width / 2;
  const arrowOffset = clamp(targetCenter - left - 8, 28, panelWidth - 36);

  return {
    arrowLeft: `${arrowOffset}px`,
    arrowClassName:
      side === "bottom"
        ? "top-[-7px] rotate-45"
        : "bottom-[-7px] rotate-45",
    left: Math.round(left),
    mode: "anchored",
    side,
    top: Math.round(top),
  };
}

export function GuidedTour() {
  const { activeTour, closeTour } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [placement, setPlacement] = useState<PanelPlacement>(() =>
    typeof window === "undefined"
      ? {
          arrowLeft: "50%",
          arrowClassName: "hidden",
          left: VIEWPORT_MARGIN,
          mode: "centered",
          side: "bottom",
          top: VIEWPORT_MARGIN,
        }
      : getPanelPlacement(null),
  );
  const steps = useMemo(
    () => (activeTour ? getSteps(activeTour.phase) : []),
    [activeTour],
  );
  const step = steps[stepIndex];

  useEffect(() => {
    setStepIndex(0);
  }, [activeTour?.id]);

  useEffect(() => {
    if (!step) {
      setHighlightRect(null);
      setPlacement(getPanelPlacement(null));
      return;
    }

    scrollTargetIntoView(step.target);

    const updateRect = () => {
      const nextRect = getHighlightRect(step.target);
      setHighlightRect(nextRect);
      setPlacement(getPanelPlacement(nextRect));
    };

    const timer = window.setTimeout(updateRect, 220);
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step]);

  if (!activeTour || !step) {
    return null;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const panelWidth = `min(${PANEL_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`;

  return (
    <>
      {highlightRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[95] rounded-2xl border-2 border-cedar bg-white/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.30),0_14px_34px_rgba(15,23,42,0.18)] ring-4 ring-cedar/15 transition-all duration-200"
          style={{
            height: highlightRect.height + 16,
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
          }}
        />
      ) : null}
      <Dialog open onOpenChange={(open) => !open && closeTour(true)}>
        <DialogContent
          aria-describedby="guided-tour-description"
          className={cn(
            "max-h-[calc(100vh-2rem)] overflow-visible rounded-2xl border-cedar/15 bg-white/95 p-0 text-right shadow-2xl shadow-slate-950/20 backdrop-blur",
            placement.mode === "centered" ? "translate-y-0" : "",
          )}
          dir="rtl"
          style={
            {
              left: placement.left,
              top: placement.top,
              transform: "none",
              width: panelWidth,
              "--arrow-left": placement.arrowLeft,
            } as CSSProperties
          }
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-[var(--arrow-left)] h-4 w-4 border border-cedar/15 bg-white/95",
              placement.arrowClassName,
            )}
          />
          <div className="overflow-hidden rounded-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-l from-cedar/10 via-white to-saffron/10 px-5 pb-4 pt-5">
              <DialogHeader className="mb-0 space-y-2">
                <div className="flex items-start justify-between gap-4 pl-9">
                  <p className="text-xs font-bold text-cedar">
                    الجولة {stepIndex + 1} من {steps.length}
                  </p>
                  {!highlightRect ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      العنصر غير ظاهر الآن
                    </span>
                  ) : null}
                </div>
                <DialogTitle className="pl-9 text-xl">{step.title}</DialogTitle>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-5 py-5">
              <DialogDescription
                className="text-base leading-8 text-slate-600"
                id="guided-tour-description"
              >
                <span aria-live="polite">{step.body}</span>
              </DialogDescription>

              <div
                aria-hidden="true"
                className="flex flex-row-reverse items-center gap-1.5"
              >
                {steps.map((tourStep, index) => (
                  <span
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === stepIndex
                        ? "w-8 bg-cedar"
                        : index < stepIndex
                          ? "w-3 bg-cedar/45"
                          : "w-3 bg-slate-200",
                    )}
                    key={`${tourStep.target}-${tourStep.title}`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  className="rounded-lg"
                  onClick={() => closeTour(true)}
                  type="button"
                  variant="outline"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  إنهاء
                </Button>
                <div className="flex gap-2">
                  <Button
                    className="rounded-lg"
                    disabled={isFirst}
                    onClick={() =>
                      setStepIndex((current) => Math.max(0, current - 1))
                    }
                    type="button"
                    variant="secondary"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    السابق
                  </Button>
                  <Button
                    className="rounded-lg"
                    onClick={() => {
                      if (isLast) {
                        closeTour(true);
                        return;
                      }

                      setStepIndex((current) => current + 1);
                    }}
                    type="button"
                  >
                    {isLast ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isLast ? "تم" : "التالي"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
