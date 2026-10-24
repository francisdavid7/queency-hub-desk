import { db } from "@/db/db";
import type { MetaKey, MetaValues } from "@/types/meta";

export async function getMeta<K extends MetaKey>(
  key: K,
): Promise<MetaValues[K] | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as MetaValues[K] | undefined;
}

export async function setMeta<K extends MetaKey>(key: K, value: MetaValues[K]) {
  await db.meta.put({ key, value });
}

export async function deleteMeta(key: MetaKey) {
  await db.meta.delete(key);
}
