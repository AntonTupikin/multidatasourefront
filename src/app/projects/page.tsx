"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface Organization { id: number; title: string; }
interface Project {
  id: number;
  title: string;
  projectStatus: string;
  organizationResponse: Organization;
  client: number;
  startDate?: string;
  endDate?: string;
}

interface Client { id: number; email: string; }

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filterOrg, setFilterOrg] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    organizationId: "",
    clientId: "",
    startDate: "",
    endDate: "",
  });

  const load = useCallback(async () => {
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      const [orgRes, clientRes, projRes] = await Promise.all([
        api.get("/api/organization"),
        api.get("/api/clients", { params: { size: 100 } }),
        api.get("/api/projects", { params: { size: 100 } }),
      ]);
      setOrgs(orgRes.data || []);
      setClients(clientRes.data?.content || []);
      setProjects(projRes.data?.content || []);
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

  const handleFilterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilterOrg(val);
    const params: any = { size: 100 };
    if (val) params.organizationId = Number(val);
    const res = await api.get("/api/projects", { params });
    setProjects(res.data?.content || []);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/projects", {
        title: form.title,
        organizationId: Number(form.organizationId),
        clientId: Number(form.clientId),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      setForm({ title: "", organizationId: "", clientId: "", startDate: "", endDate: "" });
      await handleFilterChange({ target: { value: filterOrg } } as any);
    } catch {
      alert("Не удалось создать проект");
    }
  };

  const projectsView = useMemo(() => projects, [projects]);

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Проекты</h1>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm">Фильтр по организации:</label>
        <select value={filterOrg} onChange={handleFilterChange} className="border p-2 rounded">
          <option value="">Все</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
      </div>

      <table className="min-w-full border mb-6 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Название</th>
            <th className="border px-2 py-1">Организация</th>
            <th className="border px-2 py-1">Статус</th>
            <th className="border px-2 py-1">Действия</th>
          </tr>
        </thead>
        <tbody>
          {projectsView.map((p) => (
            <tr key={p.id} className="odd:bg-white even:bg-gray-50">
              <td className="border px-2 py-1">{p.title}</td>
              <td className="border px-2 py-1">{p.organizationResponse?.title}</td>
              <td className="border px-2 py-1">{p.projectStatus}</td>
              <td className="border px-2 py-1 text-center">
                <Link className="text-blue-600 underline" href={`/projects/${p.id}`}>Открыть</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={createProject} className="flex flex-col gap-2 max-w-2xl">
        <h2 className="text-xl font-semibold">Создать проект</h2>
        <input
          name="title"
          placeholder="Название проекта"
          value={form.title}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            name="organizationId"
            value={form.organizationId}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          >
            <option value="">Выберите организацию</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
          <select
            name="clientId"
            value={form.clientId}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          >
            <option value="">Выберите клиента</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.email}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-sm">Дата начала</label>
            <input
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="text-sm">Дата окончания</label>
            <input
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
        <button type="submit" className="bg-green-600 text-white py-2 rounded">Создать</button>
      </form>
    </div>
  );
}

