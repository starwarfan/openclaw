import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import { createHookRunner } from "../plugins/hooks.js";
import { createEmptyPluginRegistry, type PluginRegistry } from "../plugins/registry.js";
import type { PluginHookRegistration } from "../plugins/types.js";
import {
  runBeforeToolCallHook,
  wrapToolWithBeforeToolCallHook,
} from "./pi-tools.before-tool-call.js";
import { applyBeforeToolsResolveHook } from "./pi-tools.js";
import type { AnyAgentTool } from "./tools/common.js";

vi.mock("../plugins/hook-runner-global.js");

const mockGetGlobalHookRunner = vi.mocked(getGlobalHookRunner);

function makeTool(name: string): AnyAgentTool {
  return {
    name,
    description: `tool ${name}`,
    parameters: {},
    execute: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] }),
  } as unknown as AnyAgentTool;
}

// ---------------------------------------------------------------------------
// before_tool_call identity propagation
// ---------------------------------------------------------------------------

describe("before_tool_call identity context propagation", () => {
  let hookRunner: {
    hasHooks: ReturnType<typeof vi.fn>;
    runBeforeToolCall: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hookRunner = {
      hasHooks: vi.fn().mockReturnValue(true),
      runBeforeToolCall: vi.fn().mockResolvedValue(undefined),
    };
    // oxlint-disable-next-line typescript/no-explicit-any
    mockGetGlobalHookRunner.mockReturnValue(hookRunner as any);
  });

  it("passes identity fields from HookContext to PluginHookToolContext", async () => {
    await runBeforeToolCallHook({
      toolName: "exec",
      params: { command: "ls" },
      toolCallId: "tc-1",
      ctx: {
        agentId: "main",
        sessionKey: "agent:main:telegram:default:direct:user123",
        sessionId: "sid-1",
        runId: "run-1",
        requesterSenderId: "user123",
        senderIsOwner: false,
        channelId: "telegram",
        messageProvider: "telegram",
      },
    });

    expect(hookRunner.runBeforeToolCall).toHaveBeenCalledOnce();
    const [, toolContext] = hookRunner.runBeforeToolCall.mock.calls[0];
    expect(toolContext.requesterSenderId).toBe("user123");
    expect(toolContext.senderIsOwner).toBe(false);
    expect(toolContext.channelId).toBe("telegram");
    expect(toolContext.messageProvider).toBe("telegram");
  });

  it("omits identity fields when not provided in HookContext", async () => {
    await runBeforeToolCallHook({
      toolName: "read",
      params: {},
      ctx: {
        agentId: "main",
        sessionKey: "agent:main:main",
      },
    });

    expect(hookRunner.runBeforeToolCall).toHaveBeenCalledOnce();
    const [, toolContext] = hookRunner.runBeforeToolCall.mock.calls[0];
    expect(toolContext.requesterSenderId).toBeUndefined();
    expect(toolContext.senderIsOwner).toBeUndefined();
    expect(toolContext.channelId).toBeUndefined();
    expect(toolContext.messageProvider).toBeUndefined();
  });

  it("propagates identity through wrapToolWithBeforeToolCallHook", async () => {
    const tool = makeTool("exec");
    const wrapped = wrapToolWithBeforeToolCallHook(tool, {
      agentId: "main",
      sessionKey: "agent:main:main",
      requesterSenderId: "owner-user",
      senderIsOwner: true,
      channelId: "discord",
      messageProvider: "discord",
    });

    await wrapped.execute("tc-1", { command: "echo hi" }, undefined, undefined);

    expect(hookRunner.runBeforeToolCall).toHaveBeenCalledOnce();
    const [, toolContext] = hookRunner.runBeforeToolCall.mock.calls[0];
    expect(toolContext.requesterSenderId).toBe("owner-user");
    expect(toolContext.senderIsOwner).toBe(true);
    expect(toolContext.channelId).toBe("discord");
    expect(toolContext.messageProvider).toBe("discord");
  });
});

// ---------------------------------------------------------------------------
// before_tools_resolve hook
// ---------------------------------------------------------------------------

describe("before_tools_resolve hook", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = createEmptyPluginRegistry();
  });

  function addBeforeToolsResolveHook(
    pluginId: string,
    handler: (...args: unknown[]) => unknown,
    priority?: number,
  ) {
    registry.typedHooks.push({
      pluginId,
      hookName: "before_tools_resolve",
      handler,
      priority,
      source: "test",
    } as PluginHookRegistration);
  }

  it("denies tools returned in the deny list", async () => {
    addBeforeToolsResolveHook("policy", () => ({
      deny: ["exec", "gateway"],
    }));

    const runner = createHookRunner(registry);
    const result = await runner.runBeforeToolsResolve(
      { toolNames: ["read", "write", "exec", "gateway", "message"] },
      { agentId: "main", senderIsOwner: false },
    );

    expect(result?.deny).toContain("exec");
    expect(result?.deny).toContain("gateway");
  });

  it("returns allow list for intersection filtering", async () => {
    addBeforeToolsResolveHook("policy", () => ({
      allow: ["read", "write"],
    }));

    const runner = createHookRunner(registry);
    const result = await runner.runBeforeToolsResolve(
      { toolNames: ["read", "write", "exec", "gateway"] },
      { agentId: "main", senderIsOwner: false },
    );

    expect(result?.allow).toEqual(["read", "write"]);
  });

  it("merges deny lists from multiple hooks", async () => {
    addBeforeToolsResolveHook("policy-a", () => ({ deny: ["exec"] }), 10);
    addBeforeToolsResolveHook("policy-b", () => ({ deny: ["gateway"] }), 5);

    const runner = createHookRunner(registry);
    const result = await runner.runBeforeToolsResolve(
      { toolNames: ["read", "exec", "gateway"] },
      {},
    );

    expect(result?.deny).toContain("exec");
    expect(result?.deny).toContain("gateway");
  });

  it("receives identity context", async () => {
    let receivedCtx: Record<string, unknown> = {};
    addBeforeToolsResolveHook("spy", (_event: unknown, ctx: unknown) => {
      receivedCtx = ctx as Record<string, unknown>;
      return undefined;
    });

    const runner = createHookRunner(registry);
    await runner.runBeforeToolsResolve(
      { toolNames: ["read"] },
      {
        agentId: "main",
        sessionKey: "agent:main:main",
        requesterSenderId: "user-42",
        senderIsOwner: false,
        channelId: "telegram",
        messageProvider: "telegram",
      },
    );

    expect(receivedCtx.requesterSenderId).toBe("user-42");
    expect(receivedCtx.senderIsOwner).toBe(false);
    expect(receivedCtx.channelId).toBe("telegram");
    expect(receivedCtx.messageProvider).toBe("telegram");
  });

  it("returns undefined when no hooks are registered", async () => {
    const runner = createHookRunner(registry);
    const result = await runner.runBeforeToolsResolve({ toolNames: ["read"] }, {});
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// applyBeforeToolsResolveHook integration
// ---------------------------------------------------------------------------

describe("applyBeforeToolsResolveHook", () => {
  beforeEach(() => {
    mockGetGlobalHookRunner.mockReturnValue(null);
  });

  it("returns tools unchanged when no hook runner exists", async () => {
    const tools = [makeTool("read"), makeTool("exec"), makeTool("gateway")];
    const result = await applyBeforeToolsResolveHook(tools, { agentId: "main" });
    expect(result).toHaveLength(3);
  });

  it("returns tools unchanged when no hooks are registered", async () => {
    const hookRunner = {
      hasHooks: vi.fn().mockReturnValue(false),
      runBeforeToolsResolve: vi.fn(),
    };
    // oxlint-disable-next-line typescript/no-explicit-any
    mockGetGlobalHookRunner.mockReturnValue(hookRunner as any);

    const tools = [makeTool("read"), makeTool("exec")];
    const result = await applyBeforeToolsResolveHook(tools, { agentId: "main" });
    expect(result).toHaveLength(2);
    expect(hookRunner.runBeforeToolsResolve).not.toHaveBeenCalled();
  });

  it("filters tools by deny list from hook result", async () => {
    const hookRunner = {
      hasHooks: vi.fn().mockReturnValue(true),
      runBeforeToolsResolve: vi.fn().mockResolvedValue({ deny: ["exec", "gateway"] }),
    };
    // oxlint-disable-next-line typescript/no-explicit-any
    mockGetGlobalHookRunner.mockReturnValue(hookRunner as any);

    const tools = [makeTool("read"), makeTool("exec"), makeTool("gateway"), makeTool("write")];
    const result = await applyBeforeToolsResolveHook(tools, {
      agentId: "main",
      senderIsOwner: false,
    });

    expect(result.map((t) => t.name)).toEqual(["read", "write"]);
  });

  it("filters tools by allow list from hook result", async () => {
    const hookRunner = {
      hasHooks: vi.fn().mockReturnValue(true),
      runBeforeToolsResolve: vi.fn().mockResolvedValue({ allow: ["read", "write"] }),
    };
    // oxlint-disable-next-line typescript/no-explicit-any
    mockGetGlobalHookRunner.mockReturnValue(hookRunner as any);

    const tools = [makeTool("read"), makeTool("exec"), makeTool("gateway"), makeTool("write")];
    const result = await applyBeforeToolsResolveHook(tools, { agentId: "main" });

    expect(result.map((t) => t.name)).toEqual(["read", "write"]);
  });

  it("deny takes precedence over allow", async () => {
    const hookRunner = {
      hasHooks: vi.fn().mockReturnValue(true),
      runBeforeToolsResolve: vi
        .fn()
        .mockResolvedValue({ allow: ["read", "write", "exec"], deny: ["exec"] }),
    };
    // oxlint-disable-next-line typescript/no-explicit-any
    mockGetGlobalHookRunner.mockReturnValue(hookRunner as any);

    const tools = [makeTool("read"), makeTool("exec"), makeTool("write")];
    const result = await applyBeforeToolsResolveHook(tools, { agentId: "main" });

    expect(result.map((t) => t.name)).toEqual(["read", "write"]);
  });
});
