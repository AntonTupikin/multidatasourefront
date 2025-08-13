"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
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
      <Link href="/users" className="hover:underline">
        Users
      </Link>
      <button onClick={logout} className="ml-auto hover:underline">
        Logout
      </button>
    </nav>
  );
}
