"use client";

import Link from "next/link";

import {
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  FileLock2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import RichTextEditor from "@/components/ui/RichTextEditor";
import StickyToast from "@/components/ui/StickyToast";

import { cn } from "@/lib/utils";
import ClientStatusBadge from "@/components/features/ClientStatusBadge";
import { clientStatusDescriptions } from "@/lib/statusOptions";
import type {
  ClientEditorRecord,
  ClientFormData,
  ClientLifecycle,
  ClientListStatus,
  ClientTeamMemberInput,
  Project,
  User,
} from "@/types";

export type SectionId =
  | "client-information"
  | "primary-contact"
  | "upwork-details"
  | "client-team"
  | "communication"
  | "projects"
  | "integration"
  | "notes";

const clientTypes = ["Company", "Individual"];

const clientSources = [
  "Website",
  "Referral",
  "Upwork",
  "LinkedIn",
  "Returning Client",
];

const industries = [
  "Technology",
  "Financial Services",
  "E-commerce",
  "Healthcare",
  "Education",
  "Real Estate",
  "Professional Services",
  "Retail",
  "Media & Entertainment",
  "Nonprofit",
  "Other",
];

const clientStatuses: ClientListStatus[] = [
  "Active",
  "Inactive",
  "Onboarding",
  "Paused",
  "Completed",
];

const contactMethods = ["Email", "Phone", "WhatsApp", "Viber", "Slack"];

const contractTypes = ["Fixed Price", "Hourly"];

const contractStatuses = [
  "Prospect",
  "Negotiation",
  "Active",
  "Paused",
  "Completed",
  "Cancelled",
  "Expired",
  "Closed",
];

const teamRoles = [
  "Owner",
  "Founder",
  "Manager",
  "Stakeholder",
  "Finance",
  "Billing",
  "Technical Contact",
  "Other",
];

const accessLevels = [
  "Primary Contact",
  "Decision Maker",
  "Billing Contact",
  "Viewer",
];

const communicationPreferences = ["Slack", "Viber", "WhatsApp", "Email"];

const integrationTypes = [
  "None",
  "REST API",
  "Webhook",
  "OAuth",
  "Custom Integration",
];

const emptyValues: ClientFormData = {
  clientName: "",
  clientType: "",
  clientSource: "",
  industry: "",
  website: "",
  clientStatus: "",

  primaryContactName: "",
  primaryJobTitle: "",
  primaryEmail: "",
  primaryPhone: "",
  preferredContact: "",

  upworkProfileName: "",
  upworkProfileUrl: "",
  upworkContractId: "",
  upworkPhone: "",
  contractType: "",
  budgetRate: "",
  contractStatus: "",

  teamMembers: [],

  whatsappNumber: "",
  viberNumber: "",
  communicationPreference: "",

  projectIds: [],
  accountManagerId: "",
  coordinatorId: "",

  integrationType: "",
  apiBaseUrl: "",
  webhookUrl: "",
  apiKey: "",

  internalNotes: "",
};

const allSteps: Array<{
  id: SectionId;
  label: string;
  description?: string;
  icon: typeof Building2;
}> = [
  {
    id: "client-information",

    label: "Client Information",

    description: "Select project, module, and link.",

    icon: Building2,
  },

  {
    id: "primary-contact",

    label: "Primary Contact",

    icon: UserRound,
  },

  {
    id: "upwork-details",

    label: "Upwork Details",

    icon: BriefcaseBusiness,
  },

  {
    id: "client-team",

    label: "Client Team",

    icon: UsersRound,
  },

  {
    id: "communication",

    label: "Communication Channels",

    icon: MessageCircle,
  },

  {
    id: "projects",

    label: "Project Assignment",

    icon: BriefcaseBusiness,
  },

  {
    id: "integration",

    label: "API / Integration Setup",

    icon: Code2,
  },

  {
    id: "notes",

    label: "Internal Notes",

    icon: FileLock2,
  },
];

export default function NewClientForm({
  users = [],
  projects = [],
  initialRecord,
  initialSection = "client-information",
  clientBaseHref = "/clients",
  projectBaseHref = "/projects",
}: {
  users?: User[];
  projects?: Project[];
  initialRecord?: ClientEditorRecord;
  initialSection?: SectionId;
  clientBaseHref?: string;
  projectBaseHref?: string;
}) {
  const router = useRouter();

  const initialValues = useMemo<ClientFormData>(
    () => ({
      ...emptyValues,

      ...initialRecord?.formData,

      teamMembers: initialRecord?.formData.teamMembers
        ? [...initialRecord.formData.teamMembers]
        : [],

      projectIds: initialRecord?.formData.projectIds
        ? [...initialRecord.formData.projectIds]
        : [],
    }),
    [initialRecord],
  );

  const [values, setValues] = useState<ClientFormData>(initialValues);

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  useEffect(() => {
    if (initialSection === "client-information") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(initialSection)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialSection]);

  const [saving, setSaving] = useState(false);

  const [, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");

  const [teamDraft, setTeamDraft] = useState<Omit<ClientTeamMemberInput, "id">>(
    {
      name: "",

      role: "",

      email: "",

      phone: "",

      contactChannel: "",

      accessLevel: "",
    },
  );

  const showUpwork = values.clientSource === "Upwork";

  const steps = allSteps.filter(
    (step) => step.id !== "upwork-details" || showUpwork,
  );

  function showNotice(
    message: string,
    kind: "success" | "error" = "success",
  ) {
    setNoticeKind(kind);
    setNotice(message);
  }

  function setField<K extends keyof ClientFormData>(
    field: K,
    value: ClientFormData[K],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function goToSection(section: SectionId) {
    setActiveSection(section);

    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",

      block: "start",
    });
  }

  function resetForm() {
    setValues(initialValues);

    setTeamDraft({
      name: "",

      role: "",

      email: "",

      phone: "",

      contactChannel: "",

      accessLevel: "",
    });

    setError("");
    setNotice("");

    goToSection(initialSection);
  }

  function validateRegisteredClient() {
    if (values.clientName.trim().length < 2) {
      return "Enter a client or company name.";
    }

    if (!values.clientType) {
      return "Select a client type.";
    }

    if (!values.clientSource) {
      return "Select a client source.";
    }

    if (!values.primaryContactName.trim()) {
      return "Enter the primary contact name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.primaryEmail.trim())) {
      return "Enter a valid primary contact email.";
    }

    return "";
  }

  async function saveClient(lifecycle: ClientLifecycle) {
    if (saving) {
      return;
    }

    setError("");

    setNotice("");

    const targetLifecycle =
      lifecycle === "OPEN" ? "OPEN" : (initialRecord?.lifecycle ?? "DRAFT");

    if (targetLifecycle === "OPEN") {
      const validation = validateRegisteredClient();

      if (validation) {
        setError(validation);
        showNotice(validation, "error");

        return;
      }
    }

    setSaving(true);

    try {
      const existingId = initialRecord?.id;

      const response = await fetch(
        existingId ? `/api/clients/${existingId}` : "/api/clients",
        {
          method: existingId ? "PATCH" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            lifecycle: targetLifecycle,

            formData: values,
          }),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to save client.",
        );
      }

      const clientId = String(body.id ?? existingId ?? "");

      if (existingId) {
        if (targetLifecycle === "DRAFT") {
          showNotice("Client draft saved successfully.");
          router.refresh();
          return;
        }

        if (initialRecord?.lifecycle === "DRAFT") {
          router.push(clientBaseHref);
          router.refresh();
          return;
        }

        showNotice("Client changes saved successfully.");
        router.refresh();
        return;
      }

      if (targetLifecycle === "DRAFT") {
        showNotice("Client draft saved successfully.");

        if (clientId) {
          router.replace(`${clientBaseHref}/${clientId}/edit?draft=1`);

          router.refresh();
        }

        return;
      }

      /*
       * Registering a draft converts
       * it into OPEN and returns to
       * Clients List.
       */
      router.push(clientBaseHref);

      router.refresh();
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to save client.";
      setError(message);
      showNotice(message, "error");
    } finally {
      setSaving(false);
    }
  }

  function addTeamMember() {
    if (!teamDraft.name.trim()) {
      setError("Enter a team member name.");
      showNotice("Enter a team member name.", "error");

      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setValues((current) => ({
      ...current,

      teamMembers: [
        ...current.teamMembers,

        {
          id,
          ...teamDraft,
        },
      ],
    }));

    setTeamDraft({
      name: "",

      role: "",

      email: "",

      phone: "",

      contactChannel: "",

      accessLevel: "",
    });

    setError("");
  }

  function removeTeamMember(id: string) {
    setValues((current) => ({
      ...current,

      teamMembers: current.teamMembers.filter((member) => member.id !== id),
    }));
  }

  const isEditing = Boolean(initialRecord);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky heading/actions */}

      <div className="sticky top-0 z-30 border-b border-[#EAECF0] bg-white/95 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1
            className="text-[30px] font-bold leading-[38px] text-[#101828]"
            style={{
              fontFamily: "var(--font-satoshi), Arial, sans-serif",
            }}
          >
            {isEditing ? "Edit Client" : "New Client"}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`${clientBaseHref}/drafts`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F9FAFB]"
            >
              Drafts
            </Link>

            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              <RefreshCcw size={16} />
              Reset
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveClient("DRAFT")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              <Save size={16} />
              Save Info
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveClient("OPEN")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0284C7] via-[#06B6D4] to-[#22D3EE] px-[14px] text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:brightness-95 disabled:opacity-50"
            >
              <Send size={17} />

              {initialRecord?.lifecycle === "OPEN"
                ? "Save Changes"
                : "Save and Register"}
            </button>
          </div>
        </div>

      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        {/* Sidebar */}

        <aside className="lg:sticky lg:top-[105px] lg:self-start">
          {steps.map((step, index) => {
            const Icon = step.icon;

            const active = activeSection === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToSection(step.id)}
                className="flex min-h-[68px] w-full items-start gap-3 text-left"
              >
                <span className="flex h-[68px] w-12 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "grid size-12 place-items-center rounded-[10px] border shadow-[0_1px_2px_rgba(16,24,40,0.05)]",

                      active
                        ? "border-transparent bg-[#E6F8FB] text-[#0284C7]"
                        : "border-[#EAECF0] bg-white text-[#344054]",
                    )}
                  >
                    <Icon size={23} />
                  </span>

                  {index !== steps.length - 1 && (
                    <span
                      className={cn(
                        "mt-1 h-3 w-[2px] rounded-full",

                        active
                          ? "bg-gradient-to-b from-[#0284C7] via-[#06B6D4] to-[#22D3EE]"
                          : "bg-[#EAECF0]",
                      )}
                    />
                  )}
                </span>

                <span className="pt-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold leading-5",

                      active ? "text-[#0284C7]" : "text-[#344054] opacity-60",
                    )}
                  >
                    {step.label}
                  </span>

                  {step.description && (
                    <span
                      className={cn(
                        "block text-sm leading-5",

                        active ? "text-[#0284C7]" : "text-[#667085] opacity-60",
                      )}
                    >
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Main form */}

        <main className="min-w-0 space-y-8 pb-28">
          <FormSection
            id="client-information"
            title="Basic Client Information"
            icon={Building2}
            onActive={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client / Company Name">
                <input
                  value={values.clientName}
                  onChange={(event) =>
                    setField("clientName", event.target.value)
                  }
                  placeholder="Enter client or company name"
                  className="client-form-input"
                />
              </Field>

              <Field label="Client Type">
                <SelectField
                  value={values.clientType}
                  onChange={(value) => setField("clientType", value)}
                  placeholder="Select client type"
                  options={clientTypes}
                />
              </Field>

              <Field label="Client Source">
                <SelectField
                  value={values.clientSource}
                  onChange={(value) => setField("clientSource", value)}
                  placeholder="Select client source"
                  options={clientSources}
                />
              </Field>

              <Field label="Industry">
                <SelectField
                  value={values.industry}
                  onChange={(value) => setField("industry", value)}
                  placeholder="Select industry"
                  options={industries}
                  searchable
                  searchPlaceholder="Search industry"
                />
              </Field>

              <Field label="Website">
                <input
                  type="url"
                  value={values.website}
                  onChange={(event) => setField("website", event.target.value)}
                  placeholder="Paste website URL"
                  className="client-form-input"
                />
              </Field>

              <Field label="Client Status">
                <SelectField
                  value={values.clientStatus}
                  onChange={(value) => setField("clientStatus", value)}
                  placeholder="Select status"
                  options={clientStatuses}
                  renderOption={(value) => (
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <ClientStatusBadge
                        status={value as ClientListStatus}
                        className="!min-w-[110px]"
                      />
                      <span className="text-sm text-[#667085]">
                        {clientStatusDescriptions[value as ClientListStatus]}
                      </span>
                    </span>
                  )}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="primary-contact"
            title="Primary Contact"
            icon={UserRound}
            onActive={setActiveSection}
            tooltip="The primary contact is the main person your team communicates with for the client account."
          >
            {(values.primaryContactAvatar || values.primaryContactName) && (
              <div className="mb-4 flex items-center gap-3">
                <Avatar
                  name={values.primaryContactName || "Primary contact"}
                  src={values.primaryContactAvatar}
                  className="size-11"
                />
                <span className="text-xs text-[#667085]">
                  Photo is set by the contact from their own portal profile.
                </span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  value={values.primaryContactName}
                  onChange={(event) =>
                    setField("primaryContactName", event.target.value)
                  }
                  placeholder="Enter contact name"
                  className="client-form-input"
                />
              </Field>

              <Field label="Job Title">
                <input
                  value={values.primaryJobTitle}
                  onChange={(event) =>
                    setField("primaryJobTitle", event.target.value)
                  }
                  placeholder="Enter job title"
                  className="client-form-input"
                />
              </Field>

              <Field label="Email Address">
                <input
                  type="email"
                  value={values.primaryEmail}
                  onChange={(event) =>
                    setField("primaryEmail", event.target.value)
                  }
                  placeholder="Enter email address"
                  className="client-form-input"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  value={values.primaryPhone}
                  onChange={(event) =>
                    setField("primaryPhone", event.target.value)
                  }
                  placeholder="Enter phone number"
                  className="client-form-input"
                />
              </Field>

              <Field label="Preferred Contact">
                <SelectField
                  value={values.preferredContact}
                  onChange={(value) => setField("preferredContact", value)}
                  placeholder="Select contact method"
                  options={contactMethods}
                  searchable
                  searchPlaceholder="Search contact method"
                  renderOption={renderContactMethodOption}
                />
              </Field>
            </div>
          </FormSection>

          {showUpwork && (
            <FormSection
              id="upwork-details"
              title="Upwork Details"
              icon={BriefcaseBusiness}
              onActive={setActiveSection}
              tooltip="This information links the client account to its Upwork profile and contract."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Upwork Profile Name">
                  <input
                    value={values.upworkProfileName}
                    onChange={(event) =>
                      setField("upworkProfileName", event.target.value)
                    }
                    placeholder="Enter profile name"
                    className="client-form-input"
                  />
                </Field>

                <Field label="Upwork Profile URL">
                  <input
                    value={values.upworkProfileUrl}
                    onChange={(event) =>
                      setField("upworkProfileUrl", event.target.value)
                    }
                    placeholder="Paste Upwork profile URL"
                    className="client-form-input"
                  />
                </Field>

                <Field label="Contract ID">
                  <input
                    value={values.upworkContractId}
                    onChange={(event) =>
                      setField("upworkContractId", event.target.value)
                    }
                    placeholder="Enter contract ID"
                    className="client-form-input"
                  />
                </Field>

                <Field label="Upwork Contact Phone">
                  <input
                    value={values.upworkPhone}
                    onChange={(event) =>
                      setField("upworkPhone", event.target.value)
                    }
                    placeholder="Enter phone number"
                    className="client-form-input"
                  />
                </Field>

                <Field label="Contract Type">
                  <SelectField
                    value={values.contractType}
                    onChange={(value) => setField("contractType", value)}
                    placeholder="Select contract type"
                    options={contractTypes}
                  />
                </Field>

                <Field label="Budget / Rate">
                  <input
                    value={values.budgetRate}
                    onChange={(event) =>
                      setField("budgetRate", event.target.value)
                    }
                    placeholder="Enter budget or rate"
                    className="client-form-input"
                  />
                </Field>

                <Field label="Contract Status">
                  <SelectField
                    value={values.contractStatus}
                    onChange={(value) => setField("contractStatus", value)}
                    placeholder="Select contract status"
                    options={contractStatuses}
                  />
                </Field>
              </div>
            </FormSection>
          )}

          <FormSection
            id="client-team"
            title="Client Team"
            icon={UsersRound}
            onActive={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Team Member Name">
                <input
                  value={teamDraft.name}
                  onChange={(event) =>
                    setTeamDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter team member name"
                  className="client-form-input"
                />
              </Field>

              <Field label="Role">
                <SelectField
                  value={teamDraft.role}
                  onChange={(value) =>
                    setTeamDraft((current) => ({
                      ...current,
                      role: value,
                    }))
                  }
                  placeholder="Select role"
                  options={teamRoles}
                />
              </Field>

              <Field label="Email Address">
                <input
                  type="email"
                  value={teamDraft.email}
                  onChange={(event) =>
                    setTeamDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Enter email address"
                  className="client-form-input"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  value={teamDraft.phone}
                  onChange={(event) =>
                    setTeamDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Enter phone number"
                  className="client-form-input"
                />
              </Field>

              <Field label="Contact Channel">
                <SelectField
                  value={teamDraft.contactChannel}
                  onChange={(value) =>
                    setTeamDraft((current) => ({
                      ...current,
                      contactChannel: value,
                    }))
                  }
                  placeholder="Select channel"
                  options={contactMethods}
                  searchable
                  searchPlaceholder="Search contact method"
                  renderOption={renderContactMethodOption}
                />
              </Field>

              <Field label="Access Level">
                <SelectField
                  value={teamDraft.accessLevel}
                  onChange={(value) =>
                    setTeamDraft((current) => ({
                      ...current,
                      accessLevel: value,
                    }))
                  }
                  placeholder="Select access level"
                  options={accessLevels}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={addTeamMember}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[#06B6D4] bg-white px-4 text-sm font-semibold text-[#0284C7] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F0F9FF]"
            >
              Add Member
            </button>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#344054]">
                Team List
              </p>

              <div className="overflow-hidden rounded-xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(16,24,40,0.10)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-[#EAECF0] px-5 py-2 text-left text-xs font-semibold text-[#475467]">
                        Name
                      </th>

                      <th className="border-b border-[#EAECF0] px-5 py-2 text-left text-xs font-semibold text-[#475467]">
                        Role
                      </th>

                      <th className="border-b border-[#EAECF0] px-5 py-2 text-center text-xs font-semibold text-[#475467]">
                        Access Level
                      </th>

                      <th className="w-12 border-b border-[#EAECF0]" />
                    </tr>
                  </thead>

                  <tbody>
                    {values.teamMembers.map((member, index) => (
                      <tr
                        key={member.id}
                        className={
                          index % 2 === 0 ? "bg-[#F9FAFB]" : "bg-white"
                        }
                      >
                        <td className="border-b border-[#EAECF0] px-5 py-2 font-medium text-[#101828]">
                          <span className="flex items-center gap-2.5">
                            <Avatar
                              name={member.name}
                              src={member.avatar}
                              className="size-7"
                            />
                            {member.name}
                          </span>
                        </td>

                        <td className="border-b border-[#EAECF0] px-5 py-2 text-[#475467]">
                          {member.role || "-"}
                        </td>

                        <td className="border-b border-[#EAECF0] px-5 py-2 text-center text-[#475467]">
                          {member.accessLevel || "-"}
                        </td>

                        <td className="border-b border-[#EAECF0] px-2">
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.id)}
                            className="grid size-8 place-items-center rounded-lg text-[#98A2B3] hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!values.teamMembers.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-sm text-[#98A2B3]"
                        >
                          No team members added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </FormSection>

          <FormSection
            id="communication"
            title="Communication Channels"
            icon={MessageCircle}
            onActive={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="WhatsApp Number">
                <input
                  value={values.whatsappNumber}
                  onChange={(event) =>
                    setField("whatsappNumber", event.target.value)
                  }
                  placeholder="Enter WhatsApp number"
                  className="client-form-input"
                />
              </Field>

              <Field label="Viber Number">
                <input
                  value={values.viberNumber}
                  onChange={(event) =>
                    setField("viberNumber", event.target.value)
                  }
                  placeholder="Enter Viber number"
                  className="client-form-input"
                />
              </Field>

              <Field label="Communication Preference">
                <SelectField
                  value={values.communicationPreference}
                  onChange={(value) =>
                    setField("communicationPreference", value)
                  }
                  placeholder="Select preference"
                  options={communicationPreferences}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="projects"
            title="Project Assignment"
            icon={BriefcaseBusiness}
            onActive={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Assigned Projects">
                <ProjectMultiSelect
                  values={values.projectIds}
                  onChange={(value) => setField("projectIds", value)}
                  placeholder="Select related projects."
                  projects={projects ?? []}
                  onNewProject={() =>
                    router.push(
                      `${projectBaseHref}/new?returnTo=${encodeURIComponent(
                        initialRecord
                          ? `${clientBaseHref}/${initialRecord.id}/edit`
                          : `${clientBaseHref}/new`,
                      )}`,
                    )
                  }
                />
              </Field>

              <Field label="Account Manager">
                <SelectField
                  value={values.accountManagerId}
                  onChange={(value) => setField("accountManagerId", value)}
                  placeholder="Select account manager"
                  searchable
                  searchPlaceholder="Search people"
                  options={(users ?? []).map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>

              <Field label="Project Coordinator">
                <SelectField
                  value={values.coordinatorId}
                  onChange={(value) => setField("coordinatorId", value)}
                  placeholder="Select coordinator"
                  searchable
                  searchPlaceholder="Search people"
                  options={(users ?? []).map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="integration"
            title="API / Integration Setup"
            icon={Code2}
            onActive={setActiveSection}
            tooltip="Store client-specific integration settings here."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Integration Type">
                <SelectField
                  value={values.integrationType}
                  onChange={(value) => setField("integrationType", value)}
                  placeholder="Select integration type"
                  options={integrationTypes}
                />
              </Field>

              <Field label="API Base URL">
                <input
                  value={values.apiBaseUrl}
                  onChange={(event) =>
                    setField("apiBaseUrl", event.target.value)
                  }
                  placeholder="Paste API base URL"
                  className="client-form-input"
                />
              </Field>

              <Field label="Webhook URL">
                <input
                  value={values.webhookUrl}
                  onChange={(event) =>
                    setField("webhookUrl", event.target.value)
                  }
                  placeholder="Paste webhook URL"
                  className="client-form-input"
                />
              </Field>

              <Field label="API Key / Token">
                <input
                  value={values.apiKey}
                  onChange={(event) => setField("apiKey", event.target.value)}
                  placeholder="Enter API key or token"
                  className="client-form-input"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="notes"
            title="Internal Notes"
            icon={FileLock2}
            onActive={setActiveSection}
          >
            <Field label="Description">
              <div className="rounded-lg border border-[#D0D5DD] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                <RichTextEditor
                  value={values.internalNotes}
                  onChange={(value) => setField("internalNotes", value)}
                  placeholder="Add internal client notes"
                />
              </div>

              <p className="mt-1 text-xs text-[#667085]">
                {plainLength(values.internalNotes)} / 1000 characters
              </p>
            </Field>
          </FormSection>
        </main>
      </div>

      {notice && (
        <StickyToast
          message={notice}
          kind={noticeKind}
          onDismiss={() => {
            setNotice("");
            setError("");
          }}
        />
      )}
    </div>
  );
}

function FormSection({
  id,
  title,
  icon: Icon,
  tooltip,
  onActive,
  children,
}: {
  id: SectionId;
  title: string;
  icon: typeof Building2;
  tooltip?: string;
  onActive: (id: SectionId) => void;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      onMouseDown={() => onActive(id)}
      onFocusCapture={() => onActive(id)}
      className="scroll-mt-36 space-y-4"
    >
      <div className="flex items-center gap-3">
        <Icon size={24} className="text-[#101828]" />

        <div className="flex items-center gap-1">
          <h2
            className="text-[24px] font-bold leading-8 text-[#101828]"
            style={{
              fontFamily: "var(--font-satoshi), Arial, sans-serif",
            }}
          >
            {title}
          </h2>

          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium leading-5 text-[#344054]">
        {label}
      </span>

      {children}
    </label>
  );
}

function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Help"
        className="grid size-6 place-items-center"
      >
        <CircleHelp size={20} />
      </button>

      <span className="pointer-events-none absolute left-1/2 top-full z-[100] mt-2 hidden w-64 -translate-x-1/2 rounded-lg bg-[#101828] px-3 py-2 text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

type SelectOption =
  | string
  | {
      value: string;
      label: string;
    };

function renderContactMethodOption(value: string, label: string) {
  const icon =
    value === "Email" ? (
      <Mail size={16} className="text-[#475467]" />
    ) : value === "Phone" ? (
      <Phone size={16} className="text-[#0284C7]" />
    ) : value === "WhatsApp" ? (
      <MessageCircle size={16} className="text-[#22C55E]" />
    ) : value === "Viber" ? (
      <MessageCircle size={16} className="text-[#7360F2]" />
    ) : (
      <span className="grid size-4 place-items-center rounded bg-[#4A154B] text-[9px] font-bold text-white">S</span>
    );

  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function normalizedOption(option: SelectOption) {
  return typeof option === "string"
    ? {
        value: option,

        label: option,
      }
    : option;
}

function SelectField({
  value,
  onChange,
  placeholder,
  options,
  searchable = false,
  searchPlaceholder = "Search",
  renderOption,
}: {
  value: string;

  onChange: (value: string) => void;

  placeholder: string;

  options: SelectOption[];

  searchable?: boolean;

  searchPlaceholder?: string;

  renderOption?: (value: string, label: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const normalized = useMemo(() => options.map(normalizedOption), [options]);

  const selected = normalized.find((option) => option.value === value);

  const visible = normalized.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <span className="relative block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border bg-white px-[14px] text-left text-base shadow-[0_1px_2px_rgba(16,24,40,0.05)]",

          open
            ? "border-[#0284C7] ring-[3px] ring-[#0284C7]/10"
            : "border-[#D0D5DD]",
        )}
      >
        <span className={cn("min-w-0 flex-1", !selected && "text-[#98A2B3]")}>
          {selected ? (
            renderOption ? (
              renderOption(selected.value, selected.label)
            ) : (
              <span className="block truncate text-[#344054]">
                {selected.label}
              </span>
            )
          ) : (
            <span className="block truncate">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          size={20}
          className={cn(
            "text-[#98A2B3] transition-transform",

            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => {
              setOpen(false);

              setSearch("");
            }}
          />

          <span className="absolute left-0 top-[48px] z-50 block w-full overflow-hidden rounded-lg border border-[#D0D5DD] bg-white shadow-[0_4px_12px_rgba(16,24,40,0.14)]">
            {searchable && (
              <span className="relative block border-b border-[#EAECF0] p-2">
                <Search
                  size={17}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
                />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-[#D0D5DD] pl-9 pr-3 text-sm outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
                />
              </span>
            )}

            <span className="block max-h-72 overflow-y-auto px-4">
              {visible.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);

                    setOpen(false);

                    setSearch("");
                  }}
                  className="flex min-h-[52px] w-full items-center justify-between border-b border-[#EAECF0] px-1 text-left text-base text-[#667085] last:border-b-0 hover:text-[#344054]"
                >
                  <span className="min-w-0">
                    {renderOption
                      ? renderOption(option.value, option.label)
                      : option.label}
                  </span>

                  {option.value === value && (
                    <Check size={17} className="text-[#0284C7]" />
                  )}
                </button>
              ))}

              {!visible.length && (
                <span className="block py-6 text-center text-sm text-[#98A2B3]">
                  No matching options.
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </span>
  );
}

function ProjectMultiSelect({
  values,
  onChange,
  placeholder,
  projects,
  onNewProject,
}: {
  values: string[];

  onChange: (values: string[]) => void;

  placeholder: string;

  projects: Project[];

  onNewProject: () => void;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const selectedProjects = projects.filter((project) =>
    values.includes(project.id),
  );

  const visibleProjects = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.name,
        project.client,
        project.status,
        project.formData?.projectType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [projects, search]);

  function toggleProject(projectId: string) {
    if (values.includes(projectId)) {
      onChange(values.filter((id) => id !== projectId));

      return;
    }

    onChange([...values, projectId]);
  }

  function close() {
    setOpen(false);
    setSearch("");
  }

  return (
    <span className="relative block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-lg border bg-white px-[14px] text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)]",

          open
            ? "border-[#0284C7] ring-[3px] ring-[#0284C7]/10"
            : "border-[#D0D5DD]",
        )}
      >
        <span
          className={cn(
            "flex min-w-0 flex-1 flex-wrap gap-1.5",

            !selectedProjects.length && "text-[#98A2B3]",
          )}
        >
          {selectedProjects.length ? (
            selectedProjects.map((project) => (
              <span
                key={project.id}
                className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-[#B2DDFF] bg-[#EFF8FF] px-2 py-0.5 text-xs font-medium text-[#175CD3]"
              >
                <span className="truncate">{project.name}</span>

                <button
                  type="button"
                  aria-label={`Remove ${project.name}`}
                  onClick={(event) => {
                    event.stopPropagation();

                    toggleProject(project.id);
                  }}
                  className="grid size-4 place-items-center rounded-full hover:bg-[#D1E9FF]"
                >
                  <X size={11} />
                </button>
              </span>
            ))
          ) : (
            <span>{placeholder}</span>
          )}
        </span>

        <ChevronDown
          size={20}
          className={cn(
            "ml-2 shrink-0 text-[#98A2B3] transition-transform",

            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close projects dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={close}
          />

          <span className="absolute left-0 top-[48px] z-50 block w-full overflow-hidden rounded-lg border border-[#D0D5DD] bg-white shadow-[0_4px_12px_rgba(16,24,40,0.14)]">
            {/* Search + New Project */}

            <span className="flex items-center gap-2 border-b border-[#EAECF0] p-2">
              <span className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
                />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Project"
                  className="h-10 w-full rounded-lg border border-[#D0D5DD] pl-9 pr-3 text-sm text-[#344054] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
                />
              </span>

              <button
                type="button"
                onClick={() => {
                  close();

                  onNewProject();
                }}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#06B6D4] bg-white px-3 text-xs font-semibold text-[#0284C7] transition hover:bg-[#F0F9FF]"
              >
                <Plus size={14} />
                New Project
              </button>
            </span>

            {/* Options */}

            <span className="block max-h-72 overflow-y-auto px-3">
              {visibleProjects.map((project) => {
                const checked = values.includes(project.id);

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    className="flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-[#EAECF0] px-1 text-left last:border-b-0 hover:bg-[#F9FAFB]"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-medium text-[#344054]">
                        {project.name}
                      </strong>

                      <small className="mt-0.5 block truncate text-xs text-[#98A2B3]">
                        {project.client && project.client !== "Unassigned"
                          ? project.client
                          : typeof project.formData?.projectType === "string"
                            ? project.formData.projectType
                            : "Unassigned project"}
                      </small>
                    </span>

                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded border",

                        checked
                          ? "border-[#0284C7] bg-[#0284C7] text-white"
                          : "border-[#D0D5DD] bg-white",
                      )}
                    >
                      {checked && <Check size={14} />}
                    </span>
                  </button>
                );
              })}

              {!visibleProjects.length && (
                <span className="block py-8 text-center text-sm text-[#98A2B3]">
                  No matching projects.
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </span>
  );
}

function plainLength(value: string) {
  return value.replace(/<[^>]*>/g, "").trim().length;
}

