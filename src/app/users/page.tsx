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
      <h1 className="text-2xl font-bold mb-4">Пользователи</h1>
      <table className="table-box">
        <thead className="table-head">
          <tr>
            <th className="th">Имя пользователя</th>
            <th className="th">Электронная почта</th>
            <th className="th">Роль</th>
          </tr>
        </thead>
        <tbody className="tbody-divide">
          {users.map((u) => (
            <tr key={u.id} className="row-hover">
              <td className="td">{u.username}</td>
              <td className="td">{u.email}</td>
              <td className="td">{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
