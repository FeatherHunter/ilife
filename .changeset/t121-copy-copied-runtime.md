---
'base-paint': minor
---

#121（map #63）：复制按钮「成功态变绿」补上**运行时 JS 半**（H-16 双反馈的按钮通道）。

- `controls.ts` `buildSharedHelpersJs()` 复制反馈路径：`onClick` 把命中的按钮一并传给 `copy()`，三条成功出口（`navigator.clipboard` promise 回调／同步返回／`execCommand` 兜底 `done` 为真）各自调 `markCopied(btn)`——加规格逐字类名 `copied`，**450ms** 后 `removeClass` 回落；**失败路径零调用**（不静默变绿）。冻结签名 `buildSharedHelpersJs(input?)` 不变，仍挂**既有 `boot()`／既有事件委派**，零新增 marker；类名增删走 `className` 字符串（既有 `addClass`／`removeClass`），不引 `classList`／`window.<id>=`／`node:`。
- `style.ts` helpShell 区：HELP 速查台的复制按钮是 `.ilife-help-shell-btn-*`／`.ilife-help-shell-card-copy`，**不含** `.ilife-copy-btn`（#75 的 `.ilife-copy-btn.copied` 命中不到）→ 补 `.ilife-help-shell-btn.copied` 与 `.ilife-help-shell-card-copy.copied`（`border-color`／`background` 取 `--ok`）＋两个复制按钮基座的 450ms 弹簧过渡与 `:active { transform: scale(.96) }`（口径逐字复用 #75 的 `.ilife-copy-btn`）＋ `prefers-reduced-motion` 下归零。零新 token、零新类名（`copied` 为规格逐字、非 `ilife-` 前缀）。
- 测试与证据：`packages/base-render/test/copy-copied-121.test.mjs`（静态跨文件一致性 S1–S4 ＋ 最小 DOM 桩行为面 B1–B6，无浏览器可跑）；`docs/research/t121-browser-evidence.mjs`（headless Chrome ＋ CDP **真手势**：类名 → computed `rgb(52, 199, 89)` → 435ms 回落 → 失败路径不静默变绿 → 真剪贴板回读逐字相等）。报告 `docs/research/t121-copied-runtime.md`。
