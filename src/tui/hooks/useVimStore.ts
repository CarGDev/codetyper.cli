/**
 * useVimStore React Hook
 *
 * React hook for accessing vim store state
 */

import { useStore } from "zustand";
import { vimStore } from "@stores/vim-store";
import type { VimStore } from "@stores/vim-store";

/**
 * React hook for vim store
 */
export const useVimStore = <T>(selector: (state: VimStore) => T): T => {
  return useStore(vimStore, selector);
};

export default useVimStore;
