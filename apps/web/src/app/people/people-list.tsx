"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Person = {
  id: string;
  name: string;
  username: string;
  affiliation: string | null;
  role: string | null;
  isFollowed: boolean;
};

type PeoplePayload = {
  people: Person[];
};

async function fetchPeople(queryString: string) {
  const response = await fetch(`/api/follows?${queryString}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "People load failed");
  }

  return payload.data as PeoplePayload;
}

async function updateFollow(person: Person, shouldFollow: boolean) {
  const response = await fetch("/api/follows", {
    method: shouldFollow ? "POST" : "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ followedUserId: person.id }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Follow update failed");
  }

  return payload.data as { followed: boolean };
}

export function PeopleList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [mutationStatus, setMutationStatus] = useState<string | null>(null);
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    return params.toString();
  }, [query]);

  const peopleKey = useMemo(
    () => ["people", queryString] as const,
    [queryString],
  );
  const peopleQuery = useQuery({
    queryKey: peopleKey,
    queryFn: () => fetchPeople(queryString),
  });
  const people = peopleQuery.data?.people ?? [];

  const followMutation = useMutation({
    mutationFn: ({
      person,
      shouldFollow,
    }: {
      person: Person;
      shouldFollow: boolean;
    }) => updateFollow(person, shouldFollow),
    onMutate: async ({ person, shouldFollow }) => {
      setMutationStatus(null);
      await queryClient.cancelQueries({ queryKey: peopleKey });
      const previous = queryClient.getQueryData<PeoplePayload>(peopleKey);

      queryClient.setQueryData<PeoplePayload>(peopleKey, (current) => ({
        people: (current?.people ?? []).map((row) =>
          row.id === person.id ? { ...row, isFollowed: shouldFollow } : row,
        ),
      }));

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(peopleKey, context.previous);
      }
      setMutationStatus(
        error instanceof Error ? error.message : "Follow update failed",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });

  function setFollow(person: Person, shouldFollow: boolean) {
    followMutation.mutate({ person, shouldFollow });
  }

  return (
    <section className="surface">
      <div className="form-grid">
        <label>
          <span className="account-label">Search beta users</span>
          <input
            className="input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, username, or affiliation"
            value={query}
          />
        </label>
      </div>
      {peopleQuery.error ? (
        <div className="status-line">
          {peopleQuery.error instanceof Error
            ? peopleQuery.error.message
            : "People load failed"}
        </div>
      ) : null}
      {mutationStatus ? (
        <div className="status-line">{mutationStatus}</div>
      ) : null}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Affiliation</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td className="muted-text">@{person.username}</td>
                <td>{person.affiliation ?? ""}</td>
                <td>{person.role ?? ""}</td>
                <td>
                  <button
                    className={person.isFollowed ? "button" : "button primary"}
                    onClick={() => void setFollow(person, !person.isFollowed)}
                    type="button"
                  >
                    {person.isFollowed ? "Unfollow" : "Follow"}
                  </button>
                </td>
              </tr>
            ))}
            {!peopleQuery.isLoading && people.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>No beta users found</h2>
                  </div>
                </td>
              </tr>
            ) : null}
            {peopleQuery.isLoading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>Loading</h2>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
