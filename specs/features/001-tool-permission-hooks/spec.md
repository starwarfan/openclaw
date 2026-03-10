# 工具权限控制钩子

## 概述

添加插件钩子系统，支持基于调用者身份和环境的工具权限控制。包括两个层面的钩子：

- `before_tools_resolve`：列表级过滤，在工具列表组装时触发
- `before_tool_call`：调用级拦截，在工具调用前触发

## 动机

为 OpenClaw 插件提供细粒度的工具访问控制能力，支持：

- 基于 channel/用户身份的工具访问策略
- 敏感工具（如 Bash、WebFetch）的访问限制
- 多租户环境下的权限隔离

## 功能需求

### FR-001: before_tools_resolve 钩子

**描述**：在 agent 运行时工具列表组装阶段触发，允许插件返回 deny/allow 列表动态过滤可用工具。

**实现**：

- 钩子签名：`(context: BeforeToolsResolveContext) => BeforeToolsResolveResult | void`
- 上下文包含：caller identity（channel、userId、sessionId 等）
- 返回值：`{ deny?: string[], allow?: string[] }` 或 `void`

**关键文件**：

- `src/plugins/types.ts:34` - 类型定义
- `src/plugins/hooks.ts:27` - 钩子注册和调用逻辑
- `src/agents/pi-tools.ts:42` - `applyBeforeToolsResolveHook()` 辅助函数
- `src/agents/pi-embedded-runner/run/attempt.ts:17` - 主运行路径集成

### FR-002: before_tool_call 上下文增强

**描述**：增强 `before_tool_call` 钩子的上下文，包含调用者身份信息。

**实现**：

- 上下文字段扩展：`requesterSenderId`, `senderIsOwner`, `channelId`, `messageProvider`
- 与 `before_tools_resolve` 共享相同的身份信息结构
- 支持 HookContext 也包含这些字段

**关键文件**：

- `src/plugins/types.ts` - 类型定义，新增 4 个身份字段
- `src/agents/pi-tools.before-tool-call.ts` - 上下文构建逻辑
- `src/agents/pi-tools.ts` - 上下文传递
- `src/agents/pi-tools.tool-permission-hooks.test.ts` - 测试覆盖

### FR-003: tool-permission-guard 示例插件

**描述**：提供完整的示例插件，演示如何使用两个钩子实现访问控制。

**功能**：

- 实现 `before_tools_resolve` 进行列表级过滤
- 实现 `before_tool_call` 进行调用级拦截
- 基于配置定义允许/拒绝规则
- 包含完整测试用例

**关键文件**：

- `extensions/tool-permission-guard/index.ts` - 主实现
- `extensions/tool-permission-guard/index.test.ts` - 测试
- `extensions/tool-permission-guard/openclaw.plugin.json` - 插件清单

## 技术设计

### 钩子执行流程

```
Agent Run
    │
    ├─► Tool List Assembly
    │       │
    │       └─► before_tools_resolve hook
    │               ├─► Plugin returns deny list → remove denied tools
    │               ├─► Plugin returns allow list → keep only allowed tools
    │               └─► Plugin returns void → no filtering
    │
    ├─► Tool Selection (AI)
    │
    └─► Tool Execution
            │
            └─► before_tool_call hook
                    ├─► Plugin allows → execute tool
                    └─► Plugin denies → return error
```

### 调用者身份信息

```typescript
interface CallerIdentity {
  channel?: string; // 消息来源渠道（telegram, discord, etc.）
  userId?: string; // 用户标识
  sessionId?: string; // 会话标识
  // ... 其他上下文信息
}
```

## Clarifications

> 此功能已实现完成，以下为实现时的技术决策：

**Q1: 钩子执行顺序**

- 先执行 `before_tools_resolve`（列表过滤），再在调用时执行 `before_tool_call`（调用拦截）
- 两层防护提供更细粒度的控制

**Q2: 列表过滤 vs 调用拦截的分工**

- `before_tools_resolve`：适用于静态规则（如"某些 channel 永远不能用 Bash"）
- `before_tool_call`：适用于动态决策（如"根据参数内容决定是否允许"）

**Q3: 插件配置方式**

- 示例插件使用 JSON 配置文件定义规则
- 生产环境可扩展为数据库驱动的规则引擎

## 非功能需求

### NF-001: 性能

- 钩子执行不应显著增加工具调用的延迟
- 列表过滤在工具列表组装时一次性完成

### NF-002: 可扩展性

- 支持多个插件注册同一钩子，按顺序执行
- 插件可以返回 void 表示"不干预"

### NF-003: 测试覆盖

- 单元测试覆盖钩子注册、调用、过滤逻辑
- 示例插件包含完整测试用例

## 验收标准

- [x] `before_tools_resolve` 钩子类型定义完成
- [x] 钩子在 tool list assembly 阶段正确触发
- [x] `before_tool_call` 上下文包含调用者身份
- [x] tool-permission-guard 插件实现并通过测试
- [x] 核心代码测试覆盖率满足项目要求

## 相关文件

| 文件                                                | 说明                         |
| --------------------------------------------------- | ---------------------------- |
| `src/plugins/types.ts`                              | 钩子类型定义，身份字段       |
| `src/plugins/hooks.ts`                              | 钩子系统实现                 |
| `src/agents/pi-tools.ts`                            | 工具权限辅助函数，上下文传递 |
| `src/agents/pi-tools.before-tool-call.ts`           | before_tool_call 上下文构建  |
| `src/agents/pi-embedded-runner/run/attempt.ts`      | 运行时集成                   |
| `src/agents/pi-tools.tool-permission-hooks.test.ts` | 钩子测试                     |
| `extensions/tool-permission-guard/`                 | 示例插件                     |

## Commit 历史

| SHA         | 描述                                                               |
| ----------- | ------------------------------------------------------------------ |
| `6e74715c9` | hooks: enrich before_tool_call context with caller identity        |
| `f0ce719c1` | hooks: add before_tools_resolve hook for list-level tool filtering |
| `460027d66` | extensions: add tool-permission-guard sample plugin                |
