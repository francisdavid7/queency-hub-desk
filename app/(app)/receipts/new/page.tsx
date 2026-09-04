"use client";
import StepsProgress from "@/components/reciept/steps-progress";
import Header from "@/components/shared/header";
import { useState } from "react";

export type ReceiptStep =
  | "customer"
  | "services"
  | "payment"
  | "review"
  | "receipt";

function CreateReceipt() {
  const [step, setStep] = useState<ReceiptStep>("customer");
  return (
    <section className="">
      {/* Header */}
      <Header
        heading="Create New Receipt"
        description="Generate a new receipt for a client."
      />

      <StepsProgress currentStep={step} />
    </section>
  );
}

export default CreateReceipt;
