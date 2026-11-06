# 工具

做界面时不用读这里。这里写怎么看、怎么检查、怎么改这个仓库。

这个仓库只放 agent 能直接拿来用的成品。做界面时用不上的，不放进来。原始材料留在原处：Kotolog、claude.ai 和会话记录都不搬，需要时写链接或提交号。

## 产品怎么用

在产品的 `AGENTS.md` 里加一行：

```markdown
做界面前先读 `~/Projects/katachi/DESIGN.md`。这个产品自己的规定（如果有）写在本仓库的 `DESIGN.md`，优先于它。
```

现在只能在本机用：这个仓库还没有远程仓库，其他机器和云端 agent 读不到。

## 查看

```bash
node tools/viewer/serve.mjs
```

打开 `http://localhost:4173`。内容都从仓库文件生成，刷新就是最新的。端口被占用时用 `PORT` 环境变量换一个。改了 `.mjs` 要重启，`app.css` 和 `app.js` 刷新就生效。页面的外观只是中性外壳，不是设计规范。

查看器的写法约定：

- 连续几行只有图片时，排成带说明的图组，说明来自替代文字。图只能来自仓库内部。
- 一段话只有一个指向 `.html` 的链接时，就地运行它，可以切换窗口宽度。不想就地运行，就把链接写在句子里。
- 写成代码样式的 token 名，后面会显示当前的值。

## 检查

```bash
node tools/check.mjs
```

改完内容就运行。改了校验脚本本身，再运行 `node tools/check.test.mjs`。只需要 Node，没有其他依赖。

## 改内容

- **设计被认可之后**：按 [sediment.md](sediment.md)。
- **数值**：改 `tokens/katachi.tokens.json`，运行 `node tools/build-tokens.mjs`，再检查。不要手改 `tokens/build/`。每个 token 要有 `$description`，以及 `$extensions` 里 `local.katachi` 的 `status` 和 `source`；只适用于部分平台时写 `platforms`。`status` 是 standard（来自标准）、draft（用户还没确认）、adopted（用户确认）、validated（第二个产品也用过）。
- **根目录**：只放 `AGENTS.md`、`CLAUDE.md`、`DESIGN.md`、`patterns/`、`examples/`、`tokens/`、`platforms/`、`tools/`。校验脚本会拦住其他东西。
- **入口**：新增的模式和平台都要从 `DESIGN.md` 能找到，新增的示例要从 `examples/README.md` 能找到，否则 agent 看不到。

### 一页模式

放在 `patterns/<名称>.md`，不超过 180 行。能复制的例子放在 `patterns/<名称>/`，来源、认可记录和待判断的事放在同一目录的 `notes.md`。样板是 [object-forms.md](../patterns/object-forms.md)。

```markdown
# <做什么>：<模式名>

- 状态：draft / adopted / validated
- 来源：真实界面或产品文档，带提交或链接

什么时候用，什么时候不用。截图和能复制的例子。

## 规则
## 操作、数值、动效（用到才写）
## 状态（DESIGN.md 里的七种，每行都要回答，没定义也写明）
## 内容（长文本、混排、极端数量时怎么样）
## 平台
## 怎么实现
## 做完检查
## 还没定，别自己决定
```

每一条都写给正在做界面的 agent：「做 X 时这样做」。

### 一个示例

放在 `examples/<产品>-<界面>/README.md`，并加进 `examples/README.md` 的表格。写清来源、认可情况和阶段，再写「学什么」和「别学什么」，最后放截图和能运行的原型。

### 一个平台

放在 `platforms/<id>.md`，并加进 `DESIGN.md` 的表格。标题以 `# <id> ` 开头，包含「能力」（单位、显示、输入、场景）、「平台要求」、「必查」和「验证」（先用什么查、最终验证）。没有人要求时不要主动加平台。
