# 规范的记录

写给用户看，做界面时不用读。这里记规范的依据，以及还在等用户判断的事。

## 等用户看的提案

Kotolog 没有写，agent 补的。用户看过之后，去掉「提案」两个字，或者改掉。

- 表单提交时才校验，输入过程中不报错。
- 搜索没有结果时写明搜了什么，并给清除的办法。
- 选中除了颜色，还要有粗线或标记这类线索。
- 禁用：永远用不到就隐藏，暂时用不了就禁用并写明原因。
- 加载：`interaction.loading.delay` 内不显示指示。
- 空状态：筛选无结果和没有权限时的写法。

## Kotolog 里不一致的地方

- **归档：** 列表里按 Delete 归档是带撤销的（`use-object-forms.ts`），`ContextWorkspace` 和 `NowLitePage` 里归档却先弹确认框（`confirmActions.tsx`）。规范按“能撤销就不确认”写。
- **骨架屏：** `packages/ui` 里有 `Skeleton`，但产品界面没有用它。规范按“先显示已有内容”写，没有写骨架屏。

## 依据

都在 Kotolog 仓库，提交 `e85c8ba9`。

| 规范里的内容 | 来源 |
|---|---|
| 反馈方式由下一步动作决定，需要处理的不能只放在自动消失的提示里，后台结果不抢焦点 | `docs/ui-library.md`「反馈语义」 |
| 提示和带撤销提示的时长 | `packages/ui/src/components/feedback/FeedbackProvider.tsx` |
| 永久删除的确认写法 | `packages/product-ui/src/components/actions/confirmActions.tsx` |
| 撤销：钉住、清空白板、计划日、记一笔、手机日历改时间 | `use-object-forms.ts`、`NowCaptureLine.tsx`、`docs/product-roadmap.md`（2026-10-12） |
| 就地编辑、自动保存、保存状态、冲突、本地草稿 | `docs/object-forms.md`「平台」，`apps/mobile/src/features/detail/useDetailEditor.ts` |
| 离开前处理未保存内容 | `docs/desktop-object-interaction.md`「交互约定」 |
| 键盘、Esc 一次退一步、⌘B 留给加粗、多选 | `docs/object-forms.md`「桌面」 |
| 拖动、手势和记住来处 | `docs/object-forms.md`「实现要点」「位置与规则」「平台」 |
| 菜单、气泡、对话框的选用 | `packages/ui/README.md`「Overlay and menu architecture」 |
| 改日期在手机上是底部面板，控件不变 | `docs/product-roadmap.md`（2026-10-22） |
| 记一笔、识别结果、搜索 | `docs/object-forms.md`「页面里的用法」 |
| 搜索防抖 | `packages/product-ui/src/components/app-shell/AppCommandPalette.tsx` |

这些是读文档和代码得来的，没有在运行中的 Kotolog 里逐条核对。
