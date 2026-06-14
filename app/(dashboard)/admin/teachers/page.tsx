import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function TeachersPage() {
  const supabase = createClient();
  const { data: teachers, error } = await supabase.from("teachers").select("*, units(name)");

  if (error) {
    return <div>Error loading teachers: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Kelola Guru</h1>
      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {teachers?.map((teacher) => (
              <tr key={teacher.id} className="border-b">
                <td className="px-4 py-3">{teacher.name}</td>
                <td className="px-4 py-3">{teacher.nip}</td>
                <td className="px-4 py-3">{teacher.units?.name}</td>
                <td className="px-4 py-3">{teacher.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
