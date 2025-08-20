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

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api
      .get("/api/users/me")
      .then((res) => {
        if (res.data.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        api
          .get("/admin/users")
          .then((r) => setUsers(r.data))
          .catch(() => router.push("/login"));
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <table className="min-w-full border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Username</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="odd:bg-white even:bg-gray-50">
              <td className="border px-2 py-1">{u.username}</td>
              <td className="border px-2 py-1">{u.email}</td>
              <td className="border px-2 py-1">{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
