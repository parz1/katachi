# katachi

我的 UI 设计资产库，名字取自日语「形」（かたち）。这里沉淀审美判断、设计规范、tokens、界面模式、参考和正式素材，供我本人、Claude 和 Codex 在多个产品项目中使用。

它不是组件库，也不是一套现成的风格。这里的每条审美规则，都要能追溯到我对具体方案的真实反应。

> **当前状态：0.0.x 骨架，第一阶段已完成。** 审美还没有校准，现在不能用它决定任何产品的视觉。

## 成熟度

| 内容 | 现状 | 现在能否依赖 |
|---|---|---|
| 审美账本 [foundations/taste.md](foundations/taste.md) | 只有初始需求里的要求和少量推测，没有任何视觉比较结论 | 工作方式可以，视觉判断不行 |
| 标准下限 [foundations/baseline.md](foundations/baseline.md) | 来自 WCAG 和平台规范，视觉示例待补 | 可以 |
| Tokens [tokens/](tokens/README.md) | 只有标准下限，没有颜色、字体、间距 | 只能用于检查下限 |
| 内容压力测试集 [foundations/content-stress.json](foundations/content-stress.json) | 已有，还没在真实页面上用过 | 可以试用 |
| 界面模式 [patterns/](patterns/README.md) | 0 个模式，只有格式和状态清单 | 只能当检查清单 |
| 认可的示例 | 0 个 | — |
| 已接入的产品 | 0 个 | — |

## 怎么用

- **我本人**：用真实页面和方案比较推动它成长。随时查看并修正[审美账本](foundations/taste.md)，里面写错的，以我说的为准。
- **AI agent**：从 [AGENTS.md](AGENTS.md) 或 [CLAUDE.md](CLAUDE.md) 进入，再由 [AGENT_GUIDE.md](AGENT_GUIDE.md) 按任务指向该读的文件。
- **产品项目**：锁定一个版本，把自己的规范和例外写进产品仓库的 `DESIGN.md`。见[接入说明](workflows/adopt.md)。

## 资产的层次

| 层次 | 内容 | 位置 |
|---|---|---|
| 通用基础 | 审美判断、原则、字体、色彩语义、间距、密度、动效、可访问性 | [foundations/](foundations/README.md)、[tokens/](tokens/README.md) |
| 界面模式 | 导航、列表、表单、搜索、详情、弹层、空状态与错误状态 | [patterns/](patterns/README.md) |
| 产品规范 | 每个产品选择自己的布局、密度、组件和平台行为 | 产品仓库的 `DESIGN.md` |
| 技术实现 | Web 和原生可以不同，共享有意义的基础规范 | 产品仓库 |
| 参考 | 用来学习判断，不能直接进入产品 | [references/](references/README.md) |
| 正式素材 | 自有或获准使用，登记来源和授权 | [assets/](assets/README.md) |

流程在 [workflows/](workflows/README.md)，重要取舍在 [decisions/](decisions/README.md)。`explorations/` 和 `examples/` 等到有第一份真实内容时才创建。

## 路线

| 阶段 | 产出 | 完成标准 | 状态 |
|---|---|---|---|
| 1 建立基础 | 这个骨架 | 校验通过；新会话只靠入口文件能找到该读的内容 | 完成 |
| 2 校准审美 | 参考点评、布局比较、视觉方向比较 | 代表性页面的结构和方向由我选定，理由已记录 | 下一步 |
| 3 第一版资产 | 打磨后的页面、最小规范、tokens、模式、提示词、接入示例 | 页面通过三项检查，并得到我的认可 | 未开始 |
| 4 验证复用 | 第二个页面、规则修订、v0.1.0 | 第二个页面只靠本库完成；发现的问题已修订；版本说明写清验证过什么 | 未开始 |

### 最小可用版本（v0.1.0）

**包含**：通过真实比较得到的审美账本；一个代表性页面和一个复用验证页面，都带验证记录；这两个页面实际用到的 tokens 和模式；探索、实现、审阅三份提示词；一份产品接入示例。

**不包含**：组件库、npm 包、发布流水线、多框架适配、文档网站、设计工具同步；没有在真实页面出现过的模式；原生 token 生成器（第一个原生项目接入时再加）。

## 维护

改完就运行：

```bash
node scripts/check.mjs
```

它检查 tokens 是否有效、生成物是否过期，文档里的 token 名和链接是否存在，账本条目是否带证据，参考和素材是否登记来源与授权等。只需要 Node，没有其他依赖。改了校验脚本本身，再运行 `node scripts/check.test.mjs`，确认每条规则真的会报错。

发布版本时：更新 [CHANGELOG.md](CHANGELOG.md)，校验通过后打标签（`git tag -a vX.Y.Z`）。版本号规则见[接入说明](workflows/adopt.md)。

仓库默认私有：`references/` 可能包含版权属于他人的截图，公开前要先处理。
