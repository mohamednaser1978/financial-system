import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely serialize Prisma objects (with relations) for JSON responses.
 *  Converts BigInt and Date objects, and strips internal Prisma metadata.
 *  Also converts booleans to 1/0 to avoid standalone build segfaults. */
function serializeDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'boolean') return obj ? 1 : 0
  if (typeof obj === 'number' || typeof obj === 'string') return obj
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeDeep)
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      // Skip internal Prisma lazy loaders and metadata
      if (key.startsWith('$') || key.startsWith('_')) continue
      out[key] = serializeDeep((obj as Record<string, unknown>)[key])
    }
    return out
  }
  return obj
}

export function safeJson(data: unknown): unknown {
  return serializeDeep(data)
}
