/** 正文栈唯一真相源（局部 CSS 常量，**不是** token：不新增 token 名，D-5 纪律）。
 *
 * 谁在用（写得出哪两处在用）：**help 模板**（`src/style.ts` 的 `helpShell` 区，`.ilife-help-shell` 基座）
 *  与**共享页面模板**（`src/blocks.ts` 的 `pageShell` 区，`body` 基座）。
 *  此前这份栈只写在 `style.ts` 里一处、只有 help 模板用；#179 给共享页面模板补文档级字体基座时出现**第二个用法**
 *  → 按结构标准的「共用件从第二个用法里长出来」抽到这里，两处都引它（禁各抄一份）。
 *
 * 取值口径：B1 `docs/research/benchmark-visual-spec.md:105`（`body`）＋ #89 返修把
 *  `"SF Pro Display"` 提到首位、尾部补 `"Noto Sans SC"`（修 computed 回落到系统的实测）。
 *  等宽栈不在此列（各产出器自己的 `"SF Mono", monospace` 原样保留）。 */
export const BODY_FONT_STACK: string =
  '"SF Pro Display", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
