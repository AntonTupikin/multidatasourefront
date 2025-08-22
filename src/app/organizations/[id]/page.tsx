"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Employee {
  id: number;
  email: string;
  organizationsResponses?: { id: number }[];
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
  const [showAdd, setShowAdd] = useState(false);
  const [available, setAvailable] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const orgRes = await api.get(`/api/organization/${id}`);
      const employeesRes = await api.get("/api/employees/getAll", {
        params: { organizationId: Number(id) },
      });
      setOrg({ ...orgRes.data, employees: employeesRes.data.content || [] });
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
      const created = await api.post("/api/employees", {
        email: form.email,
        password: form.password,
      });
      await api.patch(`/api/employees/${created.data.id}`, {
        organizationIds: [Number(id)],
      });
      setMessage("Работник создан");
      setForm({ email: "", password: "" });
      load();
    } catch {
      setMessage("Ошибка создания");
    }
  };

  const toggleAdd = async () => {
    if (!showAdd) {
      const res = await api.get("/api/employees/getAll", {
        params: { organizationIdNot: Number(id) },
      });
      const all: Employee[] = res.data.content || [];
      setAvailable(all);
    }
    setShowAdd(!showAdd);
  };

  const assign = async (employee: Employee) => {
    // fetch actual organizations to preserve previous assignments
    const detail = await api.get(`/api/employees/${employee.id}`);
    const existing =
      detail.data.organizationsResponses?.map((o: { id: number }) => o.id) || [];
    await api.patch(`/api/employees/${employee.id}`, {
      organizationIds: [...existing, Number(id)],
    });
    setAvailable((prev) => prev.filter((e) => e.id !== employee.id));
    load();
  };

  const remove = async (employee: Employee) => {
    try {
      const existing = employee.organizationsResponses?.map((o) => o.id) || [];
      await api.patch(`/api/employees/${employee.id}`, {
        organizationIds: existing.filter((orgId) => orgId !== Number(id)),
      });
      setOrg((prev) =>
        prev
          ? {
              ...prev,
              employees: prev.employees.filter((e) => e.id !== employee.id),
            }
          : prev,
      );
    } catch {
      setMessage("Ошибка удаления");
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
                <th className="border px-2 py-1">Электронная почта</th>
                <th className="border px-2 py-1">Действия</th>
              </tr>
            </thead>
            <tbody>
              {org.employees?.map((e) => (
                <tr key={e.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-2 py-1">{e.email}</td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      className="text-sm bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={toggleAdd}
            className="mb-4 bg-blue-600 text-white px-3 py-1 rounded"
          >
            Добавить работника
          </button>
          {showAdd && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                Доступные работники
              </h3>
              {available.length > 0 ? (
                <ul className="border rounded">
                  {available.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between items-center border-b last:border-b-0 px-2 py-1"
                    >
                      <span>{e.email}</span>
                      <button
                        type="button"
                        onClick={() => assign(e)}
                        className="text-sm bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Назначить
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">Нет работников</p>
              )}
            </div>
          )}
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

