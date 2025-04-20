"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/shared/icons";

export default function RoleSelectionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual role selection page
    router.push("/auth/role-select");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Icons.spinner className="mx-auto h-10 w-10 animate-spin" />
        <h1 className="mt-4 text-xl font-semibold">Redirecting...</h1>
        <p className="mt-2 text-muted-foreground">Taking you to role selection...</p>
      </div>
    </div>
  );
} 