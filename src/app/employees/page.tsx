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

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/users/me");
      if (res.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const employeesRes = await api.get("/api/employees");
      setEmployees(employeesRes.data || []);
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
      await api.post("/api/employees", {
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
      <table className="min-w-full border mb-6 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Электронная почта</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} className="odd:bg-white even:bg-gray-50">
              <td className="border px-2 py-1">{e.id}</td>
              <td className="border px-2 py-1">{e.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <button type="submit" className="bg-green-600 text-white py-2 rounded">
          Создать
        </button>
        {message && <p className="text-sm mt-1">{message}</p>}
      </form>
    </div>
  );
}
