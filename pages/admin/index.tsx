import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

export default function AdminHome() {
  const { role, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (role !== 'owner') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/products" className="block p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition">
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-gray-600 mt-1">Create, edit, delete, and bulk-adjust stock.</p>
        </Link>
        <Link href="/admin/orders" className="block p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition">
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-sm text-gray-600 mt-1">Filter by status, verify bank slips, update status.</p>
        </Link>
        <Link href="/admin/customers" className="block p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition">
          <h2 className="text-lg font-semibold">Customers</h2>
          <p className="text-sm text-gray-600 mt-1">Search, manage active status and details.</p>
        </Link>
        <Link href="/admin/analytics" className="block p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Totals, revenue, status breakdown, low-stock items.</p>
        </Link>
      </div>
    </div>
  );
}
