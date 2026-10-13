"use client";
import FindCustomer from "@/components/reciept/find-customer";
import PreviewPane from "@/components/reciept/preview-pane";
import StepsProgress from "@/components/reciept/steps-progress";
import Header from "@/components/shared/header";
import { db } from "@/db/db";
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

      <main className="mt-6 flex gap-3">
        <FindCustomer />
        <PreviewPane />
      </main>
    </section>
  );
}

export default CreateReceipt;
