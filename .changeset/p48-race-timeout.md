---
"dsh-calorie": patch
---

自家赛跑超时（0.1.5 的 AbortSignal 超时被 Desktop 自研传输忽略，等于废纸）：fetchRead 改 Promise.race + 自家 timer，传输理不理 signal 都 20s 落字；红绿实测（传输永不回包）23s 翻超时错。memo 同构（未发版）。
