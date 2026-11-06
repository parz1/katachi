# Tokens

设计数值的唯一来源，格式是 [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/)。文档只写 token 名，不复制数值。

## 怎么用

- **Web**：引用 [build/tokens.css](build/tokens.css)。`object.radius.bar` 对应 `--object-radius-bar`。部署时拿不到这个文件，就把整个文件复制进产品，不手改，并在旁边写明来自 katachi 的哪个提交。
- **断点**：媒体查询读不了 CSS 变量，可以写数字，旁边注释 token 名。`constraint.window.*` 只在 JSON 里，不在 CSS 里。
- **其他平台**：读 [katachi.tokens.json](katachi.tokens.json)，按 `$extensions` 里 `local.katachi.platforms` 筛选。没写 `platforms` 表示所有平台。没有生成器，第一个项目接入时再加。

## 有什么

| 分组 | 内容 | 状态 | 怎么对待 |
|---|---|---|---|
| `constraint` | 标准和平台规范给出的下限 | standard | 遵守 |
| `interaction` | [交互规范](../standards/interaction.md)里的时长和阈值，来自 Kotolog，加载延迟是提案 | draft | 默认照用 |
| `object` | [条卡页窗](../patterns/object-forms.md)的尺寸、圆角和动效，来自 Kotolog 的原型 | draft | 用这个模式时用 |

颜色、字体和间距还没有，正在[样例页](../examples/sample/README.md)上比较 3 个方向。需要时怎么办，见 [DESIGN.md](../DESIGN.md) 的「没定的」。

修改数值的步骤见 [tools/README.md](../tools/README.md)。
