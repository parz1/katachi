# 参考

用来学习判断的素材。**这里的内容不能直接进入产品。** 可以用在产品里的素材放在 [assets/](../assets/README.md)。

每条参考一个文件：`references/<slug>.md`，图片放在 `references/images/`。

## 格式

```markdown
---
title: <名称>
source: <URL，或产品名、版本和页面>
retrieved: 2026-11-05
found_by: user
license: unknown-study-only
platform: web
image: images/<slug>.png
---

## 用户的判断

（原话。喜欢什么、不喜欢什么，具体到画面里的哪一部分。）

## Agent 的观察

（可选。未经确认，不算偏好。）

## 相关条目

（foundations/taste.md 里的条目，例如 I-004。）
```

| 字段 | 说明 |
|---|---|
| `found_by` | `user` 表示用户提供；`agent` 表示 AI 找的，用户未必认可 |
| `license` | 具体授权；不清楚就写 `unknown-study-only` |
| `platform` | 可选，这条参考属于哪个平台，写 `platforms/` 里的 ID |
| `image` | 可选 |

## 规则

- 点评要具体到元素。「一屏能看到 20 条，扫读很快」有用，「很干净」没有用。
- 不喜欢的例子和喜欢的一样有价值。
- 只有「用户的判断」能支撑 `taste.md` 的明确偏好。
- 截图版权归原作者，只用于学习。如果要公开本库，先从文件和 Git 历史中移除 `references/images/`。
- 图片压缩到 1 MB 以内。不需要的图不要存，Git 历史不会忘记它们。
