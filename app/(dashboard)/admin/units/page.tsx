import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function UnitsPage() {
  const supabase = createClient();
  const { data: units, error } = await supabase.from("units").select("*");

  if (error) {
    return <div>Error loading units: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kelola Unit</h1>
        <Link href="/admin/units/new">
          <Button>Tambah Unit</Button>
        </Link>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {units?.map((unit) => (
              <tr key={unit.id} className="border-b">
                <td className="px-4 py-3">{unit.name}</td>
                <td className="px-4 py-3">{unit.code}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/units/${unit.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
