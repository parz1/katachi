# mobile 手机

## 能力

- 单位：iOS 用 pt，Android 用 dp。
- 显示：屏幕小；有安全区和系统手势区；系统字号可调；可能横竖屏切换。
- 输入：触摸为主；软键盘会遮挡内容。
- 场景：常常单手、短时间使用，网络可能不稳定。

## 平台要求

- BASE-4：读屏（VoiceOver、TalkBack）的顺序和标签正确，主要流程不依赖只有部分用户能做的手势。
- BASE-5：iOS 默认用 `constraint.target.ios-default`，不低于 `constraint.target.ios-min`。Android 不低于 `constraint.target.android-min`。依据 Apple HIG（Accessibility）和 Android Developers（Make apps more accessible）。
- BASE-6：支持系统字号设置，最大字号时内容和功能不丢失。

## 必查

- 软键盘弹出时，输入框和主要操作不被遮挡。
- 最大系统字号。
- 读屏走完主要流程。
- 弱网和断网。
- 横竖屏（产品支持时）。

## 验证

- 先用什么查：模拟器，可查布局和流程。Web 原型只能验证结构和内容。
- 最终验证：真机。手感和性能只能在真机上确认。
