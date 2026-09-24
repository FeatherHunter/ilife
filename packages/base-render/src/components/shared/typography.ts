/** 组件层共用：纸面族的两条**字面栈**（唯一一处定义；**2026-09-25 起没有组件引用它**，见文末一段）。
 *
 *  **逐字照抄原型**（`.scratch/diet-ui-proto/v2-小票.html` 的 `:root`）：
 *   · `PAPER_SANS_STACK` ← 原型 `--sans`：纸上的**字**（标签／名称／备注／小标题／印章）；
 *   · `PAPER_MONO_STACK` ← 原型 `--mono`：纸上的**数**（主数字／分母／账目值／时间／克数／
 *     明细值／刻度行读数／打孔格）。
 *
 *  为什么数字要单独一条栈（2026-09-24 用户两轮图报「数字 0 不是同一个字体」「为什么数字 0 还是不变」）：
 *  原型里**所有数字位都写 `font-family:var(--mono)`**（`.total .n`／`.line .v`／`.item .t,.g,.kcal`／
 *  `.code-row .pct`／`.punch .d,.b.on`），Windows 上命中 **Consolas**——它的 0 带一条斜杠；
 *  上一版只把纸面的**正文**栈按原型排了序（命中雅黑），数字仍继承正文字面 ⇒ 0 是"普通椭圆"。
 *  放大裁剪实测（`.dsh-vision-router` 产物，1200×900 截图按原始像素裁比例）：样张 860 的 0 **带斜杠**，
 *  落地页 860 的 0 是**完整椭圆**——这才是"看起来不是同一个字体"的实况。
 *  所以这里的口径是：**字面的两条栈都照抄原型**——正文归 sans、**数字归 mono**。
 *
 *  纪律：只写栈值本身，不写 `font-family:` 前缀、不带分号（调用方拼进各自的规则里）；
 *  栈里不引用 token（照 `helpShell` 的 `BODY_FONT_STACK` 先例，字面量与 token 名是两回事）。
 *
 *  **现在还有谁在用／为什么留着**（#950 整改，2026-09-25 实测：全仓 `grep PAPER_MONO_STACK|PAPER_SANS_STACK`
 *  只命中本文件与 `docs/base/base-render/单据族组件.md`）：
 *   · **没有任何组件引用这两条栈**——单据族六件（`sheet-frame`／`summary-head`／`scale-bar`／`ledger-rows`／
 *     `entry-rows`／`punch-strip`）已改成经 `skinVar('font-num')`（九处数字位）与 `skinVar('font')`（纸面正文）
 *     读皮肤 ⇒ 它们的字面**随皮肤走**（`paper` 皮肤的 `font-num` 就是下面这条 `--mono` 等宽栈，默认档观感不变）。
 *   · **不删**：① 文档仍按名字引它（上引那份的第七节）；② 它是原型 `--sans`／`--mono` **原序的唯一记录**
 *     （保真轮的对照物），删掉这串顺序就无处可查；③ 删它属于动"别人可能引用的共用位"，不在本次整改范围。
 *   · **值一个字都不许动**：改了它，那些仍靠 `var(--fg)` 一类冻结 token 的老页面基线就跟着动。
 */

/** 正文栈（原型 `--sans`，**顺序不许动**：Windows 上没有前两项 ⇒ 命中 Microsoft YaHei）。 */
export const PAPER_SANS_STACK = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

/** 数字栈（原型 `--mono`，**顺序不许动**：Windows 上没有前四项 ⇒ 命中 Consolas，0 带斜杠）。 */
export const PAPER_MONO_STACK = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
