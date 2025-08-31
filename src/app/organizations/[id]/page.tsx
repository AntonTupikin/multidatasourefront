"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface User {
  id: number;
  username?: string;
  email: string;
  role?: string;
}

interface Organization {
  id: number;
  title: string;
  inn: number;
  users: User[];
}

interface Project {
  id: number;
  title: string;
  projectStatus?: string;
}

export default function OrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [available, setAvailable] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const orgRes = await api.get(`/api/organization/${id}`);
      const usersRes = await api.get("/api/users", {
        params: { organizationId: Number(id) },
      });
      const projectsRes = await api.get("/api/projects", {
        params: { organizationId: Number(id), size: 100 },
      });
      // API returns a page object; extract content array
      setOrg({
        ...orgRes.data,
        users: usersRes.data?.content || [],
      });
      setProjects(projectsRes.data?.content || []);
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
      const created = await api.post("/api/users/employees", {
        email: form.email,
        password: form.password,
      });
      // add the new user to the organization by editing the organization
      const existing = org?.users.map((e) => e.id) || [];
      await api.patch(`/api/organization/${id}`, {
        usersIds: [...existing, created.data.id],
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
      const res = await api.get("/api/users", {
        params: { notLinkedToOrganizationId: Number(id) },
      });
      // API returns a page object; extract content array
      const all: User[] = res.data?.content || [];
      setAvailable(all);
    }
    setShowAdd(!showAdd);
  };

  const assign = async (user: User) => {
    // update organization with the new set of users
    const existing = org?.users.map((e) => e.id) || [];
    await api.patch(`/api/organization/${id}`, {
      usersIds: [...existing, user.id],
    });
    setAvailable((prev) => prev.filter((e) => e.id !== user.id));
    load();
  };

  const remove = async (user: User) => {
    try {
      // edit organization to remove the user
      const existing = org?.users.map((e) => e.id) || [];
      await api.patch(`/api/organization/${id}`, {
        usersIds: existing.filter((empId: number) => empId !== user.id),
      });
      setOrg((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.filter((e) => e.id !== user.id),
            }
          : prev,
      );
    } catch {
      setMessage("Ошибка удаления");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      {org && (
        <>
          <h1 className="text-2xl font-bold mb-6">{org.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* LEFT: Employees block */}
            <div className="card p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Работники</h2>
              </div>
              <table className="table-box mb-4">
                <thead className="table-head">
                  <tr>
                    <th className="th">Электронная почта</th>
                    <th className="th">Действия</th>
                  </tr>
                </thead>
                <tbody className="tbody-divide">
                  {org.users?.map((u) => (
                    <tr key={u.id} className="row-hover">
                      <td className="td">{u.email}</td>
                      <td className="td">
                        <button
                          type="button"
                          onClick={() => remove(u)}
                          className="btn btn-danger btn-sm"
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
                className="mb-4 btn btn-primary btn-sm w-fit"
              >
                Добавить работника
              </button>
              {showAdd && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Доступные работники</h3>
                  {available.length > 0 ? (
                    <ul className="border rounded">
                      {available.map((e) => (
                        <li
                          key={e.id}
                          className="flex justify-between items-center border-b last:border-b-0 px-2 py-1"
                        >
                          <span>{e.email}</span>
                          <button type="button" onClick={() => assign(e)} className="btn btn-success btn-sm">
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
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateEmployee((v) => !v)}
                  className="btn btn-success btn-md"
                >
                  {showCreateEmployee ? "Скрыть форму" : "Создать работника"}
                </button>
                {showCreateEmployee && (
                  <form onSubmit={createEmployee} className="flex flex-col gap-2 max-w-md mt-3">
                    <h3 className="text-lg font-semibold">Создать работника</h3>
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
                )}
              </div>
            </div>

            {/* RIGHT: Projects block */}
            <div className="card p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Проекты организации</h2>
              </div>
              {projects.length > 0 ? (
                <table className="table-box mb-4">
                  <thead className="table-head">
                    <tr>
                      <th className="th">Название</th>
                      <th className="th">Статус</th>
                      
                    </tr>
                  </thead>
                  <tbody className="tbody-divide">
                    {projects.map((p) => (
                       <tr key={p.id}
                        onClick={() => router.push(`/projects/${p.id}`)}
                        className="row-hover cursor-pointer"
                      >
                        <td className="td">{p.title}</td>
                        <td className="td">{p.projectStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm">Проектов пока нет</p>
              )}
              <div className="mt-auto" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
