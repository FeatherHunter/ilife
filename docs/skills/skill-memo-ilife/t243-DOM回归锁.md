# t243 备忘录 HELP 渲染后 DOM 回归锁

- 票：#243（#228 载荷锁的下一层；复审员 J 真浏览器结论的桩复刻）。
- 改动（仅两件）：新建 `packages/skill-memo-ilife/test/help-dom-243.test.mjs`（4 条 DOM 锁）；`packages/skill-memo-ilife/test/help-file-228.test.mjs` 仅改名恒真断言，语义不动。
- 路：`packages/skill-schedule/test/help-file-202.test.mjs:126` 手写 DOM 桩（只读不改，保真三点照搬）。
- 四判据：①8 域/13 二级组/30 卡数 DOM 节点（`data-key` 与资产 id 集对齐）；②6 步骤卡 `s-n/s-t/s-d` 齐全且 title/desc 逐条 DOM 文本比对；③可见正文 7 类全 0（`memo.`/`--html`/`memo-cmd-read`/脚本路径[`.py`/`.yaml`/`memo_render`/`scenarios.yaml`]/`待开发`（含 `.t-dev` 0）/`无唤醒词`（含 `当前无` 从紧）/HELP 自身唤醒词（只锁 `备忘录 HELP` 形，关于页 `HELP 模板 v4`版本号不在此列）；④`memo_add_basic` 4 个 `input[data-p]` 为锚＋全量 EF 卡键集对齐。
- 变异：`T243_MUTATE=1`（`st.title/desc`→不存在键，载荷段逐字节相同）→新锁红（② `.s-d` 6 变 0），旧式 `HTML.includes` misses=0（恒真仍绿，票面论点）；还原即全绿。
- 机器读数（详见 `.scratch/t243/`，大日志不贴正文）：
  - 基线 15/15 runId=`301b872b`（改名后 `f63669d7`）。
  - 新锁 4/4 runId=`1e3a4e72`。
  - 变异红 3/4 runId=`e1f18eea`；`mutate.mjs` 旧检 misses=0。
  - 全目录 58/58 runId=`c27ceaf4`（Windows 下原目录式被当模块，改等价 glob）。
- 未放宽既有 15 条任一条；新判据只紧不松。以后模板键名一换，门当场红（②先红）。
