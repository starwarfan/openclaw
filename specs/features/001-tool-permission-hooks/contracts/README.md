# Contract Deltas

Authoritative source: `../../modules/plugins/contracts/interfaces.md`

## Added

- `before_tools_resolve` hook - 列表级工具过滤
- `PluginHookBeforeToolsResolveEvent` - 工具列表事件
- `PluginHookBeforeToolsResolveContext` - 调用者身份上下文
- `PluginHookBeforeToolsResolveResult` - 过滤结果（deny/allow）
- `applyBeforeToolsResolveHook()` - 辅助函数

## Modified

- `PluginHookToolContext` - 增加 `requesterSenderId`, `senderIsOwner`, `channelId`, `messageProvider` 字段
- `PluginHookName` - 增加 `before_tools_resolve`
- `PLUGIN_HOOK_NAMES` - 增加 `before_tools_resolve`

## Deprecated

无
