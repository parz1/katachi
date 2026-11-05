# 0002 tokens 以 DTCG JSON 为唯一来源，用零依赖脚本生成

- 状态：采用
- 日期：2026-11-05

## 背景

基础数值要机器可读，并且只有一个来源，各平台都可能使用它。目前只有标准和平台规范给出的数值，真正的设计数值要等第三阶段才有。

## 决定

- `tokens/katachi.tokens.json` 是唯一来源，格式为 DTCG Format Module 2025.10。
- `$extensions` 的 `local.katachi` 记录每个 token 的状态和来源。
- `scripts/build-tokens.mjs` 生成 `tokens/build/tokens.css`。生成物提交到仓库，这样不装 Node 的项目也能引用。`scripts/check.mjs` 检查它有没有过期。
- 文档只写 token 名，不复制数值。`scripts/check.mjs` 检查名字是否存在。

## 备选和放弃原因

- **Style Dictionary、Terrazzo**：成熟，但现在只有很少的 token 和一个输出目标，不值得引入依赖和配置。以后可以替换脚本，DTCG 来源文件不用改。
- **以 CSS 变量为来源**：原生项目读不了，也放不下状态和来源这些元数据。
- **只写在 Markdown 里**：机器读不了，也容易和实现不一致。

## 代价

- 脚本只支持基本类型，排版、阴影等组合类型用到时才加。
- 深浅色等模式还没有方案。DTCG 单独提供了 Resolver 模块（sets、modifiers），现在的脚本不支持。

## 什么时候重新考虑

需要第二个输出目标（例如 Swift）或模式支持时，先评估换成 Style Dictionary 或 Terrazzo，不要继续堆脚本。
