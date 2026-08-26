"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Phone,
  RotateCcw,
  Send,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type ReactNode,
  useState,
} from "react";

import StickyToast from "@/components/ui/StickyToast";
import { cn } from "@/lib/utils";
import type { ClientPortalTeamMember } from "@/types/clientPortal";

type SectionId = "basic" | "contact" | "access";

type FormValues = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  communicationChannel: string;
  avatar: string;
};

const sections: Array<{
  id: SectionId;
  title: string;
  description?: string;
  icon: typeof UserRound;
}> = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Name, job title, and photo.",
    icon: UserRound,
  },
  {
    id: "contact",
    title: "Contact Information",
    icon: Phone,
  },
  {
    id: "access",
    title: "Portal Access",
    icon: BriefcaseBusiness,
  },
];

const communicationOptions = [
  "Email",
  "Phone",
  "WhatsApp",
  "Viber",
] as const;

function valuesFromMember(
  member?: ClientPortalTeamMember,
): FormValues {
  if (!member) {
    return {
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      communicationChannel: "Email",
      avatar: "",
    };
  }

  const [fallbackFirst = "", ...fallbackRest] = member.name
    .trim()
    .split(/\s+/);

  return {
    firstName: member.firstName?.trim() || fallbackFirst,
    lastName:
      member.lastName?.trim() || fallbackRest.join(" "),
    jobTitle: member.jobTitle || "",
    email: member.email || "",
    phone: member.phone || "",
    communicationChannel:
      member.communicationChannel || "Email",
    avatar: member.avatar || "",
  };
}

export default function NewClientTeamMemberForm({
  initialMember,
}: {
  initialMember?: ClientPortalTeamMember;
}) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(() =>
    valuesFromMember(initialMember),
  );
  const [activeSection, setActiveSection] =
    useState<SectionId>("basic");
  const [photoPreview, setPhotoPreview] = useState(
    initialMember?.avatar || "",
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] =
    useState<"success" | "error">("error");

  const editing = Boolean(initialMember);

  function setField<K extends keyof FormValues>(
    field: K,
    value: FormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function navigateTo(id: SectionId) {
    setActiveSection(id);

    document
      .getElementById(`client-team-member-${id}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function resetForm() {
    const initial = valuesFromMember(initialMember);
    setValues(initial);
    setPhotoPreview(initial.avatar);
    setNotice("");
    navigateTo("basic");
  }

  function handlePhoto(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNoticeKind("error");
      setNotice("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNoticeKind("error");
      setNotice("Profile image must be smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        typeof reader.result === "string" ? reader.result : "";

      setPhotoPreview(result);
      setField("avatar", result);
      setNotice("");
    };

    reader.readAsDataURL(file);
  }

  function validate() {
    if (!values.firstName.trim()) {
      return "First name is required.";
    }

    if (!values.email.trim()) {
      return "Email address is required.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        values.email.trim(),
      )
    ) {
      return "Enter a valid email address.";
    }

    return "";
  }

  async function save() {
    if (saving) return;

    const validation = validate();

    if (validation) {
      setNoticeKind("error");
      setNotice(validation);
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch(
        editing
          ? `/api/client-portal/team/${encodeURIComponent(
              initialMember!.id,
            )}`
          : "/api/client-portal/team",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...values,
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            jobTitle: values.jobTitle.trim(),
            avatar: photoPreview || "",
          }),
        },
      );

      const body = (await response
        .json()
        .catch(() => ({}))) as {
        error?: string;
        inviteSent?: boolean;
      };

      if (!response.ok) {
        throw new Error(
          body.error ||
            (editing
              ? "Unable to update team member."
              : "Unable to add team member."),
        );
      }

      router.push("/client-portal/team");
      router.refresh();
    } catch (reason) {
      setNoticeKind("error");
      setNotice(
        reason instanceof Error
          ? reason.message
          : editing
            ? "Unable to update team member."
            : "Unable to add team member.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="new-resource-page client-team-member-form">
      <style>{`
        /*
         * The form intentionally inherits the Admin NewResourceForm
         * classes from app/globals.css. These scoped values bring the
         * dimensions in line with the supplied New Team Member Figma CSS:
         * 264px step rail + 32px gap + 1080px form content.
         */
        .client-team-member-form .new-resource-layout {
          grid-template-columns: 264px minmax(0, 1080px);
          gap: 32px;
        }

        .client-team-member-form .new-resource-form {
          width: 100%;
          max-width: 1080px;
        }

        .client-team-member-form .new-resource-grid {
          grid-template-columns: repeat(2, minmax(0, 524px));
          gap: 16px 32px;
        }

        .client-team-member-form .client-team-form-cancel {
          width: 72px;
        }

        .client-team-member-form .client-team-form-reset {
          width: 95px;
        }

        .client-team-member-form .client-team-form-submit {
          min-width: 178px;
        }

        .client-team-member-form .client-team-access-panel {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 524px));
          gap: 16px 32px;
        }

        .client-team-member-form .client-team-readonly {
          min-height: 70px;
        }

        .client-team-member-form .client-team-readonly-box {
          display: flex;
          min-height: 44px;
          align-items: center;
          border: 1px solid #eaecf0;
          border-radius: 8px;
          background: #f9fafb;
          padding: 10px 14px;
          color: #475467;
          font-family: Geist, Inter, sans-serif;
          font-size: 16px;
          line-height: 24px;
        }

        .client-team-member-form .client-team-access-note {
          grid-column: 1 / -1;
          border: 1px solid #b2e8f2;
          border-radius: 8px;
          background: #f0fbfd;
          padding: 14px 16px;
          color: #475467;
          font-size: 14px;
          line-height: 22px;
        }

        @media (max-width: 1100px) {
          .client-team-member-form .new-resource-layout {
            grid-template-columns: 230px minmax(0, 1fr);
          }
        }

        @media (max-width: 820px) {
          .client-team-member-form .new-resource-layout {
            grid-template-columns: 1fr;
          }

          .client-team-member-form .new-resource-sidebar {
            position: static;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .client-team-member-form .new-resource-step {
            min-height: auto;
            grid-template-columns: 40px 1fr;
          }

          .client-team-member-form .new-resource-step-icon {
            width: 40px;
            height: 40px;
          }

          .client-team-member-form .new-resource-step-line {
            display: none;
          }

          .client-team-member-form .new-resource-grid,
          .client-team-member-form .client-team-access-panel {
            grid-template-columns: 1fr;
          }

          .client-team-member-form .client-team-access-note {
            grid-column: auto;
          }
        }

        @media (max-width: 620px) {
          .client-team-member-form .new-resource-sidebar {
            grid-template-columns: 1fr;
          }

          .client-team-member-form .new-resource-actions {
            width: 100%;
          }

          .client-team-member-form .new-resource-button-secondary,
          .client-team-member-form .new-resource-button-primary {
            width: auto;
            flex: 1 1 auto;
          }
        }
      `}</style>

      <header className="sticky top-0 z-30 -mx-3 mb-7 border-b border-[#EAECF0] bg-white/95 px-3 py-4 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1
            className="text-[30px] font-bold leading-[38px] text-[#101828]"
            style={{
              fontFamily: "Satoshi, Arial, sans-serif",
            }}
          >
            {editing ? "Edit Team Member" : "New Team Member"}
          </h1>

          <div className="new-resource-actions">
            <Link
              href="/client-portal/team"
              className="new-resource-button-secondary client-team-form-cancel"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="new-resource-button-secondary client-team-form-reset"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="new-resource-button-primary client-team-form-submit"
            >
              <Send size={18} />

              {saving
                ? editing
                  ? "Saving..."
                  : "Creating..."
                : editing
                  ? "Save Changes"
                  : "Create & Invite"}
            </button>
          </div>
        </div>
      </header>

      <div className="new-resource-layout">
        <aside
          className="new-resource-sidebar"
          aria-label="Team member form sections"
        >
          {sections.map((section, index) => {
            const Icon = section.icon;
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => navigateTo(section.id)}
                className={cn(
                  "new-resource-step",
                  active && "new-resource-step-active",
                )}
              >
                <span className="new-resource-step-icon">
                  <Icon size={22} />
                </span>

                <span className="new-resource-step-copy">
                  <strong>{section.title}</strong>
                  {section.description ? (
                    <small>{section.description}</small>
                  ) : null}
                </span>

                {index < sections.length - 1 ? (
                  <span className="new-resource-step-line" />
                ) : null}
              </button>
            );
          })}
        </aside>

        <main className="new-resource-form">
          <TeamFormSection
            id="basic"
            title="Basic Team Member Information"
            icon={UserRound}
            active={activeSection === "basic"}
            onActive={() => setActiveSection("basic")}
          >
            <div className="new-resource-grid">
              <TextField
                label="First Name"
                value={values.firstName}
                placeholder="Enter first name."
                onChange={(value) =>
                  setField("firstName", value)
                }
              />

              <TextField
                label="Last Name"
                value={values.lastName}
                placeholder="Enter last name."
                onChange={(value) =>
                  setField("lastName", value)
                }
              />

              <TextField
                label="Job Title"
                value={values.jobTitle}
                placeholder="Enter job title."
                onChange={(value) =>
                  setField("jobTitle", value)
                }
              />
            </div>

            <div className="mt-5 max-w-[504px]">
              <span className="new-resource-label">
                Profile Image
              </span>

              {photoPreview ? (
                <div className="new-resource-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Team member profile preview"
                  />

                  <button
                    type="button"
                    aria-label="Remove profile image"
                    onClick={() => {
                      setPhotoPreview("");
                      setField("avatar", "");
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : null}

              <label
                className="new-resource-upload"
                onDragOver={(event) =>
                  event.preventDefault()
                }
                onDrop={(event) => {
                  event.preventDefault();
                  handlePhoto(
                    event.dataTransfer.files?.[0],
                  );
                }}
              >
                <span className="new-resource-upload-icon">
                  <UploadCloud size={20} />
                </span>

                <span>
                  <strong>Click to upload</strong> or drag and drop
                </span>

                <small>
                  SVG, PNG, JPG or GIF (max. 5 MB)
                </small>

                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(
                    event: ChangeEvent<HTMLInputElement>,
                  ) => {
                    handlePhoto(
                      event.target.files?.[0],
                    );
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </TeamFormSection>

          <TeamFormSection
            id="contact"
            title="Contact Information"
            icon={Phone}
            active={activeSection === "contact"}
            onActive={() => setActiveSection("contact")}
          >
            <div className="new-resource-grid">
              <TextField
                label="Email Address"
                type="email"
                value={values.email}
                placeholder="Work email."
                onChange={(value) =>
                  setField("email", value)
                }
              />

              <TextField
                label="Phone Number"
                type="tel"
                value={values.phone}
                placeholder="Enter phone number."
                onChange={(value) =>
                  setField("phone", value)
                }
              />

              <ContactMethodDropdown
                value={values.communicationChannel}
                onChange={(value) =>
                  setField(
                    "communicationChannel",
                    value,
                  )
                }
              />
            </div>
          </TeamFormSection>

          <TeamFormSection
            id="access"
            title="Portal Access"
            icon={BriefcaseBusiness}
            active={activeSection === "access"}
            onActive={() => setActiveSection("access")}
          >
            <div className="client-team-access-panel">
              <div className="new-resource-field client-team-readonly">
                <span className="new-resource-label">
                  Portal
                </span>
                <div className="client-team-readonly-box">
                  Client Portal
                </div>
              </div>

              <div className="new-resource-field client-team-readonly">
                <span className="new-resource-label">
                  Access Level
                </span>
                <div className="client-team-readonly-box">
                  Client User
                </div>
              </div>

              <div className="client-team-access-note">
                {editing
                  ? "This user keeps Client Portal access for the same client account. Role changes, project administration, internal priority ordering, resource assignment, and staff-only comments remain restricted."
                  : "The new member receives Client Portal access for the same client account. After creation, the portal sends a password-setup invitation when email delivery is available."}
              </div>
            </div>
          </TeamFormSection>
        </main>
      </div>

      {notice ? (
        <StickyToast
          message={notice}
          kind={noticeKind}
          onDismiss={() => setNotice("")}
        />
      ) : null}
    </div>
  );
}

function TeamFormSection({
  id,
  title,
  icon: Icon,
  active,
  onActive,
  children,
}: {
  id: SectionId;
  title: string;
  icon: typeof UserRound;
  active: boolean;
  onActive: () => void;
  children: ReactNode;
}) {
  return (
    <section
      id={`client-team-member-${id}`}
      onFocusCapture={onActive}
      onPointerDownCapture={onActive}
      className={cn(
        "new-resource-section scroll-mt-32",
        active && "new-resource-section-active",
      )}
    >
      <div className="new-resource-section-heading">
        <Icon size={24} />
        <h2>{title}</h2>
      </div>

      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="new-resource-field">
      <span className="new-resource-label">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="new-resource-input"
      />
    </label>
  );
}

function ContactMethodDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="new-resource-field">
      <span className="new-resource-label">
        Preferred Contact Method
      </span>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "new-resource-dropdown-trigger",
          open && "new-resource-dropdown-trigger-open",
        )}
      >
        <span
          className={cn(
            !value && "new-resource-placeholder",
          )}
        >
          {value || "Preferred contact method."}
        </span>

        <ChevronDown
          size={18}
          className={open ? "rotate-180" : ""}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close contact method menu"
            onClick={() => setOpen(false)}
          />

          <div
            role="listbox"
            className="new-resource-dropdown-menu"
          >
            <div className="new-resource-dropdown-options">
              {communicationOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "new-resource-dropdown-option",
                    option === value &&
                      "new-resource-dropdown-option-selected",
                  )}
                >
                  <span>{option}</span>
                  {option === value ? (
                    <Check size={16} />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
