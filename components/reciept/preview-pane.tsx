import { useSearchField } from "@/hooks/custom/use-search-field";
import { Card } from "../ui/card";
import CustomerBenefitCard from "./customer-benefit-card";
import CustomerInformation from "./customer-information";
import { useLiveQuery } from "dexie-react-hooks";
import { activeCustomers } from "@/db/db";

function PreviewPane({ onContinue }: { onContinue: () => void }) {
  const customers = useLiveQuery(() => activeCustomers().toArray(), [], []);
  const { selectedCustomerId } = useSearchField();

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <Card className="w-full lg:w-1/2 rounded-xl p-4">
      {selectedCustomerId === null && <CustomerBenefitCard />}

      {selectedCustomer && (
        <CustomerInformation
          customer={selectedCustomer}
          onContinue={onContinue}
        />
      )}
    </Card>
  );
}

export default PreviewPane;
