"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Code2,
  HelpCircle,
  Layers3,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import StickyToast from "@/components/ui/StickyToast";
import { findProjectModule, normalizeProjectModules } from "@/lib/projectModules";
import { cn } from "@/lib/utils";

export type SectionId =
  | "basic"
  | "contact"
  | "skills"
  | "reporting"
  | "projects"
  | "modules";

type Option = {
  value: string;
  label: string;
  detail?: string;
  icon?: ReactNode;
};

type ProjectOptionRecord = {
  id: string;
  name: string;
  client?: string;
  formData?: unknown;
  moduleName?: string;
  subModule?: string;
};

export type ResourceLifecycle = "DRAFT" | "OPEN";

export type ResourceFormValues = {
  firstName: string;
  lastName: string;
  jobTitle: string;

  email: string;
  phone: string;
  communicationChannel: string;

  skills: string[];
  experienceLevel: string;
  employmentType: string;

  department: string;
  team: string;
  reportingTo: string;

  projectId: string;
  projectRole: string;

  module: string;
  subModule: string;
  responsibilityType: string;
};

export type ResourceDraft = {
  id: string;
  lifecycle: ResourceLifecycle;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  formData?: Partial<ResourceFormValues>;
};

const initialValues: ResourceFormValues = {
  firstName: "",
  lastName: "",
  jobTitle: "",

  email: "",
  phone: "",
  communicationChannel: "",

  skills: [],
  experienceLevel: "",
  employmentType: "",

  department: "",
  team: "",
  reportingTo: "",

  projectId: "",
  projectRole: "",

  module: "",
  subModule: "",
  responsibilityType: "",
};

const sections: Array<{
  id: SectionId;
  title: string;
  description?: string;
  icon: typeof UserRound;
}> = [
  {
    id: "basic",
    title: "Basic Resource Information",
    description: "Enter name, role, and photo.",
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
  {
    id: "reporting",
    title: "Reporting & Team",
    icon: UsersRound,
  },
  {
    id: "projects",
    title: "Project Assignment",
    icon: BriefcaseBusiness,
  },
  {
    id: "modules",
    title: "Modules & Sub Modules Assignment",
    icon: Layers3,
  },
];

const jobTitles = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Senior Software Engineer",
  "Lead Software Engineer",
  "Principal Software Engineer",

  "React Developer",
  "Next.js Developer",
  "Node.js Developer",
  "PHP Developer",
  "Laravel Developer",
  "Python Developer",
  "Django Developer",
  "Java Developer",
  "Spring Boot Developer",
  ".NET Developer",
  "C# Developer",

  "Mobile App Developer",
  "iOS Developer",
  "Android Developer",
  "Flutter Developer",
  "React Native Developer",

  "DevOps Engineer",
  "Cloud Engineer",
  "AWS Engineer",
  "Azure Engineer",
  "Site Reliability Engineer",
  "Systems Engineer",

  "Database Administrator",
  "Database Engineer",
  "Data Engineer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",

  "QA Engineer",
  "QA Automation Engineer",
  "Manual QA Engineer",
  "Software Tester",

  "UI Designer",
  "UX Designer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Brand Designer",

  "Project Manager",
  "Project Coordinator",
  "Product Manager",
  "Product Owner",
  "Business Analyst",
  "Scrum Master",

  "Technical Lead",
  "Team Lead",
  "Engineering Manager",
  "Solutions Architect",
  "Software Architect",

  "Support Engineer",
  "Technical Support Specialist",
  "Customer Success Manager",

  "Resource Manager",
  "Operations Manager",
] as const;

const skills = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "NestJS",
  "PHP",
  "Laravel",
  "Python",
  "Django",
  "Java",
  "Spring Boot",
  ".NET",
  "C#",

  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",

  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
  "CI/CD",

  "Figma",
  "UI Design",
  "UX Research",

  "Manual Testing",
  "Automation Testing",
  "Selenium",
  "Cypress",
];

const experienceLevels = [
  "Intern",
  "Junior",
  "Mid Level",
  "Senior",
  "Lead",
  "Principal",
];

const employmentTypes = [
  "Full Time",
  "Part Time",
  "Contract",
  "Freelance",
  "Internship",
];

const departments = [
  "Development",
  "Design",
  "Quality Assurance",
  "Product",
  "Project Management",
  "Support",
  "Operations",
  "Data & AI",
];

const teams = [
  "Backend Team",
  "Frontend Team",
  "Full Stack Team",
  "Mobile Team",
  "QA Team",
  "Design Team",
  "DevOps Team",
  "Data Team",
  "Support Team",
  "Project Management Team",
];

const projectRoles = [
  "Manager/Coordinator",
  "Technical Lead",
  "Team Lead",
  "Developer",
  "Senior Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "QA Engineer",
  "UI/UX Designer",
  "Product Designer",
  "DevOps Engineer",
  "Business Analyst",
  "Support Engineer",
];

const communicationChannels: Option[] = [
  {
    value: "Slack",
    label: "Slack",
    icon: (
      <span className="grid size-5 place-items-center rounded bg-[#4A154B] text-[10px] font-bold text-white">
        S
      </span>
    ),
  },
  {
    value: "Viber",
    label: "Viber",
    icon: <MessageCircle size={20} className="text-[#7360F2]" />,
  },
  {
    value: "WhatsApp",
    label: "WhatsApp",
    icon: <MessageCircle size={20} className="text-[#22C55E]" />,
  },
  {
    value: "Email",
    label: "Email",
    icon: <Mail size={20} className="text-[#475467]" />,
  },
];

function valuesFromResource(resource?: ResourceDraft): ResourceFormValues {
  if (!resource) {
    return initialValues;
  }

  const data = resource.formData ?? {};

  const [firstName = "", ...rest] = resource.name.trim().split(/\s+/);

  return {
    ...initialValues,
    ...data,

    firstName: typeof data.firstName === "string" ? data.firstName : firstName,

    lastName:
      typeof data.lastName === "string" ? data.lastName : rest.join(" "),

    email: typeof data.email === "string" ? data.email : (resource.email ?? ""),
  };
}

function createResourceId() {
  return `RES-${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`;
}

export default function NewResourceForm({
  initialResource,
  initialSection = "basic",
  roleOptions = [],
  resourceBaseHref = "/resources",
  projectBaseHref = "/projects",
  rolesNewHref = "/admin/roles/new",
}: {
  initialResource?: ResourceDraft;
  initialSection?: SectionId;
  roleOptions?: string[];
  resourceBaseHref?: string;
  projectBaseHref?: string;
  rolesNewHref?: string;
}) {
  const router = useRouter();

  const [values, setValues] = useState<ResourceFormValues>(() =>
    valuesFromResource(initialResource),
  );

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  useEffect(() => {
    if (initialSection === "basic") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`resource-${initialSection}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialSection]);
  /*
   * PROFILE PHOTO
   *
   * Kept exactly as before:
   * File + FileReader preview.
   */
  const [photo, setPhoto] = useState<File | null>(null);

  const [photoPreview, setPhotoPreview] = useState(
    initialResource?.avatar ?? "",
  );

  const [saving, setSaving] = useState(false);

  const [, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");

  const [rawProjects, setRawProjects] = useState<ProjectOptionRecord[]>([]);

  const [users, setUsers] = useState<Option[]>([]);

  const [resourceId] = useState(
    () => initialResource?.id ?? createResourceId(),
  );

  const jobTitleOptions = useMemo(() => {
    const source = roleOptions.length ? roleOptions : Array.from(jobTitles);
    const unique = Array.from(new Set(source.filter(Boolean)));

    if (values.jobTitle && !unique.includes(values.jobTitle)) {
      unique.unshift(values.jobTitle);
    }

    return unique;
  }, [roleOptions, values.jobTitle]);

  const showNotice = (
    message: string,
    kind: "success" | "error" = "success",
  ) => {
    setNoticeKind(kind);
    setNotice(message);
  };

  /*
   * Load Projects + Users
   * for custom dropdowns.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadDropdownData() {
      try {
        const [projectResponse, usersResponse] = await Promise.all([
          fetch("/api/projects", {
            cache: "no-store",
          }),

          fetch("/api/users", {
            cache: "no-store",
          }),
        ]);

        if (projectResponse.ok) {
          const data = await projectResponse.json();

          if (!cancelled && Array.isArray(data)) {
            setRawProjects(
              data.map((project) => ({
                id: String(project.id ?? ""),
                name: typeof project.name === "string" ? project.name : "",
                client: typeof project.client === "string" ? project.client : undefined,
                formData: project.formData,
                moduleName: typeof project.moduleName === "string" ? project.moduleName : undefined,
                subModule: typeof project.subModule === "string" ? project.subModule : undefined,
              })),
            );
          }
        }

        if (usersResponse.ok) {
          const data = await usersResponse.json();

          if (!cancelled && Array.isArray(data)) {
            setUsers(
              data.map((user: { id: string; name: string; role?: string }) => ({
                value: String(user.id),

                label: user.name,

                detail: user.role,
              })),
            );
          }
        }
      } catch {
        /*
         * Static dropdowns remain usable
         * if these optional requests fail.
         */
      }
    }

    void loadDropdownData();

    return () => {
      cancelled = true;
    };
  }, []);

  const projectOptions = useMemo<Option[]>(
    () =>
      rawProjects.map((project) => ({
        value: project.id,
        label: project.name,
        detail: project.client,
      })),
    [rawProjects],
  );
  const selectedProject = useMemo(
    () => rawProjects.find((project) => project.id === values.projectId),
    [rawProjects, values.projectId],
  );
  const availableModules = useMemo(
    () => normalizeProjectModules(selectedProject as never),
    [selectedProject],
  );
  const availableSubModules = useMemo(() => {
    const matchedModule = findProjectModule(availableModules, values.module);
    return matchedModule?.subModules ?? [];
  }, [availableModules, values.module]);
  const resourceReturnTo = initialResource
    ? `${resourceBaseHref}/${initialResource.id}/edit`
    : `${resourceBaseHref}/new`;
  const setField = <K extends keyof ResourceFormValues>(
    field: K,
    value: ResourceFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const navigateTo = (id: SectionId) => {
    setActiveSection(id);

    document.getElementById(`resource-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /*
   * RESET
   *
   * New resource:
   * restores blank form.
   *
   * Edit/draft:
   * restores original resource.
   */
  const resetForm = () => {
    setValues(
      initialResource ? valuesFromResource(initialResource) : initialValues,
    );

    setPhoto(null);

    setPhotoPreview(initialResource?.avatar ?? "");

    setError("");
    setNotice("");

    setActiveSection("basic");

    document.getElementById("resource-basic")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /*
   * PROFILE PHOTO
   *
   * Original uploader kept.
   */
  const handlePhoto = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      showNotice("Please select an image file.", "error");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5 MB.");
      showNotice("Profile image must be smaller than 5 MB.", "error");

      return;
    }

    setError("");
    setNotice("");

    setPhoto(file);

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(typeof reader.result === "string" ? reader.result : "");
    };

    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!values.firstName.trim()) {
      return "First name is required.";
    }

    if (!values.lastName.trim()) {
      return "Last name is required.";
    }

    if (!values.jobTitle) {
      return "Job title is required.";
    }

    if (!values.email.trim()) {
      return "Email address is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return "Enter a valid email address.";
    }

    return "";
  };

  const saveResource = async (lifecycle: ResourceLifecycle) => {
    /*
     * Drafts may be incomplete.
     * Registered resources may not.
     */
    const targetLifecycle =
      lifecycle === "OPEN" ? "OPEN" : (initialResource?.lifecycle ?? "DRAFT");

    if (targetLifecycle === "OPEN") {
      const validationError = validate();

      if (validationError) {
        setError(validationError);
        showNotice(validationError, "error");
        return;
      }
    }

    setSaving(true);

    setError("");
    setNotice("");

    try {
      const fullName =
        `${values.firstName.trim()} ${values.lastName.trim()}`.trim();

      const response = await fetch("/api/resources", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: initialResource?.id,

          lifecycle: targetLifecycle,

          name:
            fullName ||
            `Untitled Resource ${new Date().toISOString().slice(0, 10)}`,

          email: values.email.trim(),

          role: values.jobTitle.trim(),

          /*
           * Profile photo remains the
           * FileReader preview/data URL.
           */
          avatar: photoPreview || null,

          formData: {
            ...values,

            profilePhotoName: photo?.name ?? null,
          },
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to save resource.",
        );
      }

      if (initialResource) {
        showNotice(
          targetLifecycle === "OPEN"
            ? "Resource changes saved successfully."
            : "Resource draft saved successfully.",
        );
        router.refresh();
        return;
      }

      if (targetLifecycle === "DRAFT") {
        router.push(`${resourceBaseHref}/drafts`);

        router.refresh();

        return;
      }

      router.push(`${resourceBaseHref}/${body.id ?? resourceId}`);

      router.refresh();
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to save resource.";
      setError(message);
      showNotice(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="new-resource-page">
      {/* ============================================
          STICKY HEADER
         ============================================ */}
      <header className="sticky top-0 z-30 -mx-3 mb-7 border-b border-[#EAECF0] bg-white/95 px-3 py-4 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1
            className="text-[30px] font-bold leading-[38px] text-[#101828]"
            style={{
              fontFamily: "var(--font-satoshi), Arial, sans-serif",
            }}
          >
            {initialResource ? "Edit Resource" : "New Resource"}
          </h1>

          <div className="new-resource-actions">
            {/* Drafts */}
            <Link
              href={`${resourceBaseHref}/drafts`}
              className="new-resource-button-secondary"
            >
              Drafts
            </Link>

            {/* Reset */}
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="new-resource-button-secondary"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            {/* Draft Save */}
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveResource("DRAFT")}
              className="new-resource-button-secondary"
            >
              <Save size={16} />

              {saving ? "Saving..." : "Save Info"}
            </button>

            {/* Register */}
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveResource("OPEN")}
              className="new-resource-button-primary"
            >
              <Send size={18} />

              {saving
                ? "Saving..."
                : initialResource?.lifecycle === "OPEN"
                  ? "Save Resource"
                  : "Save and Register"}
            </button>
          </div>
        </div>

      </header>

      <div className="new-resource-layout">
        {/* ============================================
            SIDEBAR
           ============================================ */}
        <aside className="new-resource-sidebar">
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

                  {section.description && <small>{section.description}</small>}
                </span>

                {index < sections.length - 1 && (
                  <span className="new-resource-step-line" />
                )}
              </button>
            );
          })}
        </aside>

        {/* ============================================
            FORM
           ============================================ */}
        <main className="new-resource-form">
          {/* BASIC INFORMATION */}
          <ResourceSection
            id="basic"
            title="Basic Resource Information"
            icon={UserRound}
            active={activeSection === "basic"}
            onActive={() => setActiveSection("basic")}
          >
            <div className="new-resource-grid">
              <TextField
                label="First Name"
                placeholder="Enter first name."
                value={values.firstName}
                onChange={(value) => setField("firstName", value)}
              />

              <TextField
                label="Last Name"
                placeholder="Enter last name."
                value={values.lastName}
                onChange={(value) => setField("lastName", value)}
              />

              <SearchDropdown
                label="Job Title"
                value={values.jobTitle}
                onChange={(value) => setField("jobTitle", value)}
                placeholder="Select job title."
                searchPlaceholder="Search job titles..."
                options={jobTitleOptions.map((title) => ({
                  value: title,

                  label: title,
                }))}
                actionLabel="New Role"
                onAction={() => router.push(rolesNewHref)}
              />
            </div>

            {/* ========================================
                PROFILE PHOTO

                KEEP ORIGINAL UPLOAD BEHAVIOR
               ======================================== */}
            <div className="mt-5 max-w-[504px]">
              <span className="new-resource-label">Profile Image</span>

              {photoPreview && (
                <div className="new-resource-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Resource profile preview" />

                  <button
                    type="button"
                    aria-label="Remove profile image"
                    onClick={() => {
                      setPhoto(null);

                      setPhotoPreview("");
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}

              <label
                className="new-resource-upload"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  handlePhoto(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="new-resource-upload-icon">
                  <UploadCloud size={20} />
                </span>

                <span>
                  <strong>Click to upload</strong> or drag and drop
                </span>

                <small>SVG, PNG, JPG or GIF (max. 5 MB)</small>

                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    handlePhoto(event.target.files?.[0]);

                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </ResourceSection>

          {/* CONTACT INFORMATION */}
          <ResourceSection
            id="contact"
            title="Contact Information"
            icon={Phone}
            help
            active={activeSection === "contact"}
            onActive={() => setActiveSection("contact")}
          >
            <div className="new-resource-grid">
              <TextField
                label="Email Address"
                type="email"
                placeholder="Work email."
                value={values.email}
                onChange={(value) => setField("email", value)}
              />

              <TextField
                label="Phone Number"
                type="tel"
                placeholder="Enter phone number."
                value={values.phone}
                onChange={(value) => setField("phone", value)}
              />

              <SearchDropdown
                label="Preferred Contact Method"
                value={values.communicationChannel}
                onChange={(value) => setField("communicationChannel", value)}
                placeholder="Preferred contact method."
                searchPlaceholder="Search preferred contact method"
                options={communicationChannels}
              />
            </div>
          </ResourceSection>

          {/* SKILLS */}
          <ResourceSection
            id="skills"
            title="Skills & Role Details"
            icon={Code2}
            active={activeSection === "skills"}
            onActive={() => setActiveSection("skills")}
          >
            <div className="new-resource-grid">
              <MultiSelectDropdown
                label="Skills"
                values={values.skills}
                onChange={(next) => setField("skills", next)}
                placeholder="Select skills."
                options={skills}
              />

              <SearchDropdown
                label="Experience Level"
                value={values.experienceLevel}
                onChange={(value) => setField("experienceLevel", value)}
                placeholder="Resource seniority."
                searchPlaceholder="Search experience level"
                options={experienceLevels.map((item) => ({
                  value: item,

                  label: item,
                }))}
              />

              <SearchDropdown
                label="Employment Type"
                value={values.employmentType}
                onChange={(value) => setField("employmentType", value)}
                placeholder="Full-time or contract."
                searchPlaceholder="Search employment type"
                options={employmentTypes.map((item) => ({
                  value: item,

                  label: item,
                }))}
              />
            </div>
          </ResourceSection>

          {/* REPORTING */}
          <ResourceSection
            id="reporting"
            title="Reporting & Team"
            icon={UsersRound}
            active={activeSection === "reporting"}
            onActive={() => setActiveSection("reporting")}
          >
            <div className="new-resource-grid">
              <SearchDropdown
                label="Department"
                value={values.department}
                onChange={(value) => setField("department", value)}
                placeholder="Select department."
                searchPlaceholder="Search department"
                options={departments.map((item) => ({
                  value: item,

                  label: item,
                }))}
              />

              <SearchDropdown
                label="Team"
                value={values.team}
                onChange={(value) => setField("team", value)}
                placeholder="Select team."
                searchPlaceholder="Search team"
                options={teams.map((item) => ({
                  value: item,

                  label: item,
                }))}
              />

              <SearchDropdown
                label="Reporting To"
                value={values.reportingTo}
                onChange={(value) => setField("reportingTo", value)}
                placeholder="Select reporting manager."
                searchPlaceholder="Search resources..."
                options={users}
              />
            </div>
          </ResourceSection>

          {/* PROJECT ASSIGNMENT */}
          <ResourceSection
            id="projects"
            title="Project Assignment"
            icon={BriefcaseBusiness}
            active={activeSection === "projects"}
            onActive={() => setActiveSection("projects")}
          >
            <div className="new-resource-grid">
              <SearchDropdown
                label="Assigned Projects"
                value={values.projectId}
                onChange={(value) => {
                  setField("projectId", value);
                  setField("module", "");
                  setField("subModule", "");
                }}
                placeholder="Select related project."
                searchPlaceholder="Search Project"
                options={projectOptions}
                actionLabel="New Project"
                onAction={() =>
                  router.push(
                    projectBaseHref + "/new?returnTo=" + encodeURIComponent(resourceReturnTo),
                  )
                }
              />

              <SearchDropdown
                label="Project Role"
                value={values.projectRole}
                onChange={(value) => setField("projectRole", value)}
                placeholder="Role in selected project."
                searchPlaceholder="Search role in selected project..."
                options={projectRoles.map((role) => ({
                  value: role,

                  label: role,
                }))}
              />
            </div>
          </ResourceSection>

          {/* MODULE ASSIGNMENT */}
          <ResourceSection
            id="modules"
            title="Modules & Sub Modules Assignment"
            icon={Layers3}
            active={activeSection === "modules"}
            onActive={() => setActiveSection("modules")}
          >
            <div className="new-resource-grid">
              <SearchDropdown
                label="Module"
                value={values.module}
                onChange={(value) => {
                  setField("module", value);
                  setField("subModule", "");
                }}
                placeholder={
                  values.projectId ? "Select project module." : "Select a project first."
                }
                searchPlaceholder="Search module"
                options={availableModules.map((item) => ({
                  value: item.name,
                  label: item.name,
                }))}
                actionLabel={values.projectId ? "Edit Project" : "New Project"}
                onAction={() =>
                  router.push(
                    values.projectId
                      ? projectBaseHref + "/" + values.projectId + "/edit?section=modules-setup&returnTo=" + encodeURIComponent(resourceReturnTo)
                      : projectBaseHref + "/new?returnTo=" + encodeURIComponent(resourceReturnTo),
                  )
                }
              />

              <SearchDropdown
                label="Sub Module"
                value={values.subModule}
                onChange={(value) => setField("subModule", value)}
                placeholder={
                  values.module ? "Select sub-module." : "Select a module first."
                }
                searchPlaceholder="Search sub-module"
                options={availableSubModules.map((item) => ({
                  value: item.name,
                  label: item.name,
                }))}
                actionLabel={values.projectId ? "Edit Project" : "New Project"}
                onAction={() =>
                  router.push(
                    values.projectId
                      ? projectBaseHref + "/" + values.projectId + "/edit?section=modules-setup&returnTo=" + encodeURIComponent(resourceReturnTo)
                      : projectBaseHref + "/new?returnTo=" + encodeURIComponent(resourceReturnTo),
                  )
                }
              />

              <SearchDropdown
                label="Responsibility Type"
                value={values.responsibilityType}
                onChange={(value) => setField("responsibilityType", value)}
                placeholder="Select responsibility."
                searchPlaceholder="Search responsibility"
                options={[
                  "Module Owner",
                  "Primary Developer",
                  "Secondary Developer",
                  "Reviewer",
                  "QA Owner",
                  "Designer",
                  "Support",
                ].map((item) => ({
                  value: item,

                  label: item,
                }))}
              />
            </div>
          </ResourceSection>
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

/* =========================================================
   SECTION
   ========================================================= */

function ResourceSection({
  id,
  title,
  icon: Icon,
  help = false,
  active,
  onActive,
  children,
}: {
  id: SectionId;
  title: string;
  icon: typeof UserRound;
  help?: boolean;
  active: boolean;
  onActive: () => void;
  children: ReactNode;
}) {
  return (
    <section
      id={`resource-${id}`}
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

        {help && <HelpCircle size={22} />}
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   TEXT FIELD
   ========================================================= */

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
      <span className="new-resource-label">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="new-resource-input"
      />
    </label>
  );
}

/* =========================================================
   SEARCH DROPDOWN
   ========================================================= */

function SearchDropdown({
  label,
  value,
  placeholder,
  searchPlaceholder = "Search...",
  options,
  onChange,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  placeholder: string;
  searchPlaceholder?: string;
  options: Option[];
  onChange: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.detail ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [options, search]);

  return (
    <div className="new-resource-field relative">
      <span className="new-resource-label">{label}</span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "new-resource-dropdown-trigger",

          !selected && "new-resource-placeholder",

          open && "new-resource-dropdown-trigger-open",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon}

          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>

        <ChevronDown
          size={20}
          className={cn(
            "shrink-0 transition-transform",

            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={`Close ${label} dropdown`}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);

              setSearch("");
            }}
          />

          <div className="new-resource-dropdown-menu">
            <div className="new-resource-dropdown-tools">
              <label className="new-resource-dropdown-search">
                <Search size={16} />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                />
              </label>

              {actionLabel && onAction && (
                <button
                  type="button"
                  className="new-resource-dropdown-action"
                  onClick={() => {
                    setOpen(false);

                    onAction();
                  }}
                >
                  <Plus size={14} />

                  {actionLabel}
                </button>
              )}
            </div>

            <div className="new-resource-dropdown-options">
              {filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);

                    setOpen(false);

                    setSearch("");
                  }}
                  className={cn(
                    "new-resource-dropdown-option",

                    option.value === value &&
                      "new-resource-dropdown-option-selected",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {option.icon}

                    <span className="min-w-0">
                      <strong className="block truncate font-normal">
                        {option.label}
                      </strong>

                      {option.detail && (
                        <small className="block truncate text-[#98A2B3]">
                          {option.detail}
                        </small>
                      )}
                    </span>
                  </span>

                  {option.value === value && (
                    <Check size={17} className="shrink-0 text-[#0284C7]" />
                  )}
                </button>
              ))}

              {!filtered.length && (
                <p className="p-5 text-center text-sm text-[#98A2B3]">
                  No matching options.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   MULTI SELECT
   ========================================================= */

function MultiSelectDropdown({
  label,
  values,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="new-resource-field relative">
      <span className="new-resource-label">{label}</span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "new-resource-dropdown-trigger min-h-11 h-auto",

          !values.length && "new-resource-placeholder",
        )}
      >
        <span className="flex min-w-0 flex-wrap gap-1.5">
          {values.length
            ? values.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[#B2DDFF] bg-[#EFF8FF] px-2 py-0.5 text-xs font-medium text-[#175CD3]"
                >
                  {skill}
                </span>
              ))
            : placeholder}
        </span>

        <ChevronDown
          size={20}
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
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close skills dropdown"
            onClick={() => {
              setOpen(false);

              setSearch("");
            }}
          />

          <div className="new-resource-dropdown-menu">
            <div className="p-2">
              <label className="new-resource-dropdown-search">
                <Search size={16} />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search skills..."
                />
              </label>
            </div>

            <div className="new-resource-dropdown-options">
              {filtered.map((option) => {
                const selected = values.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="new-resource-dropdown-option"
                    onClick={() =>
                      onChange(
                        selected
                          ? values.filter((item) => item !== option)
                          : [...values, option],
                      )
                    }
                  >
                    <span>{option}</span>

                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded border",

                        selected
                          ? "border-[#0284C7] bg-[#0284C7] text-white"
                          : "border-[#D0D5DD] bg-white",
                      )}
                    >
                      {selected && <Check size={14} />}
                    </span>
                  </button>
                );
              })}

              {!filtered.length && (
                <p className="p-5 text-center text-sm text-[#98A2B3]">
                  No matching skills.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}