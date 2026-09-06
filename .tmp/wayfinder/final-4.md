Blocked by: 无

## Question

把占位分配表转定案，在 manager 真机上实测冲突。

事实基线：matt 包探测与注册（deck:map order:60）、各槽位 order、ctx.effect 幂等重试清理、缺席三元渲染。草案 id 与 order 占位，manager 只导航、单品自注册，缺席纯条件渲染显示推荐安装，不轮询。

验收：真机无覆盖、无抖动、无静默 no-op，输出分配表定案。
