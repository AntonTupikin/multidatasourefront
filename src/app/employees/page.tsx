"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function EmployeesPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/api/users/me")
      .then((res) => {
        if (res.data.role !== "SUPERVISOR") {
          router.push("/dashboard");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

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
    } catch {
      setMessage("Ошибка создания");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Создать работника</h1>
      <form onSubmit={createEmployee} className="flex flex-col gap-4">
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
