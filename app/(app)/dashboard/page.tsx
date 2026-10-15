import DashboardOverview from "@/components/dashboard/dashboard-overview";
import RecentTransactionsSection from "@/components/dashboard/recent-transaction-section";

function Dashboard() {
  return (
    <section>
      <DashboardOverview />
      <RecentTransactionsSection />
    </section>
  );
}

export default Dashboard;
