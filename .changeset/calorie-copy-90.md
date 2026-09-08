---
'skill-calorie': minor
---

#90（map #63）复制交互走 **Base P0 双通道**：新增 `src/render/copy.ts` 作为唯一接线接缝（页面侧运行时**逐字取** `buildSharedHelpersJs()` 的产出、复制按钮**逐字取** `renderActionBar()`、`actionId` **逐字取** `HELP_COPY_ACTIONS.prompt`），`calorie.help.center` 与 `calorie.help.lookup` 两页**每行加复制按钮**并在页尾注入**一次**页面侧运行时；`cmd_read.ts` 的内联 HELP HTML 收编为 `renderHelpLookupHtml()`。

- **双通道**：`navigator.clipboard` 成功路径 ＋ 失败后 `execCommand` 兜底；两通道皆失败时失败徽章恒在（`ilife-toast-danger`）。
- **技能侧零复制实现**：不新增 `copyText`／`execCommand`／`navigator.clipboard` 调用，不写内联 `onclick`，不自造 `actionId`。
- **证据**：`docs/research/t90-copy-dual-channel.md`（真实 headless Chrome ＋ CDP 真手势真剪贴板回读 5/5；降级路径与双失败路径各一组；5 处变异红→绿；本票 13 用例 ＋ 相关既有 65 用例全绿）。
