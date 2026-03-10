# Plugins Module Specification

## Boundary and Responsibilities

插件模块负责 OpenClaw 的插件系统，包括：

- 插件生命周期管理（加载、激活、卸载）
- 钩子系统（hook system）用于插件与核心的交互
- 插件 API 暴露（tools, commands, routes, channels）
- 插件配置和验证

## Core Concepts

### Plugin Lifecycle

1. **Discovery** - 从 bundled/global/workspace/config 来源发现插件
2. **Load** - 加载插件模块，验证配置 schema
3. **Register** - 调用 `register()` 注册 tools/hooks/commands 等
4. **Activate** - 调用 `activate()` 激活插件功能
5. **Unload** - 清理资源，移除注册

### Hook System

钩子允许插件在 agent 运行的各个阶段注入自定义逻辑：

| 钩子                                                    | 触发时机           | 用途                     |
| ------------------------------------------------------- | ------------------ | ------------------------ |
| `before_model_resolve`                                  | 模型选择前         | 覆盖模型/提供商          |
| `before_prompt_build`                                   | 提示构建前         | 注入系统提示/上下文      |
| `before_agent_start`                                    | Agent 启动前       | 组合上述两个阶段（兼容） |
| `before_tools_resolve`                                  | **工具列表组装时** | **动态过滤可用工具**     |
| `before_tool_call`                                      | 工具调用前         | 拦截/修改工具调用        |
| `after_tool_call`                                       | 工具调用后         | 后处理工具结果           |
| `llm_input` / `llm_output`                              | LLM 调用前后       | 记录/监控                |
| `agent_end`                                             | Agent 结束时       | 清理/通知                |
| `message_received` / `message_sending` / `message_sent` | 消息流转           | 过滤/修改消息            |
| `session_start` / `session_end`                         | 会话生命周期       | 状态管理                 |
| `gateway_start` / `gateway_stop`                        | Gateway 生命周期   | 初始化/清理              |

## External Contracts

- 类型定义: `src/plugins/types.ts`
- 钩子实现: `src/plugins/hooks.ts`
- 运行时: `src/plugins/runtime/`

## Permissions and Invariants

### 调用者身份上下文

以下钩子接收调用者身份信息：

- `before_tool_call`: `PluginHookToolContext`
- `before_tools_resolve`: `PluginHookBeforeToolsResolveContext`

身份字段：

- `requesterSenderId` - 发起请求的用户标识
- `senderIsOwner` - 是否为配置中的 owner
- `channelId` - 渠道标识（telegram, discord 等）
- `messageProvider` - 消息提供者
- `agentId` / `sessionId` / `sessionKey` - Agent 会话标识

### 钩子执行顺序

- 钩子按注册顺序执行，支持 `priority` 参数调整
- 多个插件可注册同一钩子
- 插件返回 `void` 表示"不干预"

## Error Codes

| 错误                    | 说明                   |
| ----------------------- | ---------------------- |
| `PLUGIN_NOT_FOUND`      | 插件模块未找到         |
| `PLUGIN_CONFIG_INVALID` | 配置验证失败           |
| `PLUGIN_LOAD_FAILED`    | 加载失败（依赖缺失等） |
| `HOOK_HANDLER_ERROR`    | 钩子处理函数抛出异常   |

## Compatibility Policy

- 新增钩子类型需要同时更新 `PluginHookName` 和 `PLUGIN_HOOK_NAMES`
- 钩子签名变更需要版本协商机制（向后兼容）
- 破坏性变更需要 major version bump
