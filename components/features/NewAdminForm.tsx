"use client";

import {
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Loader2,
  Mail,
  MessageCircle,
  X,
  Phone,
  Send,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";

import { roleFromJobTitle } from "@/lib/userRoles";

import { type ReactNode, useMemo, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import type {
  AdminEditorRecord,
  AdminFormData,
  AdminUserStatus,
} from "@/types";

type SectionId = "basic" | "contact" | "skills";

type SelectOption = {
  value: string;
  label: string;
};

const sectionItems: Array<{
  id: SectionId;
  title: string;
  subtitle?: string;
  icon: typeof UserRound;
}> = [
  {
    id: "basic",
    title: "Basic Information",
    subtitle: "Select Project, module, and link.",
    icon: UserRound,
  },
  {
    id: "contact",
    title: "Contact Information",
    icon: Phone,
  },
  {
    id: "skills",
    title: "Skills & Role Details",
    icon: Code2,
  },
];

const initialValues: AdminFormData = {
  firstName: "",
  lastName: "",
  jobTitle: "",

  email: "",
  phone: "",
  communicationChannel: "",

  skills: [],
  experienceLevel: "",
  employmentType: "",

  status: "Active",
};

const jobTitles = ["Super Admin", "Admin"];

const experienceLevels = [
  "Junior",
  "Mid Level",
  "Senior",
  "Lead",
  "Principal",
  "Manager",
  "Director",
];

const employmentTypes = ["Full Time", "Part Time", "Contract", "Freelance"];

const communicationChannels = ["Email", "Slack", "WhatsApp", "Viber"];

function renderCommunicationChannelOption(value: string, label: string) {
  const icon =
    value === "Email" ? (
      <Mail size={16} className="text-[#475467]" />
    ) : value === "WhatsApp" ? (
      <MessageCircle size={16} className="text-[#22C55E]" />
    ) : value === "Viber" ? (
      <MessageCircle size={16} className="text-[#7360F2]" />
    ) : (
      <span className="grid size-4 place-items-center rounded bg-[#4A154B] text-[9px] font-bold text-white">
        S
      </span>
    );

  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function displayRole(role: string) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function valuesFromAdmin(admin?: AdminEditorRecord): AdminFormData {
  if (!admin) {
    return {
      ...initialValues,
    };
  }

  return {
    ...initialValues,
    ...admin.formData,

    /*
     * If legacy form_data lost jobTitle,
     * restore it from users.role.
     */
    jobTitle: admin.formData.jobTitle || displayRole(admin.role),

    email: admin.formData.email || admin.email,
  };
}

export default function NewAdminForm({
  initialAdmin,
}: {
  initialAdmin?: AdminEditorRecord;
}) {
  const router = useRouter();

  const editing = Boolean(initialAdmin);

  const [values, setValues] = useState<AdminFormData>(() =>
    valuesFromAdmin(initialAdmin),
  );

  const [activeSection, setActiveSection] = useState<SectionId>("basic");

  const [photo, setPhoto] = useState<File | null>(null);

  const [photoPreview, setPhotoPreview] = useState(initialAdmin?.avatar ?? "");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [savedMessage, setSavedMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const originalValues = useMemo(
    () => valuesFromAdmin(initialAdmin),
    [initialAdmin],
  );

  function setField<Key extends keyof AdminFormData>(
    key: Key,
    value: AdminFormData[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goToSection(section: SectionId) {
    setActiveSection(section);

    document.getElementById(`admin-${section}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handlePhoto(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");

      return;
    }

    setPhoto(file);

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);

    setPhotoPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    setValues(originalValues);

    setPhoto(null);

    setPhotoPreview(initialAdmin?.avatar ?? "");

    setError("");

    setSavedMessage("");

    goToSection("basic");
  }

  function validate() {
    if (!values.firstName.trim()) {
      return "First name is required.";
    }

    if (!values.lastName.trim()) {
      return "Last name is required.";
    }

    if (!values.email.trim()) {
      return "Email address is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return "Enter a valid email address.";
    }

    if (!values.jobTitle.trim()) {
      return "Job title is required.";
    }

    return "";
  }

  async function submit(saveOnly = false) {
    const validation = validate();

    if (validation) {
      setError(validation);

      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);

    setError("");

    setSavedMessage("");

    try {
      const avatar = photoPreview.trim() ? photoPreview : null;

      const firstName = values.firstName.trim();

      const lastName = values.lastName.trim();

      const jobTitle = values.jobTitle.trim();

      const email = values.email.trim().toLowerCase();

      /*
       * =====================================================
       * CRITICAL FIX
       *
       * Job Title:
       *   Super Admin
       *
       * becomes:
       *   superadmin
       *
       * and that value is explicitly sent in payload.role.
       * =====================================================
       */

      const role = roleFromJobTitle(jobTitle);

      if (!role) {
        throw new Error("Unable to determine the account role.");
      }

      const lifecycle = saveOnly
        ? "DRAFT"
        : values.status === "Inactive"
          ? "DRAFT"
          : "OPEN";

      const payload = {
        name: [firstName, lastName].filter(Boolean).join(" "),

        email,

        /*
         * THIS WAS THE MISSING VALUE.
         *
         * Super Admin -> superadmin
         */
        role,

        avatar,

        lifecycle,

        formData: {
          ...values,

          firstName,

          lastName,

          /*
           * Keep human readable value:
           * Super Admin
           */
          jobTitle,

          email,

          workEmail: email,

          /*
           * Store it in form_data too
           * so there is no ambiguity when debugging.
           */
          role,
        },
      };

      const endpoint =
        editing && initialAdmin?.id
          ? `/api/users/${encodeURIComponent(initialAdmin.id)}`
          : "/api/users";

      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        id?: string;

        role?: string;

        error?: string;

        warning?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Unable to save admin.",
        );
      }

      /*
       * Important debugging guard.
       *
       * If a Super Admin somehow comes back without
       * role=superadmin, immediately expose the problem
       * instead of silently redirecting.
       */
      if (jobTitle === "Super Admin" && body.role !== "superadmin") {
        throw new Error(
          `Super Admin was saved with invalid role "${body.role ?? ""}". Expected "superadmin".`,
        );
      }

      if (saveOnly) {
        setSavedMessage(
          editing
            ? "Admin changes saved successfully."
            : "Admin draft saved successfully.",
        );

        if (!editing && body.id) {
          router.replace(`/admin/users/${body.id}/edit`);

          router.refresh();
        }

        return;
      }

      router.push("/admin/users");

      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save admin.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!error && !savedMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setError("");
      setSavedMessage("");
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [error, savedMessage]);

  return (
    <div className="admin-form-page">
      {/* =================================================
          STICKY HEADER
         ================================================= */}

      <header className="admin-form-header">
        <h1>{editing ? initialAdmin?.name || "Edit Admin" : "New Admin"}</h1>

        <div className="admin-form-header-actions">
          <button
            type="button"
            disabled={saving}
            onClick={resetForm}
            className="admin-form-secondary-button"
          >
            Reset
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit(true)}
            className="admin-form-secondary-button"
          >
            Save Info
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="admin-form-primary-button"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}

            {editing ? "Save Changes" : "Save and Register"}
          </button>
        </div>
      </header>

      <div className="admin-form-layout">
        {/* =================================================
            SIDEBAR
           ================================================= */}

        <aside className="admin-form-sidebar">
          {sectionItems.map((section, index) => {
            const Icon = section.icon;

            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => goToSection(section.id)}
                className={cn(
                  "admin-form-step",
                  active && "admin-form-step-active",
                )}
              >
                <span className="admin-form-step-icon-wrap">
                  <span className="admin-form-step-icon">
                    <Icon size={24} />
                  </span>

                  {index < sectionItems.length - 1 && (
                    <span className="admin-form-step-line" />
                  )}
                </span>

                <span className="admin-form-step-copy">
                  <strong>{section.title}</strong>

                  {section.subtitle && <small>{section.subtitle}</small>}
                </span>
              </button>
            );
          })}
        </aside>

        {/* =================================================
            FORM
           ================================================= */}

        <main className="admin-form-content">
          {/* =============================================
              BASIC
             ============================================= */}

          <section
            id="admin-basic"
            className="admin-form-section scroll-mt-36"
            onFocusCapture={() => setActiveSection("basic")}
            onClick={() => setActiveSection("basic")}
          >
            <SectionTitle icon={UserRound}>Basic Information</SectionTitle>

            <div className="admin-form-grid">
              <Field label="First Name">
                <input
                  value={values.firstName}
                  onChange={(event) =>
                    setField("firstName", event.target.value)
                  }
                  placeholder="Resource first name."
                  className="admin-form-input"
                />
              </Field>

              <Field label="Last Name">
                <input
                  value={values.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  placeholder="Resource last name."
                  className="admin-form-input"
                />
              </Field>

              <Field label="Job Title">
                <AdminSelect
                  value={values.jobTitle}
                  placeholder="Role or position."
                  options={jobTitles.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  onChange={(value) => setField("jobTitle", value)}
                />
              </Field>
            </div>

            <div className="admin-form-photo-block">
              <span className="admin-form-field-label">Profile Image</span>

              {photoPreview && (
                <div className="admin-form-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Admin profile" />

                  <button
                    type="button"
                    aria-label="Remove profile photo"
                    onClick={removePhoto}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handlePhoto(event.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="admin-form-upload"
              >
                <span className="admin-form-upload-icon">
                  <UploadCloud size={20} />
                </span>

                <span>
                  <strong>Click to upload</strong> or drag and drop
                </span>

                <small>SVG, PNG, JPG or GIF (max. 800×400px)</small>
              </button>
            </div>
          </section>

          {/* =============================================
              CONTACT
             ============================================= */}

          <section
            id="admin-contact"
            className="admin-form-section scroll-mt-36"
            onFocusCapture={() => setActiveSection("contact")}
            onClick={() => setActiveSection("contact")}
          >
            <SectionTitle
              icon={Phone}
              help="Enter the primary contact information used to reach this administrator."
            >
              Contact Information
            </SectionTitle>

            <div className="admin-form-grid">
              <Field label="Email Address">
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => setField("email", event.target.value)}
                  placeholder="Work email."
                  className="admin-form-input"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  value={values.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  placeholder="Select client owner"
                  className="admin-form-input"
                />
              </Field>

              <Field label="Communication Channel">
                <AdminSelect
                  value={values.communicationChannel}
                  placeholder="Preferred contact method."
                  options={communicationChannels.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  onChange={(value) => setField("communicationChannel", value)}
                />
              </Field>
            </div>
          </section>

          {/* =============================================
              SKILLS
             ============================================= */}

          <section
            id="admin-skills"
            className="admin-form-section scroll-mt-36"
            onFocusCapture={() => setActiveSection("skills")}
            onClick={() => setActiveSection("skills")}
          >
            <SectionTitle icon={Code2}>Skills & Role Details</SectionTitle>

            <div className="admin-form-grid">
              <Field label="Skillset">
                <SkillInput
                  values={values.skills}
                  onChange={(skills) => setField("skills", skills)}
                />
              </Field>

              <Field label="Experience Level">
                <AdminSelect
                  value={values.experienceLevel}
                  placeholder="Resource seniority."
                  options={experienceLevels.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  onChange={(value) => setField("experienceLevel", value)}
                />
              </Field>

              <Field label="Employment Type">
                <AdminSelect
                  value={values.employmentType}
                  placeholder="Full-time or contract."
                  options={employmentTypes.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  onChange={(value) => setField("employmentType", value)}
                />
              </Field>

              <Field label="Status">
                <AdminStatusSelect
                  value={values.status}
                  onChange={(value) => setField("status", value)}
                />
              </Field>
            </div>
          </section>

          {(error || savedMessage) && (
            <div
              role={error ? "alert" : "status"}
              className={cn(
                "admin-form-toast",
                error ? "admin-form-toast-error" : "admin-form-toast-success",
              )}
            >
              <span>{error || savedMessage}</span>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => {
                  setError("");
                  setSavedMessage("");
                }}
                className="admin-form-toast-close"
              >
                <X size={17} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   SHARED
   ========================================================= */

function SectionTitle({
  icon: Icon,
  help,
  children,
}: {
  icon: typeof UserRound;

  help?: string;

  children: ReactNode;
}) {
  return (
    <div className="admin-form-section-title">
      <Icon size={24} />

      <h2>{children}</h2>

      {help && (
        <span className="admin-form-help">
          <CircleHelp size={20} />

          <span className="admin-form-help-tooltip">{help}</span>
        </span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-form-field">
      <span className="admin-form-field-label">{label}</span>

      {children}
    </label>
  );
}

function AdminSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;

  placeholder: string;

  options: SelectOption[];

  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="admin-form-select-trigger"
      >
        <span className={cn(!value && "text-[#98A2B3]")}>
          {value || placeholder}
        </span>

        <ChevronDown size={18} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          <span className="admin-form-select-menu">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);

                  setOpen(false);
                }}
                className="admin-form-select-option"
              >
                <span>{option.label}</span>

                {value === option.value && <Check size={16} />}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function SkillInput({
  values,
  onChange,
}: {
  values: string[];

  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addSkill() {
    const skill = input.trim();

    if (!skill || values.includes(skill)) {
      setInput("");

      return;
    }

    onChange([...values, skill]);

    setInput("");
  }

  return (
    <div className="admin-form-skill-input">
      <div className="admin-form-skill-tags">
        {values.map((skill) => (
          <span key={skill}>
            {skill}

            <button
              type="button"
              onClick={() =>
                onChange(values.filter((value) => value !== skill))
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <input
        value={input}
        placeholder="Skillset goes here"
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();

            addSkill();
          }
        }}
      />
    </div>
  );
}

function AdminStatusSelect({
  value,
  onChange,
}: {
  value: AdminUserStatus;

  onChange: (value: AdminUserStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative block">
      <button
        type="button"
        className="admin-form-select-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <AdminStatusBadge status={value} />

        <ChevronDown size={18} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Close status dropdown"
            onClick={() => setOpen(false)}
          />

          <span className="admin-form-select-menu">
            {(["Active", "Inactive"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className="admin-form-select-option"
                onClick={() => {
                  onChange(status);

                  setOpen(false);
                }}
              >
                <AdminStatusBadge status={status} />

                {value === status && <Check size={16} />}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function AdminStatusBadge({ status }: { status: AdminUserStatus }) {
  return (
    <span
      className={cn(
        "admin-form-status-badge",

        status === "Active"
          ? "admin-form-status-active"
          : "admin-form-status-inactive",
      )}
    >
      {status}
    </span>
  );
}
