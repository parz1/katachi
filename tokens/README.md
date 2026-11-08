# Tokens

设计数值的唯一来源，格式是 [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/)。文档只写 token 名，不复制数值。

## 怎么用

- **Web**：引用 [build/tokens.css](build/tokens.css)。`constraint.target.web-min` 对应 `--constraint-target-web-min`。部署时拿不到这个文件，就把整个文件复制进产品，不手改，并在旁边写明来自 katachi 的哪个提交。
- **断点**：媒体查询读不了 CSS 变量，可以写数字，旁边注释 token 名。`constraint.window.*` 只在 JSON 里，不在 CSS 里。
- **其他平台**：读 [katachi.tokens.json](katachi.tokens.json)，按 `$extensions` 里 `local.katachi.platforms` 筛选。没写 `platforms` 表示所有平台。没有生成器，第一个项目接入时再加。

## 有什么

| 分组 | 内容 | 状态 | 怎么对待 |
|---|---|---|---|
| `constraint` | 标准和平台规范给出的下限 | standard | 遵守 |
| `type` | [排版](../standards/typography.md)的字体、字号、行高、字重和行长 | 日文字体 `type.family.ja` adopted，其余 draft | 默认照用；draft 的还是提案，用到时说明 |
| `color` | [颜色](../standards/color.md)的 12 级色阶和指向它们的角色，每一级都有浅色和深色两个值 | 色阶和 `color.control` adopted，其余角色 draft | 样式里只写角色；draft 的角色还是提案，用到时说明 |
| `space`、`size` | [间距和形状](../standards/space.md)的阶梯、角色和控件高度；勾选框和多行输入的尺寸见[控件](../standards/controls.md) | draft | 样式里只写角色，用 `data-density` 换疏密；默认照用，说明这是提案 |
| `radius`、`stroke` | [间距和形状](../standards/space.md)的圆角和描边 | `radius` adopted，默认用大的；`stroke` draft | 用 `data-radius` 整体换圆角；`stroke` 还是提案，用到时说明 |

动效和阴影还没有。需要时怎么办，见 [DESIGN.md](../DESIGN.md) 的「没定的」。

修改数值的步骤见 [tools/README.md](../tools/README.md)。
