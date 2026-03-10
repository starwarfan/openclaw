# Plugin Hooks Interfaces

## 钩子注册 API

### `api.on()`

注册生命周期钩子处理器。

```typescript
api.on<K extends PluginHookName>(
  hookName: K,
  handler: PluginHookHandlerMap[K],
  opts?: { priority?: number }
): void;
```

**参数**：

- `hookName` - 钩子名称
- `handler` - 处理函数，签名根据钩子类型而定
- `opts.priority` - 执行优先级（数字越小越先执行）

**示例**：

```typescript
// 注册 before_tools_resolve 钩子
api.on("before_tools_resolve", async (event, ctx) => {
  if (ctx.channelId === "telegram" && !ctx.senderIsOwner) {
    return { deny: ["Bash", "WebFetch"] };
  }
  return;
});
```

## 工具过滤钩子

### before_tools_resolve

在工具列表组装时触发，允许插件动态过滤可用工具。

**执行时机**：Agent 运行开始时，工具列表发送给 LLM 之前。

**签名**：

```typescript
(
  event: PluginHookBeforeToolsResolveEvent,
  ctx: PluginHookBeforeToolsResolveContext
) => Promise<PluginHookBeforeToolsResolveResult | void>
   | PluginHookBeforeToolsResolveResult
   | void
```

**返回值**：

- `{ deny: string[] }` - 从可用列表中移除指定工具
- `{ allow: string[] }` - 仅保留指定工具（与当前集合取交集）
- `void` - 不做任何过滤

**典型用例**：

- 基于 channel 的工具访问控制
- 基于 sender 身份的工具权限
- 敏感工具（Bash, WebFetch）的限制

### before_tool_call

在工具调用前触发，允许插件拦截或修改调用。

**执行时机**：LLM 选择工具后，实际执行前。

**签名**：

```typescript
(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext
) => Promise<PluginHookBeforeToolCallResult | void>
   | PluginHookBeforeToolCallResult
   | void
```

**返回值**：

- `{ block: true, blockReason: string }` - 阻止调用，返回错误
- `{ params: Record<string, unknown> }` - 修改参数后继续调用
- `void` - 正常执行

**典型用例**：

- 基于参数内容的动态决策
- 敏感操作审计
- 参数校验和转换

## 辅助函数

### `applyBeforeToolsResolveHook()`

应用 `before_tools_resolve` 钩子过滤工具列表。

**位置**：`src/agents/pi-tools.ts`

```typescript
async function applyBeforeToolsResolveHook(
  tools: Map<string, AnyAgentTool>,
  context: PluginHookBeforeToolsResolveContext,
): Promise<Map<string, AnyAgentTool>>;
```

**参数**：

- `tools` - 当前可用工具 Map
- `context` - 调用者身份上下文

**返回值**：过滤后的工具 Map

**处理逻辑**：

1. 收集所有已注册的 `before_tools_resolve` 钩子
2. 按顺序执行每个钩子
3. 累积 deny/allow 列表
4. 对工具 Map 应用过滤

## 内部实现

### 钩子存储

```typescript
// src/plugins/hooks.ts
const pluginHooks: Map<PluginHookName, PluginHookRegistration[]> = new Map();
```

### 钩子注册

```typescript
function registerPluginHook<K extends PluginHookName>(
  pluginId: string,
  hookName: K,
  handler: PluginHookHandlerMap[K],
  opts?: { priority?: number },
): void {
  const registration: PluginHookRegistration<K> = {
    pluginId,
    hookName,
    handler,
    priority: opts?.priority ?? 0,
    source: getCallerSource(),
  };
  const handlers = pluginHooks.get(hookName) ?? [];
  // 按优先级插入
  // ...
}
```

### 钩子调用

```typescript
async function invokePluginHook<K extends PluginHookName>(
  hookName: K,
  event: Parameters<PluginHookHandlerMap[K]>[0],
  ctx: Parameters<PluginHookHandlerMap[K]>[1],
): Promise<Awaited<ReturnType<PluginHookHandlerMap[K]>>> {
  const handlers = pluginHooks.get(hookName) ?? [];
  let result;
  for (const { handler } of handlers) {
    result = await handler(event, ctx);
    if (result !== undefined) break; // 首个非 void 结果终止
  }
  return result;
}
```
