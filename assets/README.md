# 正式素材

可以用在产品里的素材：自己制作或已获授权的 logo、图标、字体、插图和图片。用来学习判断的参考图放在 [references/](../references/README.md)。

每个文件都必须登记在 `manifest.json`。授权不明的素材不能放在这里。

## 登记字段

`manifest.json` 的 `assets` 数组里，每个素材一项：

| 字段 | 说明 | 例子 |
|---|---|---|
| `path` | 相对 `assets/` 的路径，可以是目录或文件包 | `logos/example.svg` |
| `title` | 名称 | Example 主标志 |
| `source` | `self-made` 或来源 URL | `self-made` |
| `license` | `owned`，或 SPDX 标识等具体授权 | `OFL-1.1` |
| `allowed_use` | 允许怎么用 | 所有产品；或仅限某产品 |
| `added` | 登记日期 | 2026-11-05 |

## 字体

中文字体体积大，授权也更复杂。确实要打包时才放进来，并确认授权允许子集化和再分发。
