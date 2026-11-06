# terminal 终端

包括逐行输出的命令行工具（CLI）和全屏文本界面（TUI）。开始前先确定是哪一种，两者的检查不完全相同。

## 能力

- 单位：字符单元（列和行）。常见的默认窗口是 `constraint.terminal.columns-default` 列 × `constraint.terminal.rows-default` 行，用户可以改变。
- 显示：字体、字号和配色由用户决定；颜色能力从无色到 24 位色不等；通常没有图片。中日韩字符和多数 emoji 通常占 2 列，部分符号的宽度取决于环境。[UAX #11](https://www.unicode.org/reports/tr11/) 给出字符的宽窄分类，但不直接规定终端列宽，要以实际终端为准。
- 输入：键盘为主，鼠标不一定可用。
- 场景：输出可能通过管道或重定向交给其他程序；可能通过 SSH 运行。

## 平台要求

- 配色由用户决定，无法保证具体的对比度，`constraint.contrast` 的数值不能直接检查。不要假设背景是深色还是浅色，两种主题都要看。
- 不用颜色也要能用。`NO_COLOR` 有非空值、`TERM=dumb` 或传入 `--no-color` 时关闭颜色。依据 [no-color.org](https://no-color.org/)、[clig.dev](https://clig.dev/)。
- 所有操作都用键盘完成。全屏界面要让用户知道当前的光标或选中位置。
- 目标尺寸不适用，终端里没有点击目标。支持鼠标时，点击区域按字符单元另外说明。
- 窗口变窄时内容不丢失。表格放不下时可以把单元格拆成多行。依据 clig.dev。
- 输出不是终端时不显示动画，也不输出颜色。依据 clig.dev。
- 按显示列宽对齐和截断，不按字符数。
- 机器可读：人类友好的排版会妨碍脚本时，提供 `--plain` 或 `--json`。依据 clig.dev。
- 读屏：CLI 的输出对读屏来说没有结构。依据 [Accessibility of Command Line Interfaces](https://research.google/pubs/accessibility-of-command-line-interfaces/)（CHI 2021）：
  - 表格和长输出要能转成其他格式，比如 CSV、HTML 或文本。
  - 所有命令都要有状态或进度反馈，进度不能只靠 ASCII 动画或非 ASCII 字符表示。
  - 错误信息读出来也要听得懂。
  - 文档不能只存在于终端里。

## 必查

- 默认列宽和更窄的窗口，以及运行时调整窗口。
- 浅色和深色主题；设置 `NO_COLOR` 后。
- 管道输出：没有颜色、动画和控制字符。
- 中文、英文、混排和 emoji 的对齐和截断，用 [content-stress.json](../examples/content-stress.json)。
- 表格和长输出的机器可读格式。
- 读屏走一遍。做不到就列入「未覆盖」。

## 验证

- 先用什么查：在真实终端模拟器里运行并截图。只看输出文本不算视觉验证。
- 最终验证：目标用户常用的终端和系统，包括 SSH 连接。不同终端对宽字符和颜色的处理不一样。
