import registry from "~/data/projects.json";

export type ProjectStatus = "active" | "wip" | "archived";

export interface ProjectManifest {
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  status?: ProjectStatus;
  version?: string;
  updated?: string;
  links?: {
    site?: string;
    repo?: string;
    demo?: string;
    docs?: string;
  };
  screenshot?: string;
  tags?: string[];
}

interface RegistryEntry {
  slug: string;
  manifestUrl?: string;
  manifest?: Partial<ProjectManifest>;
}

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadOne(entry: RegistryEntry): Promise<ProjectManifest | null> {
  const inline = entry.manifest ?? {};

  if (entry.manifestUrl) {
    try {
      const res = await fetchWithTimeout(entry.manifestUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote = (await res.json()) as Partial<ProjectManifest>;
      return { ...inline, ...remote, slug: entry.slug } as ProjectManifest;
    } catch (err) {
      console.warn(`[manifests] ${entry.slug} fetch failed: ${(err as Error).message}`);
    }
  }

  if (!inline.name) return null;
  return { ...inline, slug: entry.slug } as ProjectManifest;
}

export async function loadAll(): Promise<ProjectManifest[]> {
  const entries = registry as RegistryEntry[];
  const results = await Promise.all(entries.map(loadOne));
  return results.filter((m): m is ProjectManifest => m !== null);
}

export async function loadBySlug(slug: string): Promise<ProjectManifest | null> {
  const entries = registry as RegistryEntry[];
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return null;
  return loadOne(entry);
}
