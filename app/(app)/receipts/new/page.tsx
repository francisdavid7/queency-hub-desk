"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";

import CustomerInformation from "@/components/reciept/customer-information";
import FindCustomer from "@/components/reciept/find-customer";
import ReceiptGenerated from "@/components/reciept/receipt-generated";
import ReceiptPaymentStep from "@/components/reciept/receipt-payment-step";
import ReceiptReviewStep from "@/components/reciept/receipt-review-step";
import ReceiptServicesStep, {
  type ReceiptCart,
} from "@/components/reciept/receipt-services-step";
import StepsProgress from "@/components/reciept/steps-progress";
import Header from "@/components/shared/header";
import GsapTransition from "@/components/shared/gsap-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeCustomers, db, type PaymentMethod } from "@/db/db";
import {
  createReceipt,
  updateReceiptPayment,
} from "@/lib/actions/receipt-actions";
import { useSearchField } from "@/hooks/custom/use-search-field";
import { useCashierSession } from "@/hooks/custom/use-cashier-session";
import { formatPrice, roundMoney } from "@/lib/money";
import type { Receipt } from "@/types/receipt";
import type { ReceiptItem } from "@/types/receipt-item";

export type ReceiptStep =
  | "customer"
  | "services"
  | "review"
  | "payment"
  | "receipt";

function CreateReceipt() {
  const [step, setStep] = useState<ReceiptStep>("customer");
  const [cart, setCart] = useState<ReceiptCart>([]);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  const [savedItems, setSavedItems] = useState<ReceiptItem[]>([]);
  const { selectedCustomerId, setSelectedCustomerId, setSearchField } =
    useSearchField();
  const customers = useLiveQuery(() => activeCustomers().toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const session = useCashierSession();
  const subtotal = useMemo(
    () =>
      roundMoney(
        cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      ),
    [cart],
  );
  const discountAmount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = roundMoney(subtotal - discountAmount);

  const handleWalkIn = () => {
    setIsWalkIn(true);
    setSelectedCustomerId(null);
  };

  const handleGenerateReceipt = async () => {
    if (!isWalkIn && !selectedCustomer) {
      toast.error("Select a customer before generating the receipt");
      setStep("customer");
      return;
    }

    const items = cart
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        serviceCategory: item.serviceCategory,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

    if (items.length === 0) {
      toast.error("Add at least one service before generating the receipt");
      setStep("services");
      return;
    }

    setIsSaving(true);
    try {
      let receipt = savedReceipt;
      if (receipt) {
        receipt = await updateReceiptPayment(
          receipt.id,
          paymentMethod,
          Number(amountPaid),
          notes,
        );
      } else {
        const created = await createReceipt({
          customerId: isWalkIn ? undefined : selectedCustomer?.id,
          paymentMethod,
          amountPaid: Number(amountPaid),
          discount: discountAmount,
          notes,
          items,
        });
        receipt = created.receipt;
        setSavedItems(created.receiptItems);
      }
      setSavedReceipt(receipt);
      setStep("receipt");
      toast.success("Receipt generated", {
        description: receipt.receiptNumber,
      });
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      toast.error("Unable to generate receipt", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startNewReceipt = () => {
    setCart([]);
    setIsWalkIn(false);
    setNotes("");
    setDiscount("");
    setPaymentMethod("CASH");
    setAmountPaid("");
    setSavedReceipt(null);
    setSavedItems([]);
    setSelectedCustomerId(null);
    setSearchField("");
    setStep("customer");
  };

  const renderCustomerStep = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <FindCustomer onWalkIn={handleWalkIn} />
      {selectedCustomer ? (
        <CustomerInformation
          customer={selectedCustomer}
          onContinue={() => {
            setIsWalkIn(false);
            setStep("services");
          }}
        />
      ) : isWalkIn ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Walk-in customer selected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This receipt will be created without linking it to a saved
              customer record.
            </p>
            <Button className="w-full" onClick={() => setStep("services")}>
              Continue to Services
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="hidden h-fit xl:flex">
          <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
            <p className="font-semibold">Select a customer to continue</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Search for an existing customer, create a new one, or select a
              walk-in customer.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep = () => {
    if (step === "customer") return renderCustomerStep();

    if (step === "services") {
      return (
        <ReceiptServicesStep
          cart={cart}
          onChange={setCart}
          onBack={() => setStep("customer")}
          onContinue={() => setStep("review")}
        />
      );
    }

    if (step === "review") {
      return (
        <ReceiptReviewStep
          customer={selectedCustomer ?? null}
          isWalkIn={isWalkIn}
          cart={cart}
          notes={notes}
          onNotesChange={setNotes}
          discount={discount}
          onDiscountChange={setDiscount}
          locked={savedReceipt !== null}
          onBack={() => setStep("services")}
          onContinue={() => {
            if (!amountPaid) setAmountPaid(total.toFixed(2));
            setStep("payment");
          }}
        />
      );
    }

    if (step === "payment") {
      return (
        <ReceiptPaymentStep
          total={total}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          amountPaid={amountPaid}
          onAmountPaidChange={setAmountPaid}
          isSaving={isSaving}
          onBack={() => setStep("review")}
          onGenerate={() => void handleGenerateReceipt()}
        />
      );
    }

    if (step === "receipt" && savedReceipt) {
      return (
        <ReceiptGenerated
          receipt={savedReceipt}
          customer={selectedCustomer ?? null}
          isWalkIn={isWalkIn}
          services={services}
          receiptItems={savedItems}
          cashierName={session?.name}
          onBack={() => setStep("payment")}
          onNewReceipt={startNewReceipt}
        />
      );
    }

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-semibold">Receipt preview is unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate the receipt again to restore its preview.
          </p>
          <Button className="mt-4" onClick={() => setStep("payment")}>
            Back to Payment
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="space-y-5">
      <Header
        heading="Create New Receipt"
        description="Select a customer, add services, and complete payment."
      />

      <StepsProgress currentStep={step} />

      {step !== "receipt" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {selectedCustomer
              ? `Customer: ${selectedCustomer.name}`
              : isWalkIn
                ? "Walk-in customer"
                : "No customer selected"}
          </span>
          {step !== "customer" && (
            <span className="font-semibold tabular-nums">
              Current total: {formatPrice(total)}
            </span>
          )}
        </div>
      )}

      <GsapTransition animationKey={step} className="min-w-0">
        {renderStep()}
      </GsapTransition>
    </section>
  );
}

export default CreateReceipt;
