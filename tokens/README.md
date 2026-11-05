# Tokens

设计数值的唯一来源。格式遵循 [DTCG Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/)。

| 文件 | 说明 | 能否手改 |
|---|---|---|
| `katachi.tokens.json` | 来源 | 可以 |
| `build/tokens.css` | Web 用的 CSS 变量，只包含适用于 Web 的 token | 不可以，由脚本生成 |

文档里只写 token 名（例如 `constraint.contrast.text`），不复制数值。校验脚本会检查写出的名字是否存在。

## 分层

| 层 | 写什么 | 现状 |
|---|---|---|
| 外部数值 `constraint` | 标准和平台规范给出的数值 | 已有 |
| 通用语义 | 跨平台的语义名，比如主要文字、危险操作 | 第三阶段从真实界面提炼 |
| 平台值 | 语义名在某个平台上的值 | 有真实界面时才加，存放方式见[决策 0004](../decisions/0004-platform-layering.md) |

## 修改步骤

1. 改 `katachi.tokens.json`。
2. 运行 `node scripts/build-tokens.mjs`。
3. 运行 `node scripts/check.mjs`。

## 每个 token 必须有

- `$value`，以及自身或所在分组的 `$type`。
- `$description`：这个数值用来做什么。
- `$extensions` 里的 `local.katachi`，包含 `status` 和 `source`，还可以有 `platforms`：

| status | 含义 | source 写什么 |
|---|---|---|
| standard | 来自外部标准或平台规范 | 标准条款 |
| draft | 探索中使用，用户还没认可 | 探索目录 |
| adopted | 用户认可，用在认可的示例里 | 示例路径和 `taste.md` 条目 |
| validated | 在第二类平台或第二个产品中复用过 | 两处的路径 |

`platforms` 列出适用的平台 ID，也就是 `platforms/` 下的文件名。不写表示所有平台。

## 什么时候加

真实界面用到了才加。不要预先铺满色阶和字号表。

## 各平台怎么用

- **Web**：引用 `build/tokens.css`。
- **其他平台**：读 `katachi.tokens.json`，按 `platforms` 筛选。还没有生成器，第一个项目接入时再加。
- **单位**：`dimension` 只能用 px 或 rem。pt、dp、epx 和终端列数用 `number`，单位写在 `$description` 里。
- **支持的类型**：number、dimension、duration、color、fontFamily、fontWeight、cubicBezier。排版、阴影等组合类型用到时再加到脚本里。
- **深浅色等模式**：还没决定。DTCG 为此单独提供了 Resolver 模块，真正需要时再评估（见[决策 0002](../decisions/0002-tokens-source.md)）。
