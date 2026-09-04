type ReceiptStep =
  | "customer"
  | "new-customer"
  | "services"
  | "review"
  | "payment"
  | "preview";

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
  },
];

function CreateReceipt() {
  return (
    <section className="">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Create New Receipt
          </h1>

          <p className="text-sm text-muted-foreground">
            Generate a new receipt for a client.
          </p>
        </div>
      </div>
    </section>
  );
}

export default CreateReceipt;
