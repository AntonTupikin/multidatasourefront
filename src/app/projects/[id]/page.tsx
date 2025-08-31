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

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [newItem, setNewItem] = useState<Partial<EstimateItem>>({ materialName: "", unit: "", quantity: 1, unitPrice: 0 });
  const [createForm, setCreateForm] = useState({ title: "", currency: "RUB", notes: "" });
  const [loading, setLoading] = useState(true);

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

      {!estimate ? (
        <form onSubmit={createEstimate} className="flex flex-col gap-2 max-w-xl">
          <h2 className="text-xl font-semibold">Создать смету</h2>
          <input
            placeholder="Название сметы"
            className="border p-2 rounded"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              placeholder="Валюта (например, RUB)"
              className="border p-2 rounded"
              value={createForm.currency}
              onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value.toUpperCase() })}
            />
            <input
              placeholder="Заметки"
              className="border p-2 rounded"
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            />
          </div>
          <button className="bg-green-600 text-white py-2 rounded" type="submit">Создать</button>
        </form>
      ) : (
        <div>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Смета: {estimate.title || "без названия"}</h2>
              <p className="text-sm text-gray-600">Итого: {total.toLocaleString()} {estimate.currency || ""}</p>
            </div>
          </div>

          <table className="min-w-full border mb-6 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Позиция</th>
                <th className="border px-2 py-1">Материал</th>
                <th className="border px-2 py-1">Ед.</th>
                <th className="border px-2 py-1">Кол-во</th>
                <th className="border px-2 py-1">Цена</th>
                <th className="border px-2 py-1">Категория</th>
                <th className="border px-2 py-1">Сумма</th>
                <th className="border px-2 py-1">Действия</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items?.map((it) => (
                <tr key={it.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-2 py-1">{it.positionNo}</td>
                  <td className="border px-2 py-1">{it.materialName}</td>
                  <td className="border px-2 py-1">{it.unit}</td>
                  <td className="border px-2 py-1">{it.quantity}</td>
                  <td className="border px-2 py-1">{it.unitPrice}</td>
                  <td className="border px-2 py-1">{it.category}</td>
                  <td className="border px-2 py-1">{it.total}</td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => deleteItem(it.id)}
                      className="text-sm bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        </div>
      )}
    </div>
  );
}
