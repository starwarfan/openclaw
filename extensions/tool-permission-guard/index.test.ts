import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookRunner } from "../../src/plugins/hooks.js";
import { createEmptyPluginRegistry, type PluginRegistry } from "../../src/plugins/registry.js";
import type {
  PluginHookBeforeToolCallResult,
  PluginHookBeforeToolsResolveResult,
  PluginHookRegistration,
} from "../../src/plugins/types.js";

type MockPluginApi = {
  pluginConfig: Record<string, unknown>;
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  on: (
    hookName: string,
    handler: (...args: unknown[]) => unknown,
    opts?: { priority?: number },
  ) => void;
  _hooks: Array<{ hookName: string; handler: (...args: unknown[]) => unknown; priority?: number }>;
};

function createMockApi(config: Record<string, unknown> = {}): MockPluginApi {
  const hooks: MockPluginApi["_hooks"] = [];
  return {
    pluginConfig: config,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    on(hookName, handler, opts) {
      hooks.push({ hookName, handler, priority: opts?.priority });
    },
    _hooks: hooks,
  };
}

function buildRegistry(api: MockPluginApi): PluginRegistry {
  const registry = createEmptyPluginRegistry();
  for (const hook of api._hooks) {
    registry.typedHooks.push({
      pluginId: "tool-permission-guard",
      hookName: hook.hookName,
      handler: hook.handler,
      priority: hook.priority,
      source: "test",
    } as PluginHookRegistration);
  }
  return registry;
}

describe("tool-permission-guard plugin", () => {
  let api: MockPluginApi;

  beforeEach(async () => {
    api = createMockApi({
      nonOwnerDenyTools: ["exec", "gateway"],
      channelAllowMap: {
        support: ["read", "write", "message"],
      },
    });
    const mod = await import("./index.js");
    // oxlint-disable-next-line typescript/no-explicit-any
    (mod.default as (api: any) => void)(api);
  });

  describe("before_tools_resolve", () => {
    it("denies dangerous tools for non-owner senders", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = (await runner.runBeforeToolsResolve(
        { toolNames: ["read", "write", "exec", "gateway", "message"] },
        { senderIsOwner: false, requesterSenderId: "user-42" },
      )) as PluginHookBeforeToolsResolveResult;

      expect(result.deny).toContain("exec");
      expect(result.deny).toContain("gateway");
      expect(result.deny).not.toContain("read");
    });

    it("allows all tools for owner senders", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = await runner.runBeforeToolsResolve(
        { toolNames: ["read", "write", "exec", "gateway"] },
        { senderIsOwner: true, requesterSenderId: "owner-1" },
      );

      expect(result).toBeUndefined();
    });

    it("applies per-channel allowlist", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = (await runner.runBeforeToolsResolve(
        { toolNames: ["read", "write", "exec", "gateway", "message"] },
        { senderIsOwner: true, channelId: "support" },
      )) as PluginHookBeforeToolsResolveResult;

      expect(result.allow).toEqual(["read", "write", "message"]);
    });

    it("applies both deny and channel allowlist for non-owner on restricted channel", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = (await runner.runBeforeToolsResolve(
        { toolNames: ["read", "write", "exec", "gateway", "message"] },
        { senderIsOwner: false, channelId: "support", requesterSenderId: "visitor" },
      )) as PluginHookBeforeToolsResolveResult;

      expect(result.deny).toContain("exec");
      expect(result.deny).toContain("gateway");
      expect(result.allow).toEqual(["read", "write", "message"]);
    });
  });

  describe("before_tool_call", () => {
    it("blocks non-owner from using denied tools", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = (await runner.runBeforeToolCall(
        { toolName: "exec", params: { command: "rm -rf /" } },
        {
          toolName: "exec",
          senderIsOwner: false,
          requesterSenderId: "user-42",
          channelId: "telegram",
        },
      )) as PluginHookBeforeToolCallResult;

      expect(result.block).toBe(true);
      expect(result.blockReason).toContain("owner permissions");
      expect(api.logger.warn).toHaveBeenCalled();
    });

    it("allows owner to use any tool", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = await runner.runBeforeToolCall(
        { toolName: "exec", params: { command: "ls" } },
        {
          toolName: "exec",
          senderIsOwner: true,
          requesterSenderId: "owner-1",
          channelId: "telegram",
        },
      );

      expect(result?.block).toBeFalsy();
      expect(api.logger.debug).toHaveBeenCalled();
    });

    it("allows non-owner to use safe tools", async () => {
      const registry = buildRegistry(api);
      const runner = createHookRunner(registry);

      const result = await runner.runBeforeToolCall(
        { toolName: "read", params: { path: "/tmp/file.txt" } },
        {
          toolName: "read",
          senderIsOwner: false,
          requesterSenderId: "user-42",
          channelId: "telegram",
        },
      );

      expect(result?.block).toBeFalsy();
      expect(api.logger.debug).toHaveBeenCalled();
    });
  });
});
