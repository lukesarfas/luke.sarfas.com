import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  preview?: string;
  accent?: string;
  applet?: boolean | string;
  tags?: string[];
}

export interface RegistryEntry {
  slug: string;
  /** External URL to fetch manifest.json from. */
  manifestUrl?: string;
  /** Path to a sibling app in this monorepo (e.g. "lickme"). Reads apps/<path>/public/manifest.json from disk. */
  manifestPath?: string;
  /** Inline fallback / override; takes lowest precedence. */
  manifest?: Partial<ProjectManifest>;
}

const TIMEOUT_MS = 5000;
const __dirname = dirname(fileURLToPath(import.meta.url));
// src/lib -> src -> apps/luke.sarfas.com -> apps -> monorepo root
const MONOREPO_ROOT = resolve(__dirname, "../../../..");

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readSiblingManifest(path: string): Promise<Partial<ProjectManifest> | null> {
  const abs = resolve(MONOREPO_ROOT, "apps", path, "public", "manifest.json");
  if (!existsSync(abs)) return null;
  const raw = await readFile(abs, "utf8");
  return JSON.parse(raw) as Partial<ProjectManifest>;
}

async function loadOne(entry: RegistryEntry): Promise<ProjectManifest | null> {
  const inline = entry.manifest ?? {};
  let remote: Partial<ProjectManifest> | null = null;

  if (entry.manifestPath) {
    try {
      remote = await readSiblingManifest(entry.manifestPath);
      if (!remote) console.warn(`[manifests] ${entry.slug}: no manifest at apps/${entry.manifestPath}/public/manifest.json`);
    } catch (err) {
      console.warn(`[manifests] ${entry.slug} read failed: ${(err as Error).message}`);
    }
  } else if (entry.manifestUrl) {
    try {
      const res = await fetchWithTimeout(entry.manifestUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      remote = (await res.json()) as Partial<ProjectManifest>;
    } catch (err) {
      console.warn(`[manifests] ${entry.slug} fetch failed: ${(err as Error).message}`);
    }
  }

  const merged = { ...inline, ...(remote ?? {}), slug: entry.slug } as ProjectManifest;
  if (!merged.name) return null;

  // Auto-wire preview + applet from sibling-app convention if not set.
  if (!merged.preview && entry.manifestPath) {
    merged.preview = `/previews/${entry.manifestPath}.png`;
  }
  if (merged.applet === undefined && entry.manifestPath) {
    merged.applet = `/sites/${entry.manifestPath}/`;
  }

  return merged;
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
