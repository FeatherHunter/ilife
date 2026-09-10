---
'skill-calorie': patch
---

S1 发布包必崩回放：dist 引用的 `base-paint/blocks` 子路径在 registry base-paint@0.2.0 的 exports 里不存在（0.2.0 发布于 #104 blocks 落盘约 1 小时前），干净安装必崩 ERR_PACKAGE_PATH_NOT_EXPORTED，而仓内 link 与 G3 全工作区 tarball 安装全绿。修复由 base-paint 侧新版本携带 `./blocks` 导出随联动发版解决（本包 range 经 updateInternalDependencies 自动跟住）；本票新增发布包体干净安装冒烟门 `test/publish-tarball-smoke.test.mjs`（dist 子路径→exports 静态全覆盖＋双 tarball 隔离安装跑 calorie.help.center 断言 exit 0），源码零改动。
