import type { Project, ProjectFormData, ProjectModuleDefinition } from "@/types";

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function normalizeProjectModules(
  source: Pick<Project, "formData"> | ProjectFormData | undefined,
): ProjectModuleDefinition[] {
  const formData = (
    source && "formData" in source ? source.formData : source
  ) as Partial<ProjectFormData> | undefined;
  const rawModules = Array.isArray(formData?.modules) ? formData.modules : [];

  const normalized = rawModules
    .map((module, moduleIndex) => {
      if (!module || typeof module !== "object") {
        return null;
      }

      const record = module as unknown as Record<string, unknown>;
      const moduleName = toText(record.name);

      if (!moduleName) {
        return null;
      }

      const subModules = Array.isArray(record.subModules)
        ? record.subModules
            .map((subModule, subModuleIndex) => {
              if (!subModule || typeof subModule !== "object") {
                return null;
              }

              const subRecord = subModule as unknown as Record<string, unknown>;
              const subModuleName = toText(subRecord.name);

              if (!subModuleName) {
                return null;
              }

              return {
                id:
                  toText(subRecord.id) ||
                  `${slug(moduleName)}-${slug(subModuleName)}-${subModuleIndex}`,
                name: subModuleName,
              };
            })
            .filter(
              (subModule): subModule is ProjectModuleDefinition["subModules"][number] =>
                Boolean(subModule),
            )
        : [];

      return {
        id: toText(record.id) || `${slug(moduleName)}-${moduleIndex}`,
        name: moduleName,
        subModules,
      };
    })
    .filter((module): module is ProjectModuleDefinition => Boolean(module));

  if (normalized.length > 0) {
    return normalized;
  }

  const legacyModuleName = toText(formData?.moduleName);
  const legacySubModule = toText(formData?.subModule);

  if (!legacyModuleName) {
    return [];
  }

  return [
    {
      id: `${slug(legacyModuleName)}-legacy`,
      name: legacyModuleName,
      subModules: legacySubModule
        ? [
            {
              id: `${slug(legacyModuleName)}-${slug(legacySubModule)}-legacy`,
              name: legacySubModule,
            },
          ]
        : [],
    },
  ];
}

export function findProjectModule(
  modules: ProjectModuleDefinition[],
  moduleName: string,
) {
  const normalized = moduleName.trim().toLowerCase();
  return modules.find((module) => module.name.trim().toLowerCase() === normalized);
}
