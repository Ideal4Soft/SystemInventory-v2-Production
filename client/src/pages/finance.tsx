import FinanceView from "@/components/finance/finance-view";

export default function Finance() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Finance Page</h1>
      <p className="mb-6 text-xl">This is a test to see if the finance page is rendering correctly.</p>
      <div className="border p-4 rounded bg-gray-50">
        <FinanceView />
      </div>
    </div>
  );
}
