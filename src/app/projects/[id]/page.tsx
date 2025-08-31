"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  businessPartnerId?: number | null;
  businessPartnerName?: string | null;
}

interface EstimateItemHistory {
  id: number;
  itemId: number;
  changedBy?: number | null;
  changedByUsername?: string | null;
  changedAt: string;
  oldUnit?: string | null;
  newUnit?: string | null;
  oldQuantity?: string | number | null;
  newQuantity?: string | number | null;
  oldUnitPrice?: string | number | null;
  newUnitPrice?: string | number | null;
}

interface EstimateItemWithHistory {
  item: EstimateItem;
  history: EstimateItemHistory[];
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
  const [partners, setPartners] = useState<Array<{ id: number; name: string }>>([]);
  const [createForm, setCreateForm] = useState({ title: "", currency: "RUB", notes: "" });
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Employee[]>([]);
  const [available, setAvailable] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showCreateEstimate, setShowCreateEstimate] = useState(false);
  // Локальные изменения по строкам: itemId -> измененные поля
  const [edits, setEdits] = useState<Record<number, Partial<EstimateItem>>>({});
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [historyByItem, setHistoryByItem] = useState<Record<number, EstimateItemHistory[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null);

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
        const ps = await api.get(`/api/partners`);
        setPartners(ps.data || []);
      } catch {
        setPartners([]);
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
      businessPartnerId: newItem.businessPartnerId || undefined,
    });
    setEstimate({ ...estimate, items: [...estimate.items, res.data] });
    setNewItem({ materialName: "", unit: "", quantity: 1, unitPrice: 0 });
  };

  const deleteItem = async (itemId: number) => {
    if (!estimate) return;
    await api.delete(`/api/estimates/${estimate.id}/items/${itemId}`);
    setEstimate({ ...estimate, items: estimate.items.filter((i) => i.id !== itemId) });
  };

  const setEditField = (item: EstimateItem, field: keyof EstimateItem, raw: any) => {
    // нормализуем числовые поля
    let value: any = raw;
    if (field === "quantity" || field === "unitPrice" || field === "positionNo" || field === "businessPartnerId") {
      value = raw === "" ? "" : Number(raw);
    }
    const original = (item as any)[field];
    const changed = String(value) !== String(original ?? "");
    setEdits((prev) => {
      const current = { ...(prev[item.id] || {}) } as any;
      if (changed) current[field] = value; else delete current[field];
      const next = { ...prev } as any;
      if (Object.keys(current).length) next[item.id] = current; else delete next[item.id];
      return next;
    });
  };

  const saveEdits = async (item: EstimateItem) => {
    if (!estimate) return;
    const changes = edits[item.id];
    if (!changes || Object.keys(changes).length === 0) return;
    const payload: any = {};
    if ("materialName" in changes) payload.materialName = changes.materialName;
    if ("unit" in changes) payload.unit = changes.unit;
    if ("quantity" in changes) payload.quantity = changes.quantity === "" ? null : Number(changes.quantity as any);
    if ("unitPrice" in changes) payload.unitPrice = changes.unitPrice === "" ? null : Number(changes.unitPrice as any);
    if ("category" in changes) payload.category = changes.category;
    if ("businessPartnerId" in changes) payload.businessPartnerId = (changes as any).businessPartnerId === "" ? null : Number((changes as any).businessPartnerId);
    if ("positionNo" in changes) payload.positionNo = changes.positionNo;
    const res = await api.patch(`/api/estimates/${estimate.id}/items/${item.id}`, payload);
    const updated = res.data as EstimateItem;
    setEstimate({
      ...estimate,
      items: estimate.items.map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
    });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const toggleHistory = async (itemId: number) => {
    if (!estimate) return;
    if (openItemId === itemId) {
      setOpenItemId(null);
      return;
    }
    setOpenItemId(itemId);
    if (!historyByItem[itemId]) {
      try {
        setHistoryLoadingId(itemId);
        const res = await api.get(`/api/estimates/${estimate.id}/items/${itemId}`);
        const data = res.data as EstimateItemWithHistory;
        setHistoryByItem((prev) => ({ ...prev, [itemId]: data.history || [] }));
      } finally {
        setHistoryLoadingId(null);
      }
    }
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

          <div className="overflow-x-auto rounded-lg mb-6">
          <table className="table-box w-full">
            <thead className="table-head">
              <tr>
                <th className="th">Позиция</th>
                <th className="th">Материал</th>
                <th className="th">Ед.</th>
                <th className="th">Кол-во</th>
                <th className="th">Цена</th>
                <th className="th">Категория</th>
                <th className="th">Контрагент</th>
                <th className="th">Сумма</th>
                <th className="th">Действия</th>
              </tr>
            </thead>
            <tbody className="tbody-divide">
              {estimate.items?.map((it) => {
                const changes = edits[it.id];
                const hasChanges = !!changes && Object.keys(changes).length > 0;
                const isOpen = openItemId === it.id;
                const inputClasses = {
                  base: "p-1 rounded bg-gray-50 border-0 focus:outline-none focus:ring-0 focus:border-transparent",
                  small: "w-20",
                  full: "w-full",
                };
                return (
                  <>
                    <tr key={it.id} className="row-hover">
                      <td className="td">
                        <input
                          type="number"
                          className={`${inputClasses.base} ${inputClasses.small}`}
                          value={String(changes?.positionNo ?? it.positionNo ?? "")}
                          onChange={(e) => setEditField(it, "positionNo", e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          className={`${inputClasses.base} ${inputClasses.small}`}
                          value={String(changes?.materialName ?? it.materialName ?? "")}
                          onChange={(e) => setEditField(it, "materialName", e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          className={`${inputClasses.base} ${inputClasses.small}`}
                          value={String(changes?.unit ?? it.unit ?? "")}
                          onChange={(e) => setEditField(it, "unit", e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          step="0.01"
                          className={`${inputClasses.base} ${inputClasses.small}`}
                          value={String(changes?.quantity ?? it.quantity ?? "")}
                          onChange={(e) => setEditField(it, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          step="0.01"
                          className={`${inputClasses.base} ${inputClasses.small}`}
                          value={String(changes?.unitPrice ?? it.unitPrice ?? "")}
                          onChange={(e) => setEditField(it, "unitPrice", e.target.value)}
                        />
                      </td>
                    <td className="td">
                      <input
                        className={`${inputClasses.base} ${inputClasses.small}`}
                        value={String(changes?.category ?? it.category ?? "")}
                        onChange={(e) => setEditField(it, "category", e.target.value)}
                      />
                    </td>
                    <td className="td">
                      <select
                        className={`${inputClasses.base} max-w-[220px]`}
                        value={String(changes?.businessPartnerId ?? it.businessPartnerId ?? "")}
                        onChange={(e) => setEditField(it, "businessPartnerId", e.target.value)}
                      >
                        <option value="">—</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="td">{it.total}</td>
                      <td className="td space-x-2">
                        {hasChanges && (
                          <button onClick={() => saveEdits(it)} className="btn btn-success btn-sm" type="button">
                            Сохранить
                          </button>
                        )}
                        <button
                          onClick={() => toggleHistory(it.id)}
                          className="px-3 py-1 rounded bg-blue-400 text-white hover:bg-blue-700 text-sm"
                          type="button"
                        >
                          {isOpen ? "Скрыть историю" : "История"}
                        </button>
                        <button
                          onClick={() => deleteItem(it.id)}
                          className="btn btn-danger btn-sm"
                          type="button"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td className="td bg-gray-50" colSpan={9}>
                          {historyLoadingId === it.id ? (
                            <div className="text-sm text-gray-500">Загрузка истории…</div>
                          ) : (
                            <div>
                              <div className="text-sm text-gray-700 mb-2">История изменений</div>
                              {historyByItem[it.id]?.length ? (
                                <ul className="space-y-1">
                                  {historyByItem[it.id].map((h) => (
                                    <li key={h.id} className="text-sm text-gray-700">
                                      <span className="text-gray-500">{new Date(h.changedAt).toLocaleString()}:</span>
                                      {" "}
                                      {h.oldUnit !== h.newUnit && (
                                        <span>
                                          Ед.: {h.oldUnit ?? "—"} → {h.newUnit ?? "—"}; {" "}
                                          {h.changedBy ? (
                                            <Link href={`/users/${h.changedBy}`} className="text-blue-600 underline">
                                              {h.changedByUsername || `пользователь #${h.changedBy}`}
                                            </Link>
                                          ) : null}
                                        </span>
                                      )}
                                      {String(h.oldQuantity ?? "") !== String(h.newQuantity ?? "") && (
                                        <span>
                                          Кол-во: {String(h.oldQuantity ?? "—")} → {String(h.newQuantity ?? "—")}; {" "}
                                          {h.changedBy ? (
                                            <Link href={`/users/${h.changedBy}`} className="text-blue-600 underline">
                                              {h.changedByUsername || `пользователь #${h.changedBy}`}
                                            </Link>
                                          ) : null}
                                          {" "}
                                        </span>)}
                                      {String(h.oldUnitPrice ?? "") !== String(h.newUnitPrice ?? "") && (
                                        <span>
                                          Цена: {String(h.oldUnitPrice ?? "—")} → {String(h.newUnitPrice ?? "—")}; {" "}
                                          {h.changedBy ? (
                                            <Link href={`/users/${h.changedBy}`} className="text-blue-600 underline">
                                              {h.changedByUsername || `пользователь #${h.changedBy}`}
                                            </Link>
                                          ) : null}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-gray-400">Нет записей истории</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          </div>

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
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
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
                  <select
                    className="border p-2 rounded"
                    value={String(newItem.businessPartnerId ?? "")}
                    onChange={(e) => setNewItem({ ...newItem, businessPartnerId: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Контрагент — не выбран</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
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
