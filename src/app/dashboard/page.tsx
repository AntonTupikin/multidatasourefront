"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/api/users/me")
      .then((res) => setUser(res.data))
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Панель управления</h1>
      {user && (
        <div className="space-y-2">
          <p>
            <strong>Имя пользователя:</strong> {user.username}
          </p>
          <p>
            <strong>Электронная почта:</strong> {user.email}
          </p>
          <p>
            <strong>Роль:</strong> {user.role}
          </p>
        </div>
      )}
    </div>
  );
}
