import type { MemoryItem } from "@/types/reasoning";

export interface MemoryStore {
  items: MemoryItem[];
  maxItems: number;
}
