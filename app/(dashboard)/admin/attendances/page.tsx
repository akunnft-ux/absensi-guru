"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AttendancePage() {
  // Simplified for MVP: Just a form to pick date and status
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("hadir");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation for saving to Supabase would go here
    console.log("Saving attendance:", { date, status });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Input Absensi</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="hadir">Hadir</option>
          <option value="tidak_hadir">Tidak Hadir</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
        </select>
        <Button type="submit">Simpan Absensi</Button>
      </form>
    </div>
  );
}
