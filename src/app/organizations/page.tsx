"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Organization {
  id: number;
  title: string;
  inn: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState({ title: "", inn: "" });
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/users/me");
      if (res.data.role !== "SUPERVISOR") {
        router.push("/dashboard");
        return;
      }
      setOrgs(res.data.organizationsResponses || []);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/organization", {
        title: form.title,
        inn: Number(form.inn),
      });
      setMessage("Organization created");
      setForm({ title: "", inn: "" });
      load();
    } catch {
      setMessage("Creation failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">My Organizations</h1>
      <table className="min-w-full border mb-6 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Title</th>
            <th className="border px-2 py-1">INN</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="odd:bg-white even:bg-gray-50">
              <td className="border px-2 py-1">{o.title}</td>
              <td className="border px-2 py-1">{o.inn}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={createOrg} className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-semibold">Create organization</h2>
        <input
          name="title"
          className="border p-2 rounded"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
        />
        <input
          name="inn"
          className="border p-2 rounded"
          placeholder="INN"
          value={form.inn}
          onChange={handleChange}
        />
        <button type="submit" className="bg-green-600 text-white py-2 rounded">
          Create
        </button>
        {message && <p className="text-sm mt-1">{message}</p>}
      </form>
    </div>
  );
}
