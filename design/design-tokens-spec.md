# Design Token 规范

## 颜色

```css
:root {
  --color-bg: #f7f9fc;
  --color-surface: #ffffff;
  --color-surface-muted: #f4f7fb;
  --color-surface-hover: #eef4ff;
  --color-border: #d8e0ea;
  --color-border-strong: #c9d4e4;
  --color-text: #101828;
  --color-text-muted: #667085;
  --color-text-subtle: #98a2b3;
  --color-primary: #0f6cbd;
  --color-primary-hover: #0a5eb8;
  --color-primary-pressed: #084f9d;
  --color-success: #1fa463;
  --color-warning: #c17700;
  --color-danger: #d13438;
  --color-focus: #0f6cbd;
}
```

## 间距

```css
:root {
  --space-2: 2px;
  --space-4: 4px;
  --space-6: 6px;
  --space-8: 8px;
  --space-10: 10px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;
  --space-40: 40px;
}
```

## 字体

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI", "PingFang SC", Arial, sans-serif;
  --font-mono: Consolas, "SFMono-Regular", Menlo, monospace;
}
```

字体层级：

| Token | Size | Line height | Weight | 用途 |
| --- | --- | --- | --- | --- |
| `--text-xs` | 12px | 16px | 400 | 辅助信息 |
| `--text-sm` | 13px | 18px | 400 | 表格、状态 |
| `--text-md` | 14px | 20px | 400 | 默认正文 |
| `--text-lg` | 16px | 24px | 600 | 卡片标题 |
| `--text-xl` | 20px | 28px | 700 | 页面标题 |
| `--text-2xl` | 24px | 32px | 700 | 大区块标题 |

```css
:root {
  --text-xs: 12px;
  --text-sm: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --line-xs: 16px;
  --line-sm: 18px;
  --line-md: 20px;
  --line-lg: 24px;
  --line-xl: 28px;
  --line-2xl: 32px;
}
```

## 圆角

```css
:root {
  --radius-4: 4px;
  --radius-6: 6px;
  --radius-8: 8px;
  --radius-10: 10px;
  --radius-window: 10px;
}
```

规则：
- 卡片不超过 8px，除非是窗口或大弹窗。
- 按钮和输入框使用 7px 或 8px。
- 小 badge/chip 使用 6px。

## 阴影

```css
:root {
  --shadow-none: none;
  --shadow-panel: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-popover: 0 12px 24px rgba(49, 81, 121, 0.16);
  --shadow-window: 0 18px 48px rgba(49, 81, 121, 0.18);
}
```

## 尺寸

```css
:root {
  --titlebar-height-win: 32px;
  --titlebar-height-mac: 38px;
  --sidebar-width: 180px;
  --sidebar-width-compact: 148px;
  --statusbar-height: 32px;
  --control-height-sm: 28px;
  --control-height-md: 34px;
  --control-height-lg: 40px;
  --right-rail-width: 320px;
}
```

## 动画

```css
:root {
  --duration-fast: 120ms;
  --duration-normal: 180ms;
  --duration-slow: 240ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
}
```

使用规则：
- hover/focus 使用 `--duration-fast`。
- 弹窗和菜单使用 `--duration-normal`。
- 进度条变化允许 `--duration-slow`。
- 不做大幅位移动画。

## Z-index

```css
:root {
  --z-base: 0;
  --z-sticky: 10;
  --z-dropdown: 100;
  --z-dialog: 200;
  --z-toast: 300;
}
```

## 状态映射

| 状态 | 颜色 |
| --- | --- |
| waiting | `--color-text-muted` |
| downloading | `--color-primary` |
| processing | `#5b5fc7` |
| paused | `--color-text-muted` |
| completed | `--color-success` |
| failed | `--color-danger` |
| warning | `--color-warning` |
