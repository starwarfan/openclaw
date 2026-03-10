/**
 * Tool Permission Guard — sample plugin
 *
 * Demonstrates the two tool permission hooks:
 *
 * 1. `before_tools_resolve` — filters the tool list before tools reach the LLM.
 *    Used here to enforce per-channel allowlists (e.g. only "read" + "write"
 *    on a support channel) and strip dangerous tools for non-owner senders.
 *
 * 2. `before_tool_call` — intercepts each tool call with full caller identity.
 *    Used here as a second-layer guard that blocks individual calls and logs
 *    the decision for audit.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/tool-permission-guard";

type ToolPermissionGuardConfig = {
  nonOwnerDenyTools?: string[];
  channelAllowMap?: Record<string, string[]>;
};

export default function register(api: OpenClawPluginApi) {
  const cfg = (api.pluginConfig ?? {}) as ToolPermissionGuardConfig;

  const nonOwnerDeny = new Set(
    (cfg.nonOwnerDenyTools ?? ["exec", "gateway", "cron"]).map((n) => n.toLowerCase()),
  );

  const channelAllowMap = new Map<string, Set<string>>();
  if (cfg.channelAllowMap) {
    for (const [channel, tools] of Object.entries(cfg.channelAllowMap)) {
      channelAllowMap.set(channel, new Set(tools.map((t) => t.toLowerCase())));
    }
  }

  // -------------------------------------------------------------------------
  // Hook 1: before_tools_resolve — list-level filtering
  // -------------------------------------------------------------------------
  api.on(
    "before_tools_resolve",
    (event, ctx) => {
      const deny: string[] = [];
      let allow: string[] | undefined;

      // Deny dangerous tools for non-owners
      if (ctx.senderIsOwner !== true) {
        for (const toolName of event.toolNames) {
          if (nonOwnerDeny.has(toolName.toLowerCase())) {
            deny.push(toolName);
          }
        }
        if (deny.length > 0) {
          api.logger.info(
            `[tool-permission-guard] Stripping ${deny.length} tool(s) for ` +
              `non-owner sender=${ctx.requesterSenderId ?? "unknown"}: ${deny.join(", ")}`,
          );
        }
      }

      // Apply per-channel allowlist
      if (ctx.channelId && channelAllowMap.has(ctx.channelId)) {
        const channelAllow = channelAllowMap.get(ctx.channelId)!;
        allow = event.toolNames.filter((name) => channelAllow.has(name.toLowerCase()));
        api.logger.info(
          `[tool-permission-guard] Channel ${ctx.channelId} allowlist active: ` +
            `${allow.length}/${event.toolNames.length} tools allowed`,
        );
      }

      if (deny.length === 0 && !allow) {
        return;
      }
      return { deny, allow };
    },
    { priority: 90 },
  );

  // -------------------------------------------------------------------------
  // Hook 2: before_tool_call — per-call guard with audit log
  // -------------------------------------------------------------------------
  api.on(
    "before_tool_call",
    (event, ctx) => {
      const toolName = event.toolName.toLowerCase();

      // Block non-owner access to denied tools (defense-in-depth)
      if (ctx.senderIsOwner !== true && nonOwnerDeny.has(toolName)) {
        api.logger.warn(
          `[tool-permission-guard] BLOCKED tool=${event.toolName} ` +
            `sender=${ctx.requesterSenderId ?? "unknown"} ` +
            `channel=${ctx.channelId ?? "unknown"} ` +
            `reason=non-owner access denied`,
        );
        return {
          block: true,
          blockReason:
            `Tool "${event.toolName}" requires owner permissions. ` +
            `Contact an administrator if you need access.`,
        };
      }

      // Audit log for all tool calls (non-blocking)
      api.logger.debug(
        `[tool-permission-guard] ALLOW tool=${event.toolName} ` +
          `sender=${ctx.requesterSenderId ?? "unknown"} ` +
          `owner=${ctx.senderIsOwner ?? false} ` +
          `channel=${ctx.channelId ?? "cli"}`,
      );
    },
    { priority: 90 },
  );
}
