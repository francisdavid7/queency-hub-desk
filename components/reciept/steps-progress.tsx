import type { ReceiptStep } from "@/app/(app)/receipts/new/page";
import { Check } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Customer",
    description: "Find or add customer",
  },
  {
    id: 2,
    title: "Services",
    description: "Add services",
  },
  {
    id: 3,
    title: "Review",
    description: "Check order",
  },
  {
    id: 4,
    title: "Payment",
    description: "Collect payment",
  },
  {
    id: 5,
    title: "Receipt",
    description: "Generate & print",
    border: false,
  },
];

function StepsProgress({ currentStep }: { currentStep: ReceiptStep }) {
  const currentStepIndex = steps.findIndex(
    (step) => step.title.toLowerCase() === currentStep,
  );

  return (
    <div className="mt-4 rounded-lg border border-input bg-card p-3 sm:p-4">
      <div className="flex w-full items-start justify-between gap-1 sm:items-center sm:gap-4">
      {steps.map((step) => {
        const stepIndex = step.id - 1;
        const isActive = stepIndex === currentStepIndex;
        const isComplete = stepIndex < currentStepIndex;

        return (
          <div
            key={step.id}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-full ${
                isComplete
                  ? "bg-success text-success-foreground"
                  : isActive
                    ? "bg-primary font-bold text-primary-foreground"
                    : "border-2 border-input text-muted-foreground"
              }`}
            >
              {isComplete ? (
                <Check size={15} />
              ) : (
                step.id
              )}
            </span>
            <div className="min-w-0">
              <h4 className="truncate text-[11px] font-bold sm:text-sm">
                {step.title}
              </h4>
              <p className="hidden leading-3 text-xs text-muted-foreground md:block">
                {step.description}
              </p>
            </div>
            {step.border !== false && (
              <span className="hidden h-0.5 min-w-2 flex-1 bg-primary/30 sm:block"></span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default StepsProgress;
