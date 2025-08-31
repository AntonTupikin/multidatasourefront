"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Organization {
  id: number;
  title: string;
  inn: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState({ title: "", inn: "" });
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/users/me");
      if (res.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const orgsRes = await api.get("/api/organization");
      setOrgs(orgsRes.data || []);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/organization", {
        title: form.title,
        inn: Number(form.inn),
      });
      setMessage("Организация создана");
      setForm({ title: "", inn: "" });
      load();
    } catch {
      setMessage("Ошибка создания");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Мои организации</h1>
      <table className="min-w-full mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Название</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">ИНН</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orgs.map((o) => (
            <tr
              key={o.id}
              onClick={() => router.push(`/organizations/${o.id}`)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-sm text-gray-800">{o.title}</td>
              <td className="px-4 py-3 text-sm text-gray-800">{o.inn}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="mb-3 btn btn-success btn-md">
          {showForm ? "Скрыть форму" : "Создать организацию"}
        </button>
        {showForm && (
          <form onSubmit={createOrg} className="flex flex-col gap-2 max-w-md">
            <h2 className="text-xl font-semibold">Создать организацию</h2>
            <input
              name="title"
              className="border p-2 rounded"
              placeholder="Название"
              value={form.title}
              onChange={handleChange}
            />
            <input
              name="inn"
              className="border p-2 rounded"
              placeholder="ИНН"
              value={form.inn}
              onChange={handleChange}
            />
            <button type="submit" className="btn btn-success btn-md">
              Создать
            </button>
            {message && <p className="text-sm mt-1">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
