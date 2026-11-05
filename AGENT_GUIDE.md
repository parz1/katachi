# Agent 使用指南

写给所有使用本库的 AI agent。这里只描述任务和结果，不依赖特定模型或工具。用什么渲染、搜索，取决于你的环境；做不到就直接说明。

文中路径都相对于本库根目录。在产品项目里，本库通常是子模块 `design/katachi/`，需要加上这个前缀，并以产品锁定的版本为准。

## 1. 开始前确认

1. **在哪里工作**：在本库维护资产，还是在产品项目里做界面？后者先读该产品的 `DESIGN.md`。
2. **面向哪些平台**：读 `platforms/` 里目标平台的文件，不用读其他平台。不清楚目标平台就问用户。找不到对应文件时看 `platforms/README.md`，它可能是暂缓的场景。
3. **能依赖什么**：看 [README](README.md) 的成熟度表。还没校准的领域不能当规范用。
4. **处于哪个阶段**：草图、视觉设计、交互原型还是生产实现（[定义](workflows/README.md)）。不同阶段的产出不能互相冒充。

## 2. 规则优先级

| 级别 | 来源 | 在哪里 |
|---|---|---|
| 1 | 当前用户要求 | 当前对话 |
| 2 | 产品明确约束 | 法规、平台和技术限制、品牌要求；产品 `DESIGN.md` 的「约束」 |
| 3 | 已采用的产品规范 | 产品 `DESIGN.md` 的其他部分 |
| 4 | 共享基础 | 通用基线；`platforms/` 的平台要求；`foundations/taste.md` 的明确偏好；`foundations/`、`tokens/`、`patterns/` 中状态为 standard、adopted、validated 的内容 |
| 5 | 探索性参考 | `references/`、`explorations/`、`foundations/taste.md` 的推测、状态为 draft 的内容 |

发生冲突时：

- 按高优先级执行，并在回复里说明偏离了哪条规则。一次性的偏离说明即可。
- 偏离要长期保留的，写进产品 `DESIGN.md` 的例外表。
- 当前要求低于可访问性下限，或要使用授权不明的素材时，先说明影响，由用户决定。用户决定使用授权不明的素材时，可以放进产品，但不能登记进 `assets/`，并记入产品的例外表。
- 同一级内矛盾时，用适用范围更窄的那条，比如平台文件优先于通用规则。判断不了就问用户，并把矛盾记入 `foundations/taste.md` 的待验证。

## 3. 审美判断的证据

`foundations/taste.md` 分三类，用法不同：

| 类别 | 含义 | 可以 | 不可以 |
|---|---|---|---|
| 明确偏好（S-） | 用户亲口说过，附原话 | 当规则用 | 扩大到用户没说的情境 |
| 推测（I-） | agent 根据证据的猜测 | 在探索中当出发点，并说明是推测 | 当成偏好写进规范 |
| 待验证（O-） | 还没决定 | 任务需要时做临时选择，标注「临时：O-xxx」 | 默默定案 |

其他约定：

- 「现代、简洁、高级」这类词不是验收标准。听到时，用具体方案比较把它们变成看得见的差异。
- 不替用户选流行风格。需要方向时，给结构上真正不同的方案让用户比较（[流程](workflows/explore.md)）。
- 不写一概禁止的规则。写清在什么情境下用或不用，以及为什么。
- 每次最多问 3 个关键问题，每个问题都附上你的建议。

## 4. 按任务读文件

只读需要的文件。没有列出的不用读。

| 任务 | 必读 | 按需 |
|---|---|---|
| 探索界面或视觉方向 | `workflows/explore.md`、`foundations/taste.md`、目标平台的 `platforms/<id>.md` | 相关的 `references/*.md`、`foundations/content-stress.json` |
| 在产品里实现界面 | 产品 `DESIGN.md`、目标平台的 `platforms/<id>.md`、`foundations/baseline.md`、`tokens/katachi.tokens.json`、`patterns/README.md` | 相关的 `patterns/*.md`、`examples/*` |
| 审阅或截图检查 | `workflows/review.md`、目标平台的 `platforms/<id>.md`、`foundations/baseline.md` | `foundations/taste.md`、产品 `DESIGN.md`、`foundations/content-stress.json` |
| 记录用户反馈 | `foundations/taste.md` | — |
| 新增或修改通用规则 | `foundations/README.md` | `platforms/README.md`、相关的 `foundations/*.md` |
| 新增平台或修改平台文件 | `platforms/README.md` | `decisions/0004-platform-layering.md` |
| 修改设计数值 | `tokens/README.md` | — |
| 新增界面模式 | `patterns/README.md` | 来源页面 |
| 新增参考 | `references/README.md` | — |
| 新增正式素材 | `assets/README.md` | — |
| 接入或升级产品 | `workflows/adopt.md` | `CHANGELOG.md` |
| 记录重要取舍 | `decisions/README.md` | — |

`workflows/implement.md` 和可复用提示词在第三阶段从真实页面中提炼，现在还没有。

## 5. 说清验证到了什么程度

交付界面工作时，三项分开报告，每项写 通过、未通过 或 未检查：

- **功能正确**：操作和数据结果对不对。
- **视觉一致**：实际渲染后，和已采用的规范、认可的示例是否一致。
- **交互可用**：这个平台的主要输入方式、焦点和各种状态能不能走通。

只有实际渲染并看过截图，才能说视觉通过，并写明平台和尺寸。看不到渲染结果就写「未检查」和原因，不要从代码推断。Web 原型不能代替其他平台的验证，每个平台的最终检查都要回到平台文件写明的运行环境。用户要求标成已验证时也一样，要如实记录，可以写「用户决定不做最终验证」。细节见 [审阅流程](workflows/review.md)。

## 6. 修改本库

| 改动 | 规则 |
|---|---|
| 写入明确偏好 | 必须有用户原话和日期，范围不超过原话 |
| 写入推测、待验证 | 可以直接加，写明证据或比较方式 |
| 推测或待验证项转为明确偏好 | 必须由用户确认 |
| 新规则或规则升级 | 按 `foundations/README.md` 的分层、格式和状态条件。只在一类平台上验证过的规则放平台文件，不放通用层；用户决定提前放入时，也按那里的说明写 |
| 平台文件 | 只写事实、要求和检查项，并写明来源。没有校准依据时不写视觉规范 |
| 设计数值 | 只改 `tokens/katachi.tokens.json`，再运行生成脚本；不要手改 `tokens/build/`；文档只写 token 名，不复制数值 |
| 参考和素材 | 产品默认只用 `assets/` 中已登记授权的素材，`references/` 里的内容不进入产品。用户决定破例时按第 2 节处理 |
| 产品项目里的本库 | 子模块只读，不要改，也不要自行升级版本。用户要求改本库时，到本库自己的仓库里改 |
| 远程操作 | 没有要求时，不要推送或发布 |

修改后运行 `node scripts/check.mjs`。
