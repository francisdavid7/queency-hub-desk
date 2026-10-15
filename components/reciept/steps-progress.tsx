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
    <div className="mt-4 overflow-x-auto rounded-lg border border-input bg-card p-4">
      <div className="flex min-w-max items-center gap-4">
      {steps.map((step) => {
        const stepIndex = step.id - 1;
        const isActive = stepIndex === currentStepIndex;
        const isComplete = stepIndex < currentStepIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
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
            <div>
              <h4 className="font-bold">{step.title}</h4>
              <p className="leading-3 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
            {step.border !== false && (
              <span className="block w-12 h-0.5 bg-primary/50"></span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default StepsProgress;
