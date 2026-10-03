# #1075 写入域回执侧 16 页 · 逐格结论

两栏：**机检**（像素差异比，390×844 ／ 1280×720，original＝冻结原型、rebuilt＝真跑产物，阈值 16）与**人眼**（用户看过对照墙后的判断）。
对照墙：`node docs/skills/skill-bill/1075-write-验收墙.mjs .scratch/1075-write-receipt compare-1075-write-16.html`
⇒ 手机墙 `.scratch/1075-write-receipt/compare-1075-write-16.html`（16 格，左＝真跑、右＝冻结原型）、桌面墙 `…-桌面.html`。

**本域判据（票据纸八件套，逐格照着判）**：
1. 复制按钮块居中 ＋ 文本居中 ＋ 两行左缘对齐（内层等宽盒居中＋文本左对齐＋▾ 占位补偿）
2. 复制区下方一律不挂句子
3. 结论句聚合不换行
4. 主数字唯一
5. 落点 LEDGER／占比 SCALE／明细 DETAIL／对账 CHECK
6. 裁切线 ✂ 裁切线
7. 页脚只有场景名
8. ▾ 字面常显、open 不旋转、永不由 CSS 画三角（一个字符都不打）

**判定怎么写**：人眼那栏只写 `ok` 或 `不 ok ＋ 哪一格 ＋ 什么症状`（例：「390 下复制按钮没居中」「结论句折了行」「没有 ✂ 裁切线」）。**判定归用户本人**，本表不预填、不代判；用户没说的格一律留空＝未判。
结论末尾必须写清**看了哪几格**（滚过两张墙后按格数报），没看的不许写 ok。

| # | id | 唤醒词 | 机检 390 | 机检 1280 | 机器面骨架读数 | 人眼判定（留空） | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | x02 | 记支出 | 0.3294 | 0.7441 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 2 | x04 | 记收入 | 0.3452 | 0.7464 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 3 | x06 | 拍账单 | 0.3494 | 0.7437 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 4 | x08 | 批量录入 | 0.3437 | 0.7425 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 5 | x10 | 记退款 | 0.3337 | 0.7462 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 6 | x12 | 记报销 | 0.3473 | 0.7467 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 7 | x14 | 报销到账 | 0.3394 | 0.7503 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 8 | x16 | 记借出 | 0.3512 | 0.7312 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 9 | x18 | 记借入 | 0.3496 | 0.7311 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 10 | x20 | 记收回 | 0.3376 | 0.7486 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 11 | x22 | 记偿还 | 0.3364 | 0.7482 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 12 | x24 | 记分期 | 0.3546 | 0.7277 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 13 | x26 | 记一笔 | 0.3470 | 0.7433 | 族 doc；件套缺 「裁切线／落点」；导航 1；来源脚注 1；undefined/NaN false；lazy false | | |
| 14 | x28 | 改记录 | 0.2797 | 0.0604 | 族 sheet；件套缺 「明细」；导航 0；来源脚注 0；undefined/NaN false；lazy false | | |
| 15 | x30 | 撤销 | 0.2318 | 0.0640 | 族 sheet；件套缺 无；导航 0；来源脚注 0；undefined/NaN false；lazy false | | |
| 16 | x32 | 恢复 | 0.2461 | 0.0664 | 族 sheet；件套缺 无；导航 0；来源脚注 0；undefined/NaN false；lazy false | | |

**机检那一道的读数来源**：`docs/skills/skill-bill/1075-write-复验证据.md` §三／§六／§七；差异比原样落 `.scratch/1075-write-receipt/像素读数.json`。
**这是中间读数**：渲染当刻 `dist/cli/cmd_read.js` sha256 ＝ `aa562494e0c98c20156a3304f1ee476c10824fbd46e93a65c15d0a9c09f782b6`，`packages/base-render/src/**` 正被 #1114 改；#1114 落地后按同一套命令复跑一次，机检两列才算终值。

> 机检与人眼是两件事：像素比对验不了「这页好不好用」，人眼也不替代「同一视口下逐像素相同」。人眼那一道没有用户那一句，本票不许关。
