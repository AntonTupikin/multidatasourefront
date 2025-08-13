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
        .get("/api/me")
        .then((res) => setRole(res.data.role))
        .catch(() => setRole(null));
    }
  }, []);

  if (!token) {
    return null;
  }

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex gap-4">
      <Link href="/dashboard" className="hover:underline">
        Dashboard
      </Link>
      {role === "SUPERVISOR" && (
        <Link href="/organizations" className="hover:underline">
          Organizations
        </Link>
      )}
      {role === "ADMIN" && (
        <Link href="/users" className="hover:underline">
          Users
        </Link>
      )}
      <button onClick={logout} className="ml-auto hover:underline">
        Logout
      </button>
    </nav>
  );
}
