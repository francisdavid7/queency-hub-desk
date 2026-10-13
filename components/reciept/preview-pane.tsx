import { Card } from "../ui/card";
import CustomerBenefitCard from "./customer-benefit-card";

function PreviewPane() {
  return (
    <Card className="w-full lg:w-1/2 rounded-xl p-4">
      <CustomerBenefitCard />
    </Card>
  );
}

export default PreviewPane;
