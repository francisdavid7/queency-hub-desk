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
    title: "Payment",
    description: "Collect payment",
  },
  {
    id: 4,
    title: "Review",
    description: "Check order",
  },
  {
    id: 5,
    title: "Receipt",
    description: "Generate & print",
    border: false,
  },
];

function StepsProgress({ currentStep }: { currentStep: ReceiptStep }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      {steps.map((step) => {
        const isActive = step.title.toLowerCase() === currentStep;

        const activeStep = steps.find(
          (st) => st.title.toLowerCase() === currentStep,
        );

        return (
          <div key={step.id} className="flex items-center gap-1">
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "border-2 border-input"} ${activeStep && step.id < activeStep.id ? "bg-success text-success-foreground" : "border-0"}`}
            >
              {activeStep && step.id < activeStep.id ? (
                <Check size={15} />
              ) : (
                <>{step.id}</>
              )}
            </span>
            <div>
              <h4 className="font-bold">{step.title}</h4>
              <p className="leading-3 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
            {step.border !== false && (
              <span className="block w-16 h-0.5 bg-primary/50"></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepsProgress;
