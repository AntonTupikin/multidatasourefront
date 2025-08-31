"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ClientProfile {
  type?: string;
  firstName?: string;
  lastName?: string;
  inn?: string;
  bankAccount?: string;
}

interface Client {
  id: number;
  email: string;
  phone: string;
  clientProfileResponse?: ClientProfile;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    // backend requires profileType and individual profile
    profileType: "INDIVIDUAL",
    firstName: "",
    lastName: "",
    inn: "",
    bankAccount: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const res = await api.get("/api/clients", { params: { size: 100 } });
      setClients(res.data?.content || []);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/clients", {
        email: form.email,
        phone: form.phone,
        profileType: form.profileType,
        individual: {
          firstName: form.firstName,
          lastName: form.lastName,
          inn: form.inn,
          bankAccount: form.bankAccount || undefined,
        },
      });
      setMessage("Клиент создан");
      setForm({
        email: "",
        phone: "",
        profileType: "INDIVIDUAL",
        firstName: "",
        lastName: "",
        inn: "",
        bankAccount: "",
      });
      load();
    } catch (err: any) {
      setMessage("Ошибка создания клиента");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить клиента?")) return;
    await api.delete(`/api/clients/${id}`);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Клиенты</h1>
      <table className="min-w-full mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Телефон</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{c.email}</td>
              <td className="px-4 py-3 text-sm text-gray-800">{c.phone}</td>
              <td className="px-4 py-3 text-sm text-gray-800 text-center">
                <button onClick={() => remove(c.id)} className="btn btn-danger btn-sm">
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="mb-3 btn btn-success btn-md">
          {showForm ? "Скрыть форму" : "Создать клиента"}
        </button>
        {showForm && (
          <form onSubmit={createClient} className="flex flex-col gap-2 max-w-md">
            <h2 className="text-xl font-semibold">Создать клиента</h2>
            <select
              name="profileType"
              value={form.profileType}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            >
              <option value="INDIVIDUAL">Физическое лицо</option>
            </select>
            <input
              name="email"
              type="email"
              placeholder="Электронная почта"
              value={form.email}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              name="phone"
              type="tel"
              placeholder="Телефон"
              value={form.phone}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                name="firstName"
                placeholder="Имя"
                value={form.firstName}
                onChange={handleChange}
                className="border p-2 rounded"
                required
              />
              <input
                name="lastName"
                placeholder="Фамилия"
                value={form.lastName}
                onChange={handleChange}
                className="border p-2 rounded"
                required
              />
            </div>
            <input
              name="inn"
              placeholder="ИНН"
              value={form.inn}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              name="bankAccount"
              placeholder="Банковский счет (необязательно)"
              value={form.bankAccount}
              onChange={handleChange}
              className="border p-2 rounded"
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
