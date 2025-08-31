"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Partner { id: number; name: string }

export default function PartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const res = await api.get("/api/partners");
      setPartners(res.data || []);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await api.post("/api/partners", { name: name.trim() });
    setPartners((prev) => [...prev, res.data]);
    setName("");
  };

  const remove = async (id: number) => {
    await api.delete(`/api/partners/${id}`);
    setPartners((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Контрагенты</h1>

      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          placeholder="Название контрагента"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 rounded bg-gray-100 border-0 focus:outline-none focus:ring-0 focus:border-transparent flex-1"
        />
        <button className="btn btn-success btn-md" type="submit">Добавить</button>
      </form>

      <table className="table-box">
        <thead className="table-head">
          <tr>
            <th className="th">Название</th>
            <th className="th">Действия</th>
          </tr>
        </thead>
        <tbody className="tbody-divide">
          {partners.map((p) => (
            <tr key={p.id} className="row-hover">
              <td className="td">{p.name}</td>
              <td className="td">
                <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

