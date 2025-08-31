"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function NavBar() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    setToken(stored);
    if (stored) {
      api
        .get("/api/users/me")
        .then((res) => setRole(res.data.role))
        .catch(() => setRole(null));
    }
  }, []);

  if (!token) {
    return null;
  }
  const me = () => {
    router.push("/projects");
  };
  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

return (
    <nav className="bg-blue-400 text-white p-4 flex items-center gap-4 shadow-md">
      <Link href="/dashboard" className="font-black text-3xl tracking-wide mr-2 hover:opacity-90">
        CraneCRM
      </Link>
      <Link href="/dashboard" className="hover:underline">
        Панель
      </Link>
      {role === "SUPERVISOR" && (
        <>
          <Link href="/organizations" className="hover:underline">
            Организации
          </Link>
          <Link href="/clients" className="hover:underline">
            Клиенты
          </Link>
          <Link href="/projects" className="hover:underline">
            Проекты
          </Link>
          <Link href="/employees" className="hover:underline">
            Работники
          </Link>
        </>
      )}
      {role === "ADMIN" && (
        <Link href="/users" className="hover:underline">
          Пользователи
        </Link>
      )}
      <button onClick={logout} className="ml-auto hover:underline">
        Выйти
      </button>
    </nav>
  );
}
