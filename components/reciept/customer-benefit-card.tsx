import { Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  "Quickly find them on future visits",
  "Keep receipts and transactions in one place",
  "Pre-fill customer details for faster checkout",
  "Build a reliable customer history",
];

function CustomerBenefitCard() {
  return (
    <Card className="w-full rounded-2xl bg-muted/20 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Why save a customer?
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-start gap-3 border p-4 rounded-lg"
            >
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-primary rounded-full">
                <Check
                  className="size-3 text-success-foreground"
                  strokeWidth={3}
                />
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {benefit}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerBenefitCard;
