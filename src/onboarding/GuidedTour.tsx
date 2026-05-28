import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
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

const setupSteps: TourStep[] = [
  {
    body: "ابدأ من اختيار الدورة. إذا لم توجد دورة بعد فافتح صفحة الدورات وأنشئ واحدة.",
    target: "[data-onboarding='home-course-selector']",
    title: "الدورة أولا",
  },
  {
    body: "بطاقات الصفحة الرئيسية تنقلك مباشرة إلى أكثر الصفحات استخداما دون البحث في القوائم.",
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
    body: "من القائمة الشخصية يمكنك فتح الشرح لاحقا أو الوصول للحساب والإعدادات.",
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
    body: "افتح لوحة الإدارة عندما تحتاج إلى الجداول الكاملة وإجراءات الإضافة والتعديل.",
    target: "[data-onboarding='home-dashboard-action']",
    title: "لوحة الإدارة",
  },
  {
    body: "داخل اللوحة ستجد الأقسام في القائمة الجانبية: الطلاب، المجموعات، الحضور، النقاط، وباقي السجلات.",
    target: "[data-onboarding='dashboard-nav']",
    title: "أقسام اللوحة",
  },
  {
    body: "أعلى كل جدول توجد أدوات البحث والتحديث والإضافة عندما يكون القسم قابلا للإضافة.",
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

function getHighlightRect(selector: string): HighlightRect | null {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

export function GuidedTour() {
  const { activeTour, closeTour } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
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
      return;
    }

    function updateRect() {
      setHighlightRect(getHighlightRect(step.target));
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step]);

  if (!activeTour || !step) {
    return null;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <>
      {highlightRect ? (
        <div
          className="pointer-events-none fixed z-[95] rounded-2xl border-2 border-saffron bg-saffron/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]"
          style={{
            height: highlightRect.height + 12,
            left: highlightRect.left - 6,
            top: highlightRect.top - 6,
            width: highlightRect.width + 12,
          }}
        />
      ) : null}
      <Dialog open onOpenChange={(open) => !open && closeTour(true)}>
        <DialogContent className="w-[min(92vw,30rem)]">
          <DialogHeader>
            <p className="text-xs font-bold text-cedar">
              خطوة {stepIndex + 1} من {steps.length}
            </p>
            <DialogTitle>{step.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-7 text-slate-600">{step.body}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={() => closeTour(true)}
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              إنهاء
            </Button>
            <div className="flex gap-2">
              <Button
                disabled={isFirst}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                type="button"
                variant="secondary"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                السابق
              </Button>
              <Button
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
        </DialogContent>
      </Dialog>
    </>
  );
}
