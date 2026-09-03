"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";

import { type ReactNode, useMemo, useState } from "react";

import StickyToast from "@/components/ui/StickyToast";
import { cn } from "@/lib/utils";

import type {
  EmailDriver,
  EmailEncryption,
  EmailSettings,
} from "@/lib/db";

type FormValues = {
  driver: EmailDriver;

  host: string;

  port: string;

  username: string;

  password: string;

  encryption: EmailEncryption;

  fromAddress: string;

  mailgunSecret: string;

  mailgunDomain: string;
};

const driverOptions: EmailDriver[] = [
  "SMTP",
  "Mailgun",
  "SendGrid",
  "Amazon SES",
];

const encryptionOptions: EmailEncryption[] = ["TLS", "SSL", "None"];

export default function EmailSettingsForm({
  initialSettings,
}: {
  initialSettings: EmailSettings;
}) {
  const initialValues = useMemo<FormValues>(
    () => ({
      driver: initialSettings.driver,

      host: initialSettings.host,

      port: initialSettings.port,

      username: initialSettings.username,

      /*
       * Secrets are not sent
       * from the server.
       *
       * Blank means "leave
       * existing value alone".
       */
      password: "",

      encryption: initialSettings.encryption,

      fromAddress: initialSettings.fromAddress,

      mailgunSecret: "",

      mailgunDomain: initialSettings.mailgunDomain,
    }),
    [initialSettings],
  );

  const [values, setValues] = useState<FormValues>(initialValues);

  const [savedValues, setSavedValues] = useState<FormValues>(initialValues);

  const [saving, setSaving] = useState(false);

  const [, setError] = useState("");

  const [, setSuccess] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");

  const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

  function showNotice(
    message: string,
    kind: "success" | "error" = "success",
  ) {
    setNoticeKind(kind);
    setNotice(message);
  }

  function setField<K extends keyof FormValues>(
    field: K,

    value: FormValues[K],
  ) {
    setValues((current) => ({
      ...current,

      [field]: value,
    }));

    setError("");

    setSuccess("");
    setNotice("");
  }

  function cancelChanges() {
    if (!dirty || saving) {
      return;
    }

    setValues(savedValues);

    setError("");

    setSuccess("");
    setNotice("");
  }

  function validate() {
    if (!values.driver) {
      return "Select an email driver.";
    }

    if (values.driver === "SMTP") {
      if (!values.host.trim()) {
        return "Enter the mail server host.";
      }

      const port = Number(values.port);

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return "Enter a valid port number.";
      }
    }

    if (
      values.fromAddress &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.fromAddress)
    ) {
      return "Enter a valid From Address.";
    }

    return "";
  }

  async function updateSettings() {
    if (!dirty || saving) {
      return;
    }

    const validation = validate();

    if (validation) {
      setError(validation);
      showNotice(validation, "error");

      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");
    setNotice("");

    try {
      const response = await fetch("/api/settings/email", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to update email settings.",
        );
      }

      /*
       * Password / Mailgun Secret
       * inputs clear after being saved.
       *
       * The server keeps the actual secret.
       */
      const nextSaved: FormValues = {
        ...values,

        password: "",

        mailgunSecret: "",
      };

      setValues(nextSaved);

      setSavedValues(nextSaved);

      setSuccess("Email account settings updated successfully.");
      showNotice("Email account settings updated successfully.");
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to update email settings.";
      setError(message);
      showNotice(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      {/* ==============================================
          PAGE TITLE + ACTIONS
         ============================================== */}

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-[30px] font-bold leading-[38px] text-[#101828]"
          style={{
            fontFamily: "var(--font-satoshi), Arial, sans-serif",
          }}
        >
          Email Account Settings
        </h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={cancelChanges}
            className={cn(
              "inline-flex h-10 min-w-[79px] items-center justify-center rounded-lg border px-[14px] text-sm font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition",

              dirty && !saving
                ? "border-[#06B6D4] bg-white text-[#0284C7] hover:bg-[#F0F9FF]"
                : "cursor-not-allowed border-[#EAECF0] bg-[#F9FAFB] text-[#98A2B3]",
            )}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void updateSettings()}
            className={cn(
              "inline-flex h-10 min-w-[81px] items-center justify-center gap-2 rounded-lg px-[14px] text-sm font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition",

              dirty && !saving
                ? "bg-gradient-to-r from-[#0284C7] via-[#06B6D4] to-[#22D3EE] text-white hover:brightness-95"
                : "cursor-not-allowed bg-[#E4E7EC] text-[#98A2B3]",
            )}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}

            {saving ? "Updating" : "Update"}
          </button>
        </div>
      </div>

      {/* ==============================================
          FORM
         ============================================== */}

      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {/* Row 1 */}

        <EmailField label="Email Driver">
          <EmailSelect
            value={values.driver}
            placeholder="Select email driver"
            options={driverOptions}
            onChange={(value) => setField("driver", value as EmailDriver)}
          />
        </EmailField>

        <EmailField label="Host">
          <input
            value={values.host}
            onChange={(event) => setField("host", event.target.value)}
            placeholder="Enter mail server host"
            className="email-settings-input"
          />
        </EmailField>

        {/* Row 2 */}

        <EmailField label="Port">
          <input
            inputMode="numeric"
            value={values.port}
            onChange={(event) =>
              setField("port", event.target.value.replace(/\D/g, ""))
            }
            placeholder="Enter port number"
            className="email-settings-input"
          />
        </EmailField>

        <EmailField label="User Name">
          <input
            value={values.username}
            onChange={(event) => setField("username", event.target.value)}
            placeholder="Enter email username"
            autoComplete="username"
            className="email-settings-input"
          />
        </EmailField>

        {/* Row 3 */}

        <EmailField label="Password">
          <input
            type="password"
            value={values.password}
            onChange={(event) => setField("password", event.target.value)}
            placeholder={
              initialSettings.hasPassword
                ? "Password configured — enter to replace"
                : "Enter email password"
            }
            autoComplete="new-password"
            className="email-settings-input"
          />
        </EmailField>

        <EmailField label="Encryption">
          <EmailSelect
            value={values.encryption}
            placeholder="Select encryption type"
            options={encryptionOptions}
            onChange={(value) =>
              setField("encryption", value as EmailEncryption)
            }
          />
        </EmailField>

        {/* Row 4 */}

        <EmailField label="From Address">
          <input
            type="email"
            value={values.fromAddress}
            onChange={(event) => setField("fromAddress", event.target.value)}
            placeholder="Enter sender email address"
            className="email-settings-input"
          />
        </EmailField>

        <EmailField label="Mailgun Secret">
          <input
            type="password"
            value={values.mailgunSecret}
            onChange={(event) => setField("mailgunSecret", event.target.value)}
            placeholder={
              initialSettings.hasMailgunSecret
                ? "Secret configured — enter to replace"
                : "Enter Mailgun secret key"
            }
            autoComplete="new-password"
            className="email-settings-input"
          />
        </EmailField>

        {/* Row 5 */}

        <EmailField label="Mailgun Domain">
          <input
            value={values.mailgunDomain}
            onChange={(event) => setField("mailgunDomain", event.target.value)}
            placeholder="Enter Mailgun domain"
            className="email-settings-input"
          />
        </EmailField>
      </div>

      {notice && (
        <StickyToast
          message={notice}
          kind={noticeKind}
          onDismiss={() => {
            setNotice("");
            setError("");
            setSuccess("");
          }}
        />
      )}
    </div>
  );
}

function EmailField({
  label,
  children,
}: {
  label: string;

  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-[6px] block text-[14px] font-medium leading-5 text-[#344054]">
        {label}
      </span>

      {children}
    </label>
  );
}

function EmailSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;

  placeholder: string;

  options: readonly string[];

  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-[14px] text-left text-[16px] leading-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",

          open
            ? "border-[#0284C7] ring-[3px] ring-[#0284C7]/10"
            : "border-[#D0D5DD]",
        )}
      >
        <span
          className={cn(
            "truncate",

            value ? "text-[#344054]" : "text-[#98A2B3]",
          )}
        >
          {value || placeholder}
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[#98A2B3] transition-transform",

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
            onClick={() => setOpen(false)}
          />

          <span className="absolute left-0 top-[48px] z-50 block w-full overflow-hidden rounded-lg border border-[#D0D5DD] bg-white px-4 shadow-[0_6px_20px_rgba(16,24,40,0.14)]">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);

                  setOpen(false);
                }}
                className="flex min-h-[48px] w-full items-center justify-between border-b border-[#EAECF0] text-left text-[15px] text-[#667085] last:border-b-0 hover:text-[#101828]"
              >
                <span>{option}</span>

                {value === option && (
                  <Check size={16} className="text-[#0284C7]" />
                )}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
