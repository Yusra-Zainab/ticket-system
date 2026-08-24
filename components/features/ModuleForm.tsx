"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ModuleForm({
  kind,
  projectId,
  projectName,
  returnTo,
}: {
  kind: "module" | "subModule";
  projectId?: string;
  projectName?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [confirming, setConfirming] = useState(false);

  const valid = name.trim().length >= 2 && url.trim().length >= 3;

  const create = () => {
    if (projectId && returnTo !== "ticket") {
      router.push(`/projects/${projectId}`);
      return;
    }

    const params = new URLSearchParams({
      [kind]: name.trim(),
      url: url.trim(),
    });

    if (projectName) {
      params.set("project", projectName);
    }

    if (projectId) {
      params.set("projectId", projectId);
    }

    router.push(`/tickets/new?${params}`);
  };

  return (
    <form onSubmit={(event) => event.preventDefault()} className="card space-y-5 p-6">
      {projectName && (
        <label>
          <span className="label">Project</span>
          <input value={projectName} readOnly className="field bg-slate-50" />
        </label>
      )}

      <label>
        <span className="label">{kind === "module" ? "Module" : "Sub Module"} name</span>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field"
          placeholder={kind === "module" ? "Payments" : "Payment processing"}
        />
      </label>

      <label>
        <span className="label">Related URL</span>
        <div className="flex">
          <span className="field !w-20 rounded-r-none !bg-slate-50">https://</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="field rounded-l-none"
            placeholder="portal.example.com/module"
          />
        </div>
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!valid}
          onClick={() => setConfirming(true)}
          className="button-primary disabled:opacity-50"
        >
          Save {kind === "module" ? "Module" : "Sub Module"}
        </button>
      </div>

      {confirming && (
        <div className="modal-backdrop">
          <div role="alertdialog" aria-modal="true" className="ticket-modal !w-[410px]">
            <h2 className="text-2xl font-bold text-slate-700">Confirmation</h2>
            <p className="mt-5 font-semibold text-slate-700">
              Save {name}
              {projectName ? ` for ${projectName}` : ""}?
            </p>
            <div className="mt-6 flex justify-between">
              <button type="button" className="button-secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="button-primary" onClick={create}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
