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
  const [org, setOrg] = useState({ title: "", inn: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/api/me")
      .then((res) => setUser(res.data))
      .catch(() => router.push("/login"));
  }, [router]);

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/organization", org);
      setMessage("Organization created");
      setOrg({ title: "", inn: "" });
    } catch {
      setMessage("Creation failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {user && (
        <div className="mb-6">
          <p>
            <strong>Username:</strong> {user.username}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
        </div>
      )}
      <form onSubmit={createOrg} className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-semibold">Create organization</h2>
        <input
          className="border p-2"
          placeholder="Title"
          value={org.title}
          onChange={(e) => setOrg({ ...org, title: e.target.value })}
        />
        <input
          className="border p-2"
          placeholder="INN"
          value={org.inn}
          onChange={(e) => setOrg({ ...org, inn: e.target.value })}
        />
        <button type="submit" className="bg-green-600 text-white py-2">
          Create
        </button>
        {message && <p className="text-sm mt-1">{message}</p>}
      </form>
    </div>
  );
}
