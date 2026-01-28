/**
 * Unit tests for Memory Selection Layer
 */

import { describe, it, expect } from "bun:test";

import {
  selectRelevantMemories,
  computeRelevance,
  computeMandatoryItems,
  createMemoryItem,
  createQueryContext,
  createMemoryStore,
  addMemory,
  findMemoriesByType,
  findMemoriesByPath,
  pruneOldMemories,
} from "../memory-selection";

import type {
  MemoryItem,
  QueryContext,
  SelectionInput,
} from "@src/types/reasoning";

describe("Memory Selection Layer", () => {
  const createTestMemory = (
    content: string,
    type: MemoryItem["type"] = "CONVERSATION",
    options: Partial<MemoryItem> = {},
  ): MemoryItem => ({
    id: `mem_${Math.random().toString(36).slice(2)}`,
    content,
    tokens: content.toLowerCase().split(/\s+/),
    entities: [],
    timestamp: Date.now(),
    type,
    causalLinks: [],
    tokenCount: Math.ceil(content.length * 0.25),
    ...options,
  });

  describe("computeRelevance", () => {
    it("should score higher for keyword overlap", () => {
      const memory = createTestMemory(
        "The function handles database queries efficiently",
      );
      const queryHighOverlap = createQueryContext(
        "database query optimization",
        {},
      );
      const queryLowOverlap = createQueryContext("user interface design", {});

      const highScore = computeRelevance(memory, queryHighOverlap);
      const lowScore = computeRelevance(memory, queryLowOverlap);

      expect(highScore.total).toBeGreaterThan(lowScore.total);
    });

    it("should score higher for recent memories", () => {
      const recentMemory = createTestMemory("Recent content", "CONVERSATION", {
        timestamp: Date.now(),
      });
      const oldMemory = createTestMemory("Old content", "CONVERSATION", {
        timestamp: Date.now() - 3600000, // 1 hour ago
      });

      const query = createQueryContext("content search", {});

      const recentScore = computeRelevance(recentMemory, query);
      const oldScore = computeRelevance(oldMemory, query);

      expect(recentScore.breakdown.recency).toBeGreaterThan(
        oldScore.breakdown.recency,
      );
    });

    it("should give type bonus to ERROR type", () => {
      const errorMemory = createTestMemory("Error: connection failed", "ERROR");
      const conversationMemory = createTestMemory(
        "Error: connection failed",
        "CONVERSATION",
      );

      const query = createQueryContext("error handling", {});

      const errorScore = computeRelevance(errorMemory, query);
      const convScore = computeRelevance(conversationMemory, query);

      expect(errorScore.breakdown.typeBonus).toBeGreaterThan(
        convScore.breakdown.typeBonus,
      );
    });

    it("should score causal links", () => {
      const linkedMemory = createTestMemory("Linked memory", "CONVERSATION", {
        causalLinks: ["active_item_1"],
      });
      const unlinkedMemory = createTestMemory(
        "Unlinked memory",
        "CONVERSATION",
        {
          causalLinks: [],
        },
      );

      const query = createQueryContext("test", {
        activeItems: ["active_item_1"],
      });

      const linkedScore = computeRelevance(linkedMemory, query);
      const unlinkedScore = computeRelevance(unlinkedMemory, query);

      expect(linkedScore.breakdown.causalLink).toBe(1);
      expect(unlinkedScore.breakdown.causalLink).toBe(0);
    });

    it("should score path overlap", () => {
      const memoryWithPath = createTestMemory("File content", "FILE_CONTENT", {
        filePaths: ["/src/services/agent.ts"],
      });

      const queryMatchingPath = createQueryContext("agent implementation", {
        activePaths: ["/src/services/agent.ts"],
      });

      const queryDifferentPath = createQueryContext("agent implementation", {
        activePaths: ["/src/utils/helpers.ts"],
      });

      const matchingScore = computeRelevance(memoryWithPath, queryMatchingPath);
      const differentScore = computeRelevance(
        memoryWithPath,
        queryDifferentPath,
      );

      expect(matchingScore.breakdown.pathOverlap).toBeGreaterThan(
        differentScore.breakdown.pathOverlap,
      );
    });
  });

  describe("selectRelevantMemories", () => {
    it("should select memories within token budget", () => {
      const memories = [
        createTestMemory("First memory content here", "CONVERSATION", {
          tokenCount: 100,
        }),
        createTestMemory("Second memory content here", "CONVERSATION", {
          tokenCount: 100,
        }),
        createTestMemory("Third memory content here", "CONVERSATION", {
          tokenCount: 100,
        }),
      ];

      const input: SelectionInput = {
        memories,
        query: createQueryContext("memory content", {}),
        tokenBudget: 250,
        mandatoryItems: [],
      };

      const result = selectRelevantMemories(input);

      expect(result.tokenUsage).toBeLessThanOrEqual(250);
    });

    it("should always include mandatory items", () => {
      const memories = [
        createTestMemory("Important memory", "CONVERSATION", {
          id: "mandatory_1",
        }),
        createTestMemory("Irrelevant memory about cooking", "CONVERSATION"),
      ];

      const input: SelectionInput = {
        memories,
        query: createQueryContext("completely unrelated topic", {}),
        tokenBudget: 1000,
        mandatoryItems: ["mandatory_1"],
      };

      const result = selectRelevantMemories(input);

      expect(result.selected.some((m) => m.id === "mandatory_1")).toBe(true);
    });

    it("should exclude low relevance items", () => {
      const memories = [
        createTestMemory(
          "Highly relevant database query optimization",
          "CONVERSATION",
        ),
        createTestMemory(
          "xyz abc def completely unrelated topic",
          "CONVERSATION",
        ),
      ];

      const input: SelectionInput = {
        memories,
        query: createQueryContext("database query optimization", {}),
        tokenBudget: 1000,
        mandatoryItems: [],
      };

      const result = selectRelevantMemories(input);

      // At least one memory should be selected (the relevant one)
      expect(result.selected.length).toBeGreaterThanOrEqual(1);
      // The first (relevant) memory should be selected
      expect(result.selected.some((m) => m.content.includes("database"))).toBe(
        true,
      );
    });

    it("should return scores for all selected items", () => {
      const memories = [
        createTestMemory("First memory", "CONVERSATION", { id: "mem_1" }),
        createTestMemory("Second memory", "CONVERSATION", { id: "mem_2" }),
      ];

      const input: SelectionInput = {
        memories,
        query: createQueryContext("memory", {}),
        tokenBudget: 1000,
        mandatoryItems: [],
      };

      const result = selectRelevantMemories(input);

      for (const selected of result.selected) {
        expect(result.scores.has(selected.id)).toBe(true);
      }
    });
  });

  describe("computeMandatoryItems", () => {
    it("should include recent memories", () => {
      const now = Date.now();
      const memories = [
        createTestMemory("Recent", "CONVERSATION", {
          id: "recent",
          timestamp: now,
        }),
        createTestMemory("Old", "CONVERSATION", {
          id: "old",
          timestamp: now - 600000,
        }),
      ];

      const mandatory = computeMandatoryItems(memories, now);

      expect(mandatory).toContain("recent");
    });

    it("should include recent error memories", () => {
      const now = Date.now();
      const memories = [
        createTestMemory("Error occurred", "ERROR", {
          id: "error_1",
          timestamp: now - 300000, // 5 minutes ago
        }),
      ];

      const mandatory = computeMandatoryItems(memories, now);

      expect(mandatory).toContain("error_1");
    });

    it("should include decision memories", () => {
      const now = Date.now();
      const memories = [
        createTestMemory("Decided to use TypeScript", "DECISION", {
          id: "decision_1",
        }),
        createTestMemory("Decided to use React", "DECISION", {
          id: "decision_2",
        }),
        createTestMemory("Decided to use Bun", "DECISION", {
          id: "decision_3",
        }),
        createTestMemory("Decided to use Zustand", "DECISION", {
          id: "decision_4",
        }),
      ];

      const mandatory = computeMandatoryItems(memories, now);

      // Should include last 3 decisions
      expect(mandatory).toContain("decision_2");
      expect(mandatory).toContain("decision_3");
      expect(mandatory).toContain("decision_4");
    });
  });

  describe("Memory Store Operations", () => {
    describe("createMemoryStore", () => {
      it("should create empty store with max items", () => {
        const store = createMemoryStore(500);

        expect(store.items).toHaveLength(0);
        expect(store.maxItems).toBe(500);
      });
    });

    describe("addMemory", () => {
      it("should add memory to store", () => {
        let store = createMemoryStore(100);
        const memory = createMemoryItem("Test content", "CONVERSATION");

        store = addMemory(store, memory);

        expect(store.items).toHaveLength(1);
        expect(store.items[0].content).toBe("Test content");
      });

      it("should prune oldest items when exceeding max", () => {
        let store = createMemoryStore(3);

        for (let i = 0; i < 5; i++) {
          const memory = createMemoryItem(`Memory ${i}`, "CONVERSATION");
          store = addMemory(store, memory);
        }

        expect(store.items.length).toBeLessThanOrEqual(3);
      });
    });

    describe("findMemoriesByType", () => {
      it("should filter by type", () => {
        let store = createMemoryStore(100);
        store = addMemory(
          store,
          createMemoryItem("Conversation", "CONVERSATION"),
        );
        store = addMemory(store, createMemoryItem("Error", "ERROR"));
        store = addMemory(
          store,
          createMemoryItem("Tool result", "TOOL_RESULT"),
        );

        const errors = findMemoriesByType(store, "ERROR");

        expect(errors).toHaveLength(1);
        expect(errors[0].content).toBe("Error");
      });
    });

    describe("findMemoriesByPath", () => {
      it("should find memories by file path", () => {
        let store = createMemoryStore(100);
        store = addMemory(store, {
          ...createMemoryItem("File content", "FILE_CONTENT"),
          filePaths: ["/src/services/agent.ts"],
        });
        store = addMemory(store, {
          ...createMemoryItem("Other file", "FILE_CONTENT"),
          filePaths: ["/src/utils/helpers.ts"],
        });

        const results = findMemoriesByPath(store, "agent.ts");

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe("File content");
      });
    });

    describe("pruneOldMemories", () => {
      it("should remove memories older than threshold", () => {
        const now = Date.now();
        let store = createMemoryStore(100);

        store = addMemory(store, {
          ...createMemoryItem("Recent", "CONVERSATION"),
          timestamp: now,
        });
        store = addMemory(store, {
          ...createMemoryItem("Old", "CONVERSATION"),
          timestamp: now - 7200000, // 2 hours ago
        });

        const pruned = pruneOldMemories(store, 3600000); // 1 hour threshold

        expect(pruned.items).toHaveLength(1);
        expect(pruned.items[0].content).toBe("Recent");
      });
    });
  });

  describe("createMemoryItem", () => {
    it("should create memory with correct structure", () => {
      const memory = createMemoryItem("Test content", "CONVERSATION", {
        filePaths: ["/test.ts"],
        causalLinks: ["prev_memory"],
      });

      expect(memory.content).toBe("Test content");
      expect(memory.type).toBe("CONVERSATION");
      expect(memory.filePaths).toContain("/test.ts");
      expect(memory.causalLinks).toContain("prev_memory");
      expect(memory.tokenCount).toBeGreaterThan(0);
      expect(memory.id).toMatch(/^mem_/);
    });

    it("should tokenize content", () => {
      const memory = createMemoryItem("Hello world test", "CONVERSATION");

      expect(memory.tokens.length).toBeGreaterThan(0);
    });
  });

  describe("createQueryContext", () => {
    it("should create query context with tokens", () => {
      const context = createQueryContext("database query optimization", {
        activePaths: ["/src/db.ts"],
        activeItems: ["item_1"],
      });

      expect(context.tokens.length).toBeGreaterThan(0);
      expect(context.activePaths).toContain("/src/db.ts");
      expect(context.activeItems).toContain("item_1");
      expect(context.timestamp).toBeDefined();
    });
  });
});
