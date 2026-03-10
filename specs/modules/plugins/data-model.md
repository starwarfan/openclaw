# Plugins Module Data Model

## 核心类型

### PluginHookName

所有可用的插件钩子名称。

```typescript
type PluginHookName =
  | "before_model_resolve"
  | "before_prompt_build"
  | "before_agent_start"
  | "llm_input"
  | "llm_output"
  | "agent_end"
  | "before_compaction"
  | "after_compaction"
  | "before_reset"
  | "message_received"
  | "message_sending"
  | "message_sent"
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  | "before_message_write"
  | "session_start"
  | "session_end"
  | "subagent_spawning"
  | "subagent_delivery_target"
  | "subagent_spawned"
  | "subagent_ended"
  | "before_tools_resolve"
  | "gateway_start"
  | "gateway_stop";
```

## 钩子事件类型

### BeforeToolsResolve (新增)

**事件**：

```typescript
type PluginHookBeforeToolsResolveEvent = {
  toolNames: string[]; // 当前可用工具列表
};
```

**上下文**：

```typescript
type PluginHookBeforeToolsResolveContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  channelId?: string;
  messageProvider?: string;
  requesterSenderId?: string;
  senderIsOwner?: boolean;
};
```

**返回值**：

```typescript
type PluginHookBeforeToolsResolveResult = {
  deny?: string[]; // 要移除的工具
  allow?: string[]; // 仅保留的工具（与当前集合取交集）
};
```

### BeforeToolCall

**事件**：

```typescript
type PluginHookBeforeToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
};
```

**上下文**（增强后）：

```typescript
type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  toolName: string;
  toolCallId?: string;
  requesterSenderId?: string; // 发送者标识
  senderIsOwner?: boolean; // 是否为 owner
  channelId?: string; // 渠道标识
  messageProvider?: string; // 消息提供者
};
```

**返回值**：

```typescript
type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>; // 修改后的参数
  block?: boolean; // 是否阻止调用
  blockReason?: string; // 阻止原因
};
```

## DTO 类型

### PluginOrigin

插件来源类型：

```typescript
type PluginOrigin = "bundled" | "global" | "workspace" | "config";
```

### OpenClawPluginApi

插件 API 接口，暴露给插件使用：

```typescript
type OpenClawPluginApi = {
  id: string;
  name: string;
  version?: string;
  config: OpenClawConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;

  // 注册方法
  registerTool: (tool, opts?) => void;
  registerHook: (events, handler, opts?) => void;
  registerHttpRoute: (params) => void;
  registerChannel: (registration) => void;
  registerGatewayMethod: (method, handler) => void;
  registerCli: (registrar, opts?) => void;
  registerService: (service) => void;
  registerProvider: (provider) => void;
  registerCommand: (command) => void;
  registerContextEngine: (id, factory) => void;

  // 钩子注册（推荐方式）
  on: <K extends PluginHookName>(
    hookName: K,
    handler: PluginHookHandlerMap[K],
    opts?: { priority?: number },
  ) => void;

  resolvePath: (input: string) => string;
};
```

### PluginHookRegistration

钩子注册记录：

```typescript
type PluginHookRegistration<K extends PluginHookName = PluginHookName> = {
  pluginId: string;
  hookName: K;
  handler: PluginHookHandlerMap[K];
  priority?: number;
  source: string;
};
```

## 枚举

### ProviderAuthKind

认证类型：

```typescript
type ProviderAuthKind = "oauth" | "api_key" | "token" | "device_code" | "custom";
```

### PluginKind

插件类型：

```typescript
type PluginKind = "memory" | "context-engine";
```
