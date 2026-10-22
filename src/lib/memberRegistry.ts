import memberRegistry from "../../data-source/fan-growth/member-registry.json";

export type MemberRegistryEntry = {
  memberId: string;
  name: string;
};

export type MemberRegistry = {
  south: MemberRegistryEntry[];
  north: MemberRegistryEntry[];
};

const STORAGE_KEY = "spb:fan-growth-member-registry";
const staticRegistry = memberRegistry as MemberRegistry;

function isRegistry(value: unknown): value is MemberRegistry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MemberRegistry>;
  return [candidate.south, candidate.north].every(
    (group) =>
      Array.isArray(group) &&
      group.every(
        (member) =>
          typeof member?.memberId === "string" && typeof member?.name === "string",
      ),
  );
}

export function getMemberRegistry(): MemberRegistry {
  if (typeof window === "undefined") return staticRegistry;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (isRegistry(parsed)) return parsed;
    }
  } catch (error) {
    console.error(error);
  }

  return staticRegistry;
}

export function saveMemberRegistry(registry: MemberRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}
