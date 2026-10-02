---
"dsh-life-pack": patch
---

fix(990): 新桌面端「浏览文件夹」两处宿主契约漂移一次对齐（旧宿主行为不变）

- 家目录 `list()` 零参被新宿主客户端按参数个数拦下（`expected 1 business
  argument(s)…got 0`）时，补一个显式 `undefined` 重试（描述符接受
  `undefined`，服务端即回家）；旧宿主仍零参一次，不多传。
- 组合只服务 `native` 时 `list` 被拒不再带旧回执码的形态下，按人话能力句式
  同样判被拒并换系统对话框（旧码形态回归不断）。
