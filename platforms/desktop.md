# desktop 桌面应用

## 能力

- 单位：macOS 用 pt，Windows 用 epx，Linux 取决于界面工具包。
- 显示：窗口可以任意缩放，可能有多个窗口，可能跨缩放比例不同的显示器。
- 输入：指针和键盘为主，部分设备有触摸屏。
- 场景：常常长时间使用；用户期待系统的菜单、快捷键和窗口行为。

## 平台要求

- BASE-4：所有操作都能用键盘完成；焦点顺序符合操作顺序；菜单和快捷键遵守系统习惯。
- BASE-5：macOS 默认用 `constraint.target.macos-default`，不低于 `constraint.target.macos-min`。Windows 的触摸目标按 `constraint.target.windows-touch`。依据 Apple HIG（Accessibility）和 Microsoft 的 [Targeting 指南](https://learn.microsoft.com/en-us/windows/apps/develop/input/guidelines-for-targeting)。Linux 还没有核对具体数值。
- BASE-6：缩小到产品支持的最小窗口时，内容和功能不丢失；系统字号或显示缩放变化时布局不坏。

## 必查

- 最小窗口和最大窗口。
- 菜单、快捷键和窗口行为是否符合每个目标系统的习惯。
- 只用键盘走完主要流程。
- 系统的明暗、高对比度和减少动态设置。

## 验证

- 先用什么查：开发构建。Web 原型只能验证结构和内容。
- 最终验证：每个目标操作系统的原生运行环境。
