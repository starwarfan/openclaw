# Data Model Deltas

Authoritative source: `../../modules/plugins/data-model.md`

## Added

### PluginHookBeforeToolsResolveEvent

```typescript
{
  toolNames: string[];  // 当前可用工具列表
}
```

### PluginHookBeforeToolsResolveContext

```typescript
{
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  channelId?: string;
  messageProvider?: string;
  requesterSenderId?: string;
  senderIsOwner?: boolean;
}
```

### PluginHookBeforeToolsResolveResult

```typescript
{
  deny?: string[];   // 要移除的工具
  allow?: string[];  // 仅保留的工具
}
```

## Modified

### PluginHookToolContext

新增字段：

- `requesterSenderId?: string` - 发送者标识
- `senderIsOwner?: boolean` - 是否为 owner
- `channelId?: string` - 渠道标识
- `messageProvider?: string` - 消息提供者

### PluginHookName

新增值：

- `"before_tools_resolve"`

## Deprecated

无
