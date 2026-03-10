# 功能提案

功能规格不是权威来源，仅描述变更意图和增量。

## 生命周期

提案 → 开发 → 审查 → 合并 → 归档

## 命名规范

每个功能以 `<NNN>-<slug>/` 子目录存放，包含 spec.md、plan.md、tasks.md 等文件。

## 结构

```
specs/features/<NNN>-<slug>/
├── spec.md          # 功能规格
├── plan.md          # 实现计划
├── tasks.md         # 任务分解
├── research.md      # 技术调研
├── quickstart.md    # 快速入门
├── data-model.md    # 数据模型增量
└── contracts/
    └── README.md    # 合同增量
```

## 规则

- 合同定义链接到 `specs/modules/<module>/contracts/`
- 仅描述增量（添加/修改/废弃）
- 不重复定义完整的合同或 DTO
