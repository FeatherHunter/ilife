---
'base-paint': patch
---

fix(693): HELP 页面的复制提示落不到视口底部

共享 HELP 模板里，提示栈的定位样式按类名 `.hm-toast-stack` 下发（`position:fixed`／底部锚点／居中／
`z-index:9999`），而运行时创建栈元素时只写了 `id`——选择器与元素对不上，定位从未生效：短页提示落在首屏之外，
长页滚到底被固定底栏压住，只剩一点黑边。修法是让运行时给栈元素补上定位样式所用的类名（`id` 保留做兼容）；
同源的减动效归零条 `.hm-toast-stack .hm-toast{transition:none}` 也随之按设计生效（提示仍即时可见）。

读数为：新用例 6/6 绿（`packages/base-render/test/help-toast-stack-693.test.mjs`）、
变异自证红 3 绿 3 且模板逐字还原、六家消费面 40/40 绿、生成管线 `--check` 不漂移。
生成物随模板重跑 `gen:help-shell` 派生（后缀哈希 `b2304de5… → 6f1bf697…`）。
