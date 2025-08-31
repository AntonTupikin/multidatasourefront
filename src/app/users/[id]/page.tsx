"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: number;
  username?: string;
  email?: string;
  role?: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // ensure auth
        await api.get("/api/users/me");
        const res = await api.get(`/api/users/${id}`);
        if (!mounted) return;
        setUser(res.data);
      } catch (e) {
        setError("Не удалось загрузить данные пользователя");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!user) return <div className="p-6">Пользователь не найден</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Пользователь #{user.id}</h1>
      <div className="space-y-2">
        <div><span className="text-gray-500">Имя пользователя:</span> {user.username || "—"}</div>
        <div><span className="text-gray-500">Email:</span> {user.email || "—"}</div>
        <div><span className="text-gray-500">Роль:</span> {user.role || "—"}</div>
      </div>
      <div className="mt-6">
        <button className="btn btn-primary btn-sm" onClick={() => router.back()}>Назад</button>
      </div>
    </div>
  );
}

