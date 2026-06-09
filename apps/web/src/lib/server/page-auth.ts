import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "./auth";

export async function requirePageUser() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }

    if (error instanceof ApiError && error.status === 403) {
      redirect("/access-pending");
    }

    throw error;
  }
}
