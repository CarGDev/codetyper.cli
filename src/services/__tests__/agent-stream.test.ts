/**
 * Unit tests for Streaming Agent
 */

import { describe, it, expect } from "bun:test";

import {
  createInitialStreamingState,
  createStreamAccumulator,
} from "@/types/streaming";

import type {
  StreamingState,
  StreamAccumulator,
  PartialToolCall,
} from "@/types/streaming";

describe("Streaming Agent Types", () => {
  describe("createInitialStreamingState", () => {
    it("should create state with idle status", () => {
      const state = createInitialStreamingState();

      expect(state.status).toBe("idle");
      expect(state.content).toBe("");
      expect(state.pendingToolCalls).toHaveLength(0);
      expect(state.completedToolCalls).toHaveLength(0);
      expect(state.error).toBeNull();
      expect(state.modelSwitched).toBeNull();
    });
  });

  describe("createStreamAccumulator", () => {
    it("should create empty accumulator", () => {
      const accumulator = createStreamAccumulator();

      expect(accumulator.content).toBe("");
      expect(accumulator.toolCalls.size).toBe(0);
      expect(accumulator.modelSwitch).toBeNull();
    });

    it("should accumulate content", () => {
      const accumulator = createStreamAccumulator();

      accumulator.content += "Hello ";
      accumulator.content += "World";

      expect(accumulator.content).toBe("Hello World");
    });

    it("should store partial tool calls", () => {
      const accumulator = createStreamAccumulator();

      const partial: PartialToolCall = {
        index: 0,
        id: "call_123",
        name: "read",
        argumentsBuffer: '{"path": "/test',
        isComplete: false,
      };

      accumulator.toolCalls.set(0, partial);

      expect(accumulator.toolCalls.size).toBe(1);
      expect(accumulator.toolCalls.get(0)?.name).toBe("read");
    });

    it("should accumulate tool call arguments", () => {
      const accumulator = createStreamAccumulator();

      const partial: PartialToolCall = {
        index: 0,
        id: "call_123",
        name: "read",
        argumentsBuffer: "",
        isComplete: false,
      };

      accumulator.toolCalls.set(0, partial);

      // Simulate streaming arguments
      partial.argumentsBuffer += '{"path": ';
      partial.argumentsBuffer += '"/test.ts"}';

      expect(partial.argumentsBuffer).toBe('{"path": "/test.ts"}');

      // Verify JSON is valid
      const parsed = JSON.parse(partial.argumentsBuffer);
      expect(parsed.path).toBe("/test.ts");
    });
  });

  describe("StreamingState transitions", () => {
    it("should represent idle to streaming transition", () => {
      const state: StreamingState = {
        ...createInitialStreamingState(),
        status: "streaming",
        content: "Processing your request",
      };

      expect(state.status).toBe("streaming");
      expect(state.content).toBe("Processing your request");
    });

    it("should represent tool call accumulation", () => {
      const partial: PartialToolCall = {
        index: 0,
        id: "call_456",
        name: "bash",
        argumentsBuffer: '{"command": "ls -la"}',
        isComplete: false,
      };

      const state: StreamingState = {
        ...createInitialStreamingState(),
        status: "accumulating_tool",
        pendingToolCalls: [partial],
      };

      expect(state.status).toBe("accumulating_tool");
      expect(state.pendingToolCalls).toHaveLength(1);
      expect(state.pendingToolCalls[0].name).toBe("bash");
    });

    it("should represent completion state", () => {
      const state: StreamingState = {
        ...createInitialStreamingState(),
        status: "complete",
        content: "Task completed successfully.",
        completedToolCalls: [
          { id: "call_789", name: "write", arguments: { path: "/out.txt" } },
        ],
      };

      expect(state.status).toBe("complete");
      expect(state.completedToolCalls).toHaveLength(1);
    });

    it("should represent error state", () => {
      const state: StreamingState = {
        ...createInitialStreamingState(),
        status: "error",
        error: "Connection timeout",
      };

      expect(state.status).toBe("error");
      expect(state.error).toBe("Connection timeout");
    });

    it("should represent model switch", () => {
      const state: StreamingState = {
        ...createInitialStreamingState(),
        status: "streaming",
        modelSwitched: {
          from: "gpt-4",
          to: "gpt-4-unlimited",
          reason: "Quota exceeded",
        },
      };

      expect(state.modelSwitched).not.toBeNull();
      expect(state.modelSwitched?.from).toBe("gpt-4");
      expect(state.modelSwitched?.to).toBe("gpt-4-unlimited");
    });
  });

  describe("Tool call finalization", () => {
    it("should convert partial to complete tool call", () => {
      const partial: PartialToolCall = {
        index: 0,
        id: "call_abc",
        name: "edit",
        argumentsBuffer:
          '{"file_path": "/src/app.ts", "old_string": "foo", "new_string": "bar"}',
        isComplete: true,
      };

      const args = JSON.parse(partial.argumentsBuffer);

      expect(args.file_path).toBe("/src/app.ts");
      expect(args.old_string).toBe("foo");
      expect(args.new_string).toBe("bar");
    });

    it("should handle malformed JSON gracefully", () => {
      const partial: PartialToolCall = {
        index: 0,
        id: "call_def",
        name: "read",
        argumentsBuffer: '{"path": "/incomplete',
        isComplete: true,
      };

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(partial.argumentsBuffer);
      } catch {
        args = {};
      }

      expect(args).toEqual({});
    });
  });
});
