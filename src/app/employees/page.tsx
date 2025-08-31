"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Employee {
  id: number;
  email: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/users/me");
      if (res.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const employeesRes = await api.get("/api/users");
      // API returns a page object; extract content array
      setEmployees(employeesRes.data?.content || []);
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

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/users/employees", {
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
      <h1 className="text-2xl font-bold mb-4">Мои работники</h1>
      <table className="min-w-full mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Электронная почта</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {employees.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{e.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="mb-3 btn btn-success btn-md">
          {showForm ? "Скрыть форму" : "Создать работника"}
        </button>
        {showForm && (
          <form onSubmit={createEmployee} className="flex flex-col gap-4 max-w-md">
            <h2 className="text-xl font-semibold">Создать работника</h2>
            <input
              name="email"
              type="email"
              placeholder="Электронная почта"
              value={form.email}
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <input
              name="password"
              type="password"
              placeholder="Пароль"
              value={form.password}
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
