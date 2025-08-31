"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Organization { id: number; title: string }
interface Project {
  id: number;
  title: string;
  projectStatus: string;
  organizationResponse: Organization;
  client: number;
  startDate?: string;
  endDate?: string;
}

interface EstimateItem {
  id: number;
  materialName: string;
  unit?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  category?: string;
  positionNo?: number;
  total?: string | number;
}

interface Estimate {
  id: number;
  projectId: number;
  title?: string;
  currency?: string;
  notes?: string;
  items: EstimateItem[];
}

interface Employee {
  id: number;
  email: string;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [newItem, setNewItem] = useState<Partial<EstimateItem>>({ materialName: "", unit: "", quantity: 1, unitPrice: 0 });
  const [createForm, setCreateForm] = useState({ title: "", currency: "RUB", notes: "" });
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Employee[]>([]);
  const [available, setAvailable] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showCreateEstimate, setShowCreateEstimate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get("/api/users/me");
      if (me.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      try {
        const proj = await api.get(`/api/projects/${id}`);
        // backend may return wrong shape; ensure we have a project-like object
        if (proj.data && (proj.data.title || proj.data.organizationResponse)) {
          setProject(proj.data);
        } else {
          throw new Error("Invalid project response");
        }
      } catch {
        // Fallback: fetch list and find project by id
        const list = await api.get(`/api/projects`, { params: { size: 1000 } });
        const found = (list.data?.content || []).find((p: any) => p.id === id) || null;
        setProject(found);
      }
      try {
        const est = await api.get(`/api/projects/${id}/estimate`);
        setEstimate(est.data);
      } catch {
        setEstimate(null);
      }

      try {
        // load assigned employees using users filter by project
        const teamRes = await api.get(`/api/users`, { params: { projectId: id, size: 100 } });
        setTeam(teamRes.data?.content || []);
      } catch {
        setTeam([]);
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const createEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post("/api/estimates", {
      projectId: id,
      title: createForm.title || undefined,
      currency: createForm.currency || undefined,
      notes: createForm.notes || undefined,
    });
    setEstimate(res.data);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimate) return;
    const res = await api.post(`/api/estimates/${estimate.id}/items`, {
      materialName: newItem.materialName,
      unit: newItem.unit || undefined,
      quantity: newItem.quantity ? Number(newItem.quantity) : undefined,
      unitPrice: newItem.unitPrice ? Number(newItem.unitPrice) : undefined,
      category: newItem.category || undefined,
      positionNo: newItem.positionNo || undefined,
    });
    setEstimate({ ...estimate, items: [...estimate.items, res.data] });
    setNewItem({ materialName: "", unit: "", quantity: 1, unitPrice: 0 });
  };

  const deleteItem = async (itemId: number) => {
    if (!estimate) return;
    await api.delete(`/api/estimates/${estimate.id}/items/${itemId}`);
    setEstimate({ ...estimate, items: estimate.items.filter((i) => i.id !== itemId) });
  };

  const toggleAdd = async () => {
    if (!showAdd) {
      try {
        const res = await api.get(`/api/users`, { params: { notAssignedToProjectId: id, size: 100 } });
        setAvailable(res.data?.content || []);
      } catch {
        setAvailable([]);
      }
    }
    setShowAdd(!showAdd);
  };

  const assignEmployee = async (user: Employee) => {
    const existing = team.map((u) => u.id);
    const next = Array.from(new Set([...existing, user.id]));
    await api.patch(`/api/projects/${id}`, { employeeIds: next });
    setAvailable((prev) => prev.filter((e) => e.id !== user.id));
    // reload team
    const teamRes = await api.get(`/api/users`, { params: { projectId: id, size: 100 } });
    setTeam(teamRes.data?.content || []);
  };

  const removeEmployee = async (user: Employee) => {
    const remaining = team.filter((e) => e.id !== user.id).map((e) => e.id);
    await api.patch(`/api/projects/${id}`, { employeeIds: remaining });
    setTeam((prev) => prev.filter((e) => e.id !== user.id));
  };

  const total = useMemo(() => {
    if (!estimate?.items) return 0;
    return estimate.items.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  }, [estimate]);

  if (loading) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      {project && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-sm text-gray-600">Организация: {project.organizationResponse?.title}</p>
          <p className="text-sm text-gray-600">Статус: {project.projectStatus}</p>
        </div>
      )}

      {/* Project team management */}
      <div className="card p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Команда проекта</h2>
        <table className="table-box mb-4">
          <thead className="table-head">
            <tr>
              <th className="th">Электронная почта</th>
              <th className="th">Действия</th>
            </tr>
          </thead>
          <tbody className="tbody-divide">
            {team.map((u) => (
              <tr key={u.id} className="row-hover">
                <td className="td">{u.email}</td>
                <td className="td">
                  <button
                    type="button"
                    onClick={() => removeEmployee(u)}
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
          className="mb-3 btn btn-primary btn-sm"
        >
          {showAdd ? "Скрыть доступных" : "Добавить работника"}
        </button>
        {showAdd && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Доступные работники</h3>
            {available.length > 0 ? (
              <ul className="rounded-lg bg-white shadow-sm">
                {available.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between items-center px-3 py-2 border-b last:border-b-0 border-gray-100"
                  >
                    <span>{e.email}</span>
                    <button type="button" onClick={() => assignEmployee(e)} className="btn btn-success btn-sm">
                      Назначить
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Нет доступных работников</p>
            )}
          </div>
        )}
      </div>

      {!estimate ? (
        <div>
          <button
            type="button"
            onClick={() => setShowCreateEstimate((v) => !v)}
            className="mb-3 btn btn-success btn-md"
          >
            {showCreateEstimate ? "Скрыть форму" : "Создать смету"}
          </button>
          {showCreateEstimate && (
            <form onSubmit={createEstimate} className="flex flex-col gap-2 max-w-xl">
              <h2 className="text-xl font-semibold">Создать смету</h2>
              <input
                placeholder="Название сметы"
                className="p-2 rounded bg-gray-100 border-0 focus:outline-none focus:ring-0 focus:border-transparent"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  placeholder="Валюта (например, RUB)"
                  className="p-2 rounded bg-gray-100 border-0 focus:outline-none focus:ring-0 focus:border-transparent"
                  value={createForm.currency}
                  onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value.toUpperCase() })}
                />
                <input
                  placeholder="Заметки"
                  className="p-2 rounded bg-gray-100 border-0 focus:outline-none focus:ring-0 focus:border-transparent"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                />
              </div>
              <button className="bg-green-600 text-white py-2 rounded" type="submit">Создать</button>
            </form>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Смета: {estimate.title || "без названия"}</h2>
              <p className="text-sm text-gray-600">Итого: {total.toLocaleString()} {estimate.currency || ""}</p>
            </div>
          </div>

          <table className="table-box mb-6">
            <thead className="table-head">
              <tr>
                <th className="th">Позиция</th>
                <th className="th">Материал</th>
                <th className="th">Ед.</th>
                <th className="th">Кол-во</th>
                <th className="th">Цена</th>
                <th className="th">Категория</th>
                <th className="th">Сумма</th>
                <th className="th">Действия</th>
              </tr>
            </thead>
            <tbody className="tbody-divide">
              {estimate.items?.map((it) => (
                <tr key={it.id} className="row-hover">
                  <td className="td">{it.positionNo}</td>
                  <td className="td">{it.materialName}</td>
                  <td className="td">{it.unit}</td>
                  <td className="td">{it.quantity}</td>
                  <td className="td">{it.unitPrice}</td>
                  <td className="td">{it.category}</td>
                  <td className="td">{it.total}</td>
                  <td className="td">
                    <button
                      onClick={() => deleteItem(it.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <button
              type="button"
              onClick={() => setShowAddItemForm((v) => !v)}
              className="mb-3 bg-blue-600 text-white px-3 py-2 rounded"
            >
              {showAddItemForm ? "Скрыть форму добавления" : "Добавить позицию"}
            </button>
            {showAddItemForm && (
              <form onSubmit={addItem} className="flex flex-col gap-2 max-w-3xl">
                <h3 className="text-lg font-semibold">Добавить позицию</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <input
                    placeholder="Материал"
                    className="border p-2 rounded"
                    value={newItem.materialName as string}
                    onChange={(e) => setNewItem({ ...newItem, materialName: e.target.value })}
                    required
                  />
                  <input
                    placeholder="Ед. изм."
                    className="border p-2 rounded"
                    value={newItem.unit as string}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Кол-во"
                    className="border p-2 rounded"
                    value={String(newItem.quantity ?? "")}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Цена"
                    className="border p-2 rounded"
                    value={String(newItem.unitPrice ?? "")}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                  <input
                    placeholder="Категория"
                    className="border p-2 rounded"
                    value={newItem.category as string}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="№"
                    className="border p-2 rounded"
                    value={String(newItem.positionNo ?? "")}
                    onChange={(e) => setNewItem({ ...newItem, positionNo: Number(e.target.value) })}
                  />
                </div>
                <button className="bg-blue-600 text-white py-2 rounded" type="submit">
                  Добавить
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
