# timer-card · 计时卡

**一句话**：**剩余时间当卡上的主读数**——大数字 ＋ 进度条 ＋ 已过／还剩，底下开始／暂停／重置，并写明"这一锅在等什么"。

## 何时用它（选型四条）

| 你要的 | 用 |
|---|---|
| 要"等一会儿"并在到点时提醒（煸炒 3 分钟／平板支撑 1 分钟） | **本件** |
| 一步一步走、要看出"现在该做哪一步" | `step-flow`（步骤条） |
| 一笔事走到哪个阶段（分期／保修／证件） | `status-row`（状态台账行） |
| 还剩几天（不按分钟算） | `due-row`（到期行） |

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `key` | `string` | 必填 | 机器键（同页唯一；运行时按它派发） |
| `title` | `string` | 必填 | 这一锅／这一组是什么（`第 3 步 · 煸炒五花肉`） |
| `totalSeconds` | `number` | 必填 | 总时长（秒）；`0` ＝ 还没设时长（走空态） |
| `elapsedSeconds` | `number` | `0` | 已过（秒）：必须 ≥0 且 ≤ `totalSeconds` |
| `state` | `'idle' \| 'running' \| 'paused' \| 'done'` | `idle` | 初始状态；`totalSeconds` 为 0 时只许 `idle` |
| `hint` | `string` | — | 一句人话提示（`这一步结束后紧接着下豆豉`） |
| `error` | `string` | — | 错态（`没连上：再试一次`）：写在按钮旁 ＋ `aria-describedby` 指过去 |
| `loading` | `boolean` | `false` | 正在处理：主按钮原地换成「开始中…」（宽度锁住，不跳版） |
| `disabled` | `boolean` | `false` | 整卡禁用（按钮按不动、`cursor:not-allowed`） |
| `absentLine` | `string` | 「还没设时长：先定一个再计时」 | 空态（`totalSeconds = 0`）那句话 |
| `form` | `'card'` | `card` | 形态键（闭集；本件只落地形态 A「卡式大数字」） |
| `extraClass` | `string` | — | 附加类名（空格分隔） |

## 契约与不变量

- **时间只有一个数**：`totalSeconds`。还剩 ＝ `total - elapsed`；`elapsed` 不许超过 `total`（`badInput`）。
  「还剩多少」**归本件算**（它是计时器），而"计时多长时间"由调用方定。
- **状态机**：待开始 → 计时中 ⇄ 已暂停 → 到点了。运行时按 `Date.now()` 记账（不是数 tick），
  标签页被节流也只跳到该在的位置；一个心跳（`TIMER_CARD_TICK_MS`）驱动全页所有计时卡，没有在跑的卡就停表。
- **状态靠「字 ＋ 形 ＋ 色」**：状态字（待开始／计时中／已暂停／到点了）＋ 标签形状
  （底线／实底块／描边空心／双线框）＋ 色。
- **主按钮一枚按状态换字**（开始／暂停／继续／重新开始），另有一颗重置；命中盒 ≥44 高、
  `min-width` 锁住（`TIMER_CARD_BUTTON_MIN_WIDTH_PX`）⇒ 五种字换来换去不跳版。
- **进度条只动 `transform: scaleX()`**（宽度不变、不重排）；`prefers-reduced-motion` 下过渡关掉、读数照走；
  状态不依赖 `transitionend`（读数按时间写）。
- **空态**（`totalSeconds = 0`）：大数字写 `—`（缺值写法）、按钮按不动、卡上写明"还没设时长"。
- **事件**（冒泡 `CustomEvent`）：状态一变来一条 `ilife:timer-state`，到点再来一条 `ilife:timer-done`，
  `detail = { key, state, remainingMs, totalMs }`；运行时幂等（重复注入只绑一次）。
- 窄档由**容器**决定（`@container ilife-timer-card`，断点 `TIMER_CARD_NARROW_MAX_PX`＝420）：窄了按钮各占一整行。

## 常见错法

- 倒计时写在一句话里（「这一锅还要等 1 分 20 秒」）⇒ 大数字当主读数，一眼看得出；
- 只有"开始"没有"暂停／重置"（等过了头只能干瞪眼）⇒ 主按钮按状态换字，另有一颗重置；
- 用数 tick 的方式计时（`setInterval` 里减 1 秒）⇒ 标签页被节流后越走越慢；按到点时刻记账；
- 进度条动 `width` ⇒ 每帧重排；只动 `transform: scaleX()`；
- 把"这一锅在等什么"省掉 ⇒ 提示句是这一件的一半价值（用户回来看屏幕时要知道在等什么）。
