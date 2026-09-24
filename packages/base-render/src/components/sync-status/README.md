# sync-status · 同步状态

**一句话**：一页里「跟外面那套东西对上没有」—— 每个目标一行（**名字 ／ 方向 · 最近一次时间 · 这一趟的读数 ／ 结果徽标**），**失败那一行必带「原因」与「怎么修」**，底下带一枚「同步一次」。

**形态**：本件只落地**形态 B「带『同步一次』动作」**——出处＝原型墙 `.scratch/ui-组件墙/parts-11-加量池.mjs` 的 `.c-p3-run`（2026-09 用户裁定落地的那一形态），按层规重写（原型是一次性代码：按钮没有运行时、没有错误行、读的是墙稿变量）。
形态键住 `SYNC_STATUS_FORMS` 闭集（今天只有 `run` 一格）。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 「本地跟远端／外部那套**对上没有**」＋ 一个重试入口 | **本件** |
| 一件刚做完的事的回执（写入 3 条／已撤销） | `toast`（提示条） |
| 一条流水线走到了第几步 | `step-flow`（步骤条，未落地） |

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `targets` | `SyncStatusTarget[]` | 必填 | 要跟外面那套东西对上的目标（下面几行走同一张表：`targets[].x`）。空数组 ⇒ 出空态 |
| `targets[].name` | `string` | 必填 | 目标名（「飞书多维表」）。**非空** |
| `targets[].result` | `'ok' \| 'failed' \| 'pending'` | 必填 | 结果（闭集）；**`failed` 必带 `reason` 与 `fix`** |
| `targets[].direction` | `string` | — | 方向（「双向」／「推送」／「上传」） |
| `targets[].lastAt` | `string` | — | 最近一次的时间（「09-25 20:14」）；不给＝这一段不出 |
| `targets[].detail` | `string` | — | 这一趟的读数（「用时 1.2 秒」／「3 条未上」／「14.6 MB」） |
| `targets[].status` | `string` | — | 徽标上的**短话**（「动作名缺失」）；记号仍按结果给，所以不会只剩一个色 |
| `targets[].reason` | `string` | 必填（`failed`） | 失败的原因 |
| `targets[].fix` | `string` | 必填（`failed`） | 怎么修（下一步敲什么） |
| `checkedAt` | `string` | — | 汇总句里的「最后检查」（「09-25 20:14」）；共几个目标与几个失败由本件算 |
| `hint` | `string` | — | 按钮旁那句说明：**按下去会发生什么**（不是「点击同步」这种废话） |
| `actionLabel` | `string` | `'同步一次'` | 按钮上的字 |
| `id` | `string` | — | 页面锚点，**也是错误行 id 的前缀**（`<id>-error`）；一页多个时务必给 |
| `form` | `'run'` | `'run'` | 形态键（闭集；闭集外一律 `badInput`） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

## 契约与不变量（判据逐条断）

1. **失败行说不出「原因」与「怎么修」就是错的**：`result: 'failed'` 而少给 `reason`／`fix` 一律 `badInput`（这一件存在的理由就是这两句）。
2. **徽标永远是「记号 ＋ 字」**：`✓ 已同步`／`✗ 失败`／`○ 待运行`；`status` 只换字、不换记号 ⇒ **色不是唯一信息**（换到墨黑强调的皮肤，成败照样读得出）。
3. **按钮的宽度不跳版**：两枚字（「同步一次」／「同步中…」）**占同一格**，按钮宽度取宽者；换的是字，不是尺寸。
4. **不许卡在「同步中…」**：`SYNC_STATUS_RUN_TIMEOUT_MS`（15 秒）没等到 `SYNC_STATUS_EVENT_DONE` ⇒ 自动出错误行。
5. **错误行写在控件旁边**，不是页角：它在按钮那一排的下一行，且运行时把按钮的 `aria-describedby` 指过去（不只染色）。
6. **触控目标 ≥ `SYNC_STATUS_TOUCH_PX`（44px）**：按钮 `min-height: 44px`；`:focus-visible` 给 2px 可见焦点；`:disabled` 有 `cursor: not-allowed`。
7. **窄宽两档容器驱动**：窄档两行（名字＋徽标／时间），宽档一行三列（名字／时间／徽标）；判的是**本件自己的宽度**（`@container`，阈值 `SYNC_STATUS_NARROW_PX`），不是视口宽度。
8. **零阴影下层次仍在**：行间发丝线、失败行靠**左竖条 ＋ 软底**、按钮靠**一圈实色边**。
9. **`id` 只许像 id**：`^[A-Za-z][A-Za-z0-9_:.-]*$`，防它把 `aria-describedby` 指到一个非法值上。

## 运行时段怎么接（调用方要做的两件事）

```js
// ① 页面挂样式与运行时段（与其它件同一槽）
// ② 监听「按了同步一次」，跑完后在**同一个根元素**上回话：
document.addEventListener('ilife:sync-run', (e) => {
  const root = e.target;                    // e.target 就是这件自己的根元素
  sync().then(
    () => root.dispatchEvent(new CustomEvent('ilife:sync-done', { detail: { ok: true } })),
    (err) => root.dispatchEvent(new CustomEvent('ilife:sync-done', { detail: { ok: false, message: String(err.message) } })),
  );
});
```

## 常见错法

- 失败只染一个红点 —— 读者知道坏了，不知道坏在哪、下一步敲什么；
- 把「同步中…」换成一段更宽的字 —— 按钮尺寸一跳，读者以为页面重排了；
- 让按钮一直停在「同步中…」（没设超时）—— 卡住没人知道；
- 一页放两个本件而都不给 `id` —— 两处 `aria-describedby` 撞车，指到别人家；
- 拿本件当「一条操作的回执」用：那是 `toast`。

## 关系

- 用在哪：备忘录（飞书多维表）／卡路里（训记）／记账（备份）。
- 样式由页面按需挂 `syncStatusCss()`；运行时段由页面把 `buildSyncStatusJs()` 拼进共享 helpers 槽（加法式：不调它，标记照常可读，只是按不动）。
- 本件不带业务逻辑：真的同步是调用方的事，本件只管**读得出状态**与**一个重试入口**。
