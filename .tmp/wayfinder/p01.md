Blocked by: 无

## Question

确认 dsh plugin add 对传递 dependencies 的跟装与激活语义，落定外层装配口径。

事实基线：dsh plugin 是 pnpm 薄转发，add 单品等价 pnpm add，传递依赖落盘是；激活否：reconcile 只扫直接 dependencies，传递的 manager 不进 bundles；pnpm 隔离布局下从 profile 解析不到它。

验收：在真机做单 add 单品负向断言（bundles 无 manager）+ 双 add 正向断言（bundles 双含）；单品 dependencies 保留 manager 作开发兜底；首验文档写单命令双包。
