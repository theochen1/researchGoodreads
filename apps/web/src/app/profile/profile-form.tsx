"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type Profile = {
  id: string;
  name: string;
  username: string;
  affiliation: string | null;
  role: string | null;
};

type ProfileFormState = {
  name: string;
  username: string;
  affiliation: string;
  role: string;
};

const emptyProfile: ProfileFormState = {
  name: "",
  username: "",
  affiliation: "",
  role: "",
};

type ProfilePayload = {
  profile: Profile | null;
};

async function fetchProfile() {
  const response = await fetch("/api/profile");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Profile load failed");
  }

  return payload.data as ProfilePayload;
}

async function patchProfile(form: ProfileFormState) {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: form.name,
      username: form.username.trim().toLowerCase(),
      affiliation: form.affiliation || null,
      role: form.role || null,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Profile save failed");
  }

  return payload.data as { profile: Profile };
}

export function ProfileForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormState>(emptyProfile);
  const [hasHydratedForm, setHasHydratedForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const saveMutation = useMutation({
    mutationFn: patchProfile,
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData<ProfilePayload>(["profile"], { profile });
      setForm({
        name: profile.name,
        username: profile.username,
        affiliation: profile.affiliation ?? "",
        role: profile.role ?? "",
      });
      setHasHydratedForm(true);
      setStatus("Profile saved.");
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Profile save failed");
    },
  });

  useEffect(() => {
    const profile = profileQuery.data?.profile;

    if (!profile || hasHydratedForm) {
      return;
    }

    setForm({
      name: profile.name,
      username: profile.username,
      affiliation: profile.affiliation ?? "",
      role: profile.role ?? "",
    });
    setHasHydratedForm(true);
  }, [hasHydratedForm, profileQuery.data?.profile]);

  async function saveProfile() {
    saveMutation.mutate(form);
  }

  const isLoading = profileQuery.isLoading;
  const isSaving = saveMutation.isPending;
  const loadStatus =
    profileQuery.error instanceof Error ? profileQuery.error.message : null;

  return (
    <section className="surface">
      <div className="form-grid">
        {loadStatus ? <div className="status-line">{loadStatus}</div> : null}
        {status ? <div className="status-line">{status}</div> : null}
        {isLoading ? (
          <div className="empty-state">
            <h2>Loading</h2>
          </div>
        ) : (
          <>
            <label>
              <span className="account-label">Name</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={form.name}
              />
            </label>
            <label>
              <span className="account-label">Username</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                value={form.username}
              />
            </label>
            <label>
              <span className="account-label">Affiliation</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    affiliation: event.target.value,
                  }))
                }
                value={form.affiliation}
              />
            </label>
            <label>
              <span className="account-label">Role</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                value={form.role}
              />
            </label>
            <button
              className="button primary"
              disabled={!form.name || !form.username || isSaving}
              onClick={saveProfile}
              type="button"
            >
              {isSaving ? "Saving" : "Save Profile"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
