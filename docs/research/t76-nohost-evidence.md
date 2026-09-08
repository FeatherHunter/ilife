# #76 无宿主可执行证据（自包含 `file://` 页面）

> 本文由 `docs/research/t76-nohost-evidence.mjs` 生成（可复跑、无时间戳）。**A2 的主证据**（FX-76-4）；仓内 HTTP 夹具为补充。
> `pnpm build && node docs/research/t76-nohost-evidence.mjs --out docs/research/t76-nohost-evidence.md`
> 复跑后（同机同浏览器）`git diff` 应为空；换机器时**浏览器路径**与**`innerWidth`**两处会不同（环境属性，非结论）。

## 0. 结论

| 指标 | 值 |
|---|---|
| 断言总数 | 44 |
| 通过 | 44 |
| 失败 | 0 |
| 浏览器 | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| 打开方式 | `file://` 直开，**零 HTTP 服务**（页面写在 OS 临时目录） |
| 页面构成 | 4 个经典 `<script>`（环境桩 1 ＋ helpers ×2 ＋ 探针 1）／零 `import`／零 `type="module"`／零宿主注入 |

## 1. 页面自包含性（静态核验，不需要浏览器）

| 核验项 | 实测 |
|---|---|
| `<script>` 个数（应为 4） | 4 |
| `type="module"` 个数（应为 0） | 0 |
| `import` 出现次数（应为 0） | 0 |
| `http(s)://` 出现次数（应为 0） | 0 |
| 宿主全局注入 `window.__`／`globalThis.`（应为 0） | 0 |
| 标记内联事件处理器 `/\son[a-z]+\s*=/gi`（应为 0） | 0 |

## 2. `file://` 直开回读（headless，宽视口 `--window-size=1200,800`）

```json
{"actionIds":["ilife-demo-open","ilife-copy-data","ilife-copy-log","ilife-error-copy-data","ilife-error-copy-log"],"dataT":"DATA-TEXT","badgeText":"失败","emptyText":"暂无数据","emptyHint":"先添加一条","receiptButtons":3,"staticToastRole":"status","staticToastAriaLive":"polite","staticToastDataMax":"5","staticToastCloseLabel":"✓ 知道了","inlineAttrs":0,"markerCount":1,"clicks":7,"helpersStackCount":5,"helpersFeedbackText":"复制失败","helpersDetailText":"长按选择文本手动复制","helpersCloseLabel":"✓ 知道了","helpersAfterClose":4,"matchesMobile":false,"innerWidth":1178}
```

窄视口 `--window-size=390,844`：

```json
{"actionIds":["ilife-demo-open","ilife-copy-data","ilife-copy-log","ilife-error-copy-data","ilife-error-copy-log"],"dataT":"DATA-TEXT","badgeText":"失败","emptyText":"暂无数据","emptyHint":"先添加一条","receiptButtons":3,"staticToastRole":"status","staticToastAriaLive":"polite","staticToastDataMax":"5","staticToastCloseLabel":"✓ 知道了","inlineAttrs":0,"markerCount":1,"clicks":7,"helpersStackCount":3,"helpersFeedbackText":"复制失败","helpersDetailText":"长按选择文本手动复制","helpersCloseLabel":"✓ 知道了","helpersAfterClose":2,"matchesMobile":true,"innerWidth":512}
```

## 3. 视口收窄（同一页面、同一份产出，只改视口）

| 视口 | `--window-size` | `innerWidth` | `matchMedia(≤820px)` | 反馈栈条数 |
|---|---|---|---|---|
| 窄（手机） | `390,844` | 512 | true | **3** |
| 宽（桌面） | `1200,800` | 1178 | false | **5** |

冻结常量：`TOAST_DEFAULTS.maxStack = 5`／`mobileMaxStack = 3`／`mobileMaxPx = 820`。
**口径（FX-76-2 总架构师裁定）**：「≤820px 收窄为 3」是**页面运行时行为**，不是模块行为——
`createToastController` 保持宿主无关（AC-7 不变），收窄由 helpers JS 产出文本读 `matchMedia` 承担。

## 4. 模块侧运行时（同一 dist 产物，Node 侧纯端口，无 DOM）

```json
{"ok":{"ok":true,"channel":"fallback"},"empty":{"ok":false,"channel":null,"reason":"empty"},"clipboardReject":{"ok":true,"channel":"fallback"},"fallbackFalse":{"ok":false,"channel":null,"reason":"fallback-failed"},"fallbackThrew":{"ok":false,"channel":null,"reason":"fallback-threw"},"badgeAlwaysOn":2,"bindSubscriptions":["ilife-copy-data","ilife-demo-open"],"bindFallback":["DATA-TEXT"],"bindAfterDispose":0,"stackBefore":2,"stackAfter":0}
```

## 5. 断言逐条

| # | 断言 | 结论 | 说明 |
|---|---|---|---|
| 1 | 页面只有 4 个经典 <script>（环境桩 1 ＋ helpers 2 ＋ 探针 1） | **过** | 实测 4 |
| 2 | 零 type="module"（经典 script 作用域） | **过** | 实测 0 |
| 3 | 零 import（不依赖任何模块加载器） | **过** | 实测 0 |
| 4 | 零 http(s) 引用（可 file:// 直开） | **过** | 实测 0 |
| 5 | 页面标记零宿主全局注入（window.__／globalThis.） | **过** | 实测 0 |
| 6 | 产出标记零内联事件处理器（/\son[a-z]+\s*=/gi） | **过** | 实测 0 |
| 7 | 页面不含包名字样（不依赖包解析） | **过** |  |
| 8 | 前置：helpers 产出文本确实含 DOM 读取（否则幂等／反馈断言无鉴别力） | **过** |  |
| 9 | 页面内 ACTION_ID_ATTR 集合与产出逐字一致 | **过** | 实测 "ilife-demo-open,ilife-copy-data,ilife-copy-log,ilife-error-copy-data,ilife-error-copy-log"，期望 "ilife-demo-open,ilife-copy-data,ilife-copy-log,ilife-error-copy-data,ilife-error-copy-log" |
| 10 | 渲染期写入的 data-t 可被页面读回 | **过** | 实测 "DATA-TEXT"，期望 "DATA-TEXT" |
| 11 | statusBadge 文本取冻结默认值 | **过** | 实测 "失败"，期望 "失败" |
| 12 | emptyState 文本落到 DOM | **过** | 实测 "暂无数据"，期望 "暂无数据" |
| 13 | emptyState hint 落到 DOM | **过** | 实测 "先添加一条"，期望 "先添加一条" |
| 14 | errorReceipt 渲染 3 个按钮 | **过** | 实测 3，期望 3 |
| 15 | 静态 toast role 取 TOAST_DEFAULTS.role | **过** | 实测 "status"，期望 "status" |
| 16 | 静态 toast aria-live 取 TOAST_DEFAULTS.ariaLive | **过** | 实测 "polite"，期望 "polite" |
| 17 | 静态 toast data-max 取 TOAST_DEFAULTS.maxStack | **过** | 实测 "5"，期望 "5" |
| 18 | 静态 toast 关闭按钮文案与产出逐字一致 | **过** | 实测 "✓ 知道了"，期望 "✓ 知道了" |
| 19 | 真实 DOM 零内联事件处理器属性 | **过** | 实测 0，期望 0 |
| 20 | helpers 注入两次只有一个挂载点标记（幂等只落 DOM） | **过** | 实测 1，期望 1 |
| 21 | 前置：点击次数多于宽容量（才能区分收窄） | **过** | 实测 7，期望 7 |
| 22 | helpers 反馈块的关闭按钮文案与 renderToast 产出一致 | **过** | 实测 "✓ 知道了"，期望 "✓ 知道了" |
| 23 | helpers 反馈文案取冻结文案（ok／fail 二选一，取决于 execCommand 是否可用） | **过** | 实测 "复制失败" |
| 24 | 失败反馈必须带冻结的 failDetail | **过** | 实测 "长按选择文本手动复制" |
| 25 | 关闭按钮移除一条反馈 | **过** | 实测 4，期望 4 |
| 26 | 宽视口：matchMedia(≤820px) 不命中 | **过** | 实测 false，期望 false |
| 27 | 宽视口宽度 > 820 | **过** | 实测 1178 |
| 28 | 宽视口：helpers 反馈栈 = maxStack | **过** | 实测 5，期望 5 |
| 29 | 窄视口：matchMedia(≤820px) 命中 | **过** | 实测 true，期望 true |
| 30 | 窄视口宽度 ≤ 820 | **过** | 实测 512 |
| 31 | 窄视口：helpers 反馈栈收窄为 mobileMaxStack | **过** | 实测 3，期望 3 |
| 32 | 窄视口：helpers 幂等标记唯一 | **过** | 实测 1，期望 1 |
| 33 | 宽窄两档容量不同（否则收窄断言恒真） | **过** | 窄 3 / 宽 5 |
| 34 | copyText 通道 2 成功 | **过** | 实测 "true/fallback"，期望 "true/fallback" |
| 35 | 空串短路 reason='empty' | **过** | 实测 "false/null/empty"，期望 "false/null/empty" |
| 36 | 通道 1 reject → 降级通道 2 | **过** | 实测 "true/fallback"，期望 "true/fallback" |
| 37 | 通道 2 返回假值 → outcome | **过** | 实测 "false/fallback-failed"，期望 "false/fallback-failed" |
| 38 | 通道 2 抛错 → outcome（FX-76-1） | **过** | 实测 "false/fallback-threw"，期望 "false/fallback-threw" |
| 39 | 两条失败（返回假值 ＋ 抛错）都挂了失败徽章 | **过** | 实测 2，期望 2 |
| 40 | bindCopyAction 订阅 listActionIds() 全部 id | **过** | 实测 "ilife-copy-data,ilife-demo-open"，期望 "ilife-copy-data,ilife-demo-open" |
| 41 | bindCopyAction：只复制有 data-t 的按钮 | **过** | 实测 "DATA-TEXT"，期望 "DATA-TEXT" |
| 42 | dispose 解绑全部 | **过** | 实测 0，期望 0 |
| 43 | createToastController 两条已挂载 | **过** | 实测 2，期望 2 |
| 44 | flush 清栈 | **过** | 实测 0，期望 0 |

## 6. 与仓内 HTTP 夹具的关系

- 仓内 `packages/base-render/test/controls.test.mjs` 的夹具用临时 HTTP 源 ＋ `import * as bp from '/index.js'`；
  本页**零 import／零服务**，是「双击打开的独立 HTML」——两者互补：前者进 `pnpm test` 门禁，后者作 A2 主证据。
- 为什么页面里不 `import` 模块：ESM 在 `file://` 下被 CORS 挡死，而 A2 要证的正是「双击打开的独立 HTML」形态。
  页面侧的复制运行时**就是** base-paint 交给页面的 `buildSharedHelpersJs()` 产出（经典 script），本页把它端到端跑通；
  模块侧 API（`copyText`／`bindCopyAction`／`createToastController`）在 §4 用同一份 dist 产物实跑。
- 本页的剪贴板为**页面侧固定 reject 桩**（headless 无用户手势，真实 `writeText` 必 `NotAllowedError`）→ 复制路径确定性走
  `execCommand` 兜底；**真实剪贴板成功路径**与 `writeText` promise 偶发不 settle 属已知限制（见契约 §8.9 台账）。
