"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Employee {
  id: number;
  email: string;
}

interface Organization {
  id: number;
  title: string;
  inn: string;
  employees: Employee[];
}

export default function OrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const res = await api.get(`/api/organization/${id}`);
      setOrg(res.data);
    } catch {
      router.push("/login");
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/organization/${id}/employees`, {
        email: form.email,
        password: form.password,
      });
      setMessage("Работник создан");
      setForm({ email: "", password: "" });
      load();
    } catch {
      setMessage("Ошибка создания");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      {org && (
        <>
          <h1 className="text-2xl font-bold mb-4">{org.title}</h1>
          <h2 className="text-xl font-semibold mb-2">Работники</h2>
          <table className="min-w-full border mb-6 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Email</th>
              </tr>
            </thead>
            <tbody>
              {org.employees.map((e) => (
                <tr key={e.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-2 py-1">{e.id}</td>
                  <td className="border px-2 py-1">{e.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <form onSubmit={createEmployee} className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-semibold">Создать работника</h2>
        <input
          name="email"
          type="email"
          className="border p-2 rounded"
          placeholder="Электронная почта"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          className="border p-2 rounded"
          placeholder="Пароль"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" className="bg-green-600 text-white py-2 rounded">
          Создать
        </button>
        {message && <p className="text-sm mt-1">{message}</p>}
      </form>
    </div>
  );
}

