# adaptive 折叠屏与自适应

处理运行时的尺寸变化，和 web、desktop、mobile 叠加使用。

## 能力

- 单位：Android 用 dp，Web 用 CSS px。
- 显示：可用窗口会在运行时变化，比如折叠和展开、旋转、分屏、缩放窗口。可用窗口不等于设备屏幕。折叠屏可能有铰链，半开时分成两个区域。
- 输入：触摸为主；屏幕变大或外接设备时可能有键盘和指针。
- 场景：同一个任务可能折叠时开始、展开后继续。半开时可能放在桌上（桌面式，铰链水平），也可能像书一样拿着（书本式，铰链垂直）。

## 平台要求

- 窗口尺寸类：宽度分界是 `constraint.window.width-medium-min`、`constraint.window.width-expanded-min`、`constraint.window.width-large-min`、`constraint.window.width-extra-large-min`；高度分界是 `constraint.window.height-medium-min`、`constraint.window.height-expanded-min`。按可用窗口判断，不按设备类型判断。依据 [Android：Use window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)。
- 控件不要放得离分隔两个区域的铰链太近，那里不容易点到。依据 [Android：Make your app fold aware](https://developer.android.com/develop/adaptive-apps/guides/foldables/make-your-app-fold-aware)。
- 尺寸变化时内容和功能不丢失，用户的状态保留。重要内容避开折痕和铰链。
- 内容压力测试要在每个用到的尺寸类上都做一遍。
- Web 的 [Viewport Segments API](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API) 还是实验特性，支持有限，只能用作增强，不支持时页面也要正常工作。

## 必查

- 每个用到的宽度尺寸类的分界宽度。
- 来回折叠、展开和分屏：滚动位置、输入内容和当前选择都不丢失。
- 桌面式和书本式姿态下，铰链位置没有重要内容（产品支持时）。
- 宽度中等但高度很小的窗口，比如手机横屏。

## 验证

- 先用什么查：Web 用浏览器调窗口宽度；原生用可折叠模拟器。这样查不出铰链的实际手感。
- 最终验证：原生应用用折叠屏真机。响应式网页回到目标浏览器，不要求真机。
