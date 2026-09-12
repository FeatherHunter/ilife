# #249 三格式菜单开合搬 DOM 的返修（点「复制数据」与「复制日志」换位）

> 票：[#249](https://github.com/FeatherHunter/ilife/issues/249)（`Part of #152`，`bug`）。
> 发现：场景 07 六张页的实拍复核（`.scratch/t152-review/`）。正本改动在 `packages/base-render`。
> 相关：#247（本缺陷由此引入）、#239（复制区组件）。

## 一、现象

点一次「复制数据 ▾」开合器，同一行两颗复制按钮互换位置：「复制数据」跳到右格、「复制日志」跳到左格；
**再点一次收起菜单也不复原**，只有刷新页面才回到原状。凡「数据位出菜单」的行，390／1440 两档 12／12 全中：

```
receipt-set-1440   before=[复制数据 ▾ | 复制日志]  open=[复制日志 | 复制数据 ▾]  closed=[复制日志 | 复制数据 ▾]
                   x: 复制数据@460  复制日志@724  →  复制日志@460  复制数据@724
```

## 二、机制

`src/controls.ts` 页面运行时的 `toggleMenu()` 开分支多了一句搬移：

```js
var wrap = menu.parentNode;
if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(wrap, menu.nextSibling);
```

1. 产出的结构是 `<div class="ilife-copy-menu-wrap">[开合器按钮][菜单]</div>`：菜单是包裹层里最后一个孩子，
   渲染端字符串直拼、前后没有空白文本节点 ⇒ 逐页实测 `menu.nextSibling === null`。
2. `insertBefore(node, null)` 的语义＝插到父节点末尾（等价 `appendChild`）⇒ 包裹层（连按钮带菜单）
   被搬到 `.ilife-action-row-ghost` 的末尾。
3. 这一行是两列等宽网格（`repeat(2, minmax(0, 1fr))`，即 #247「两颗平分整行」那次返修的落法），
   网格按 DOM 序铺格 ⇒ 两颗换位。
4. 收起路径（`closeMenu()` 与 `toggleMenu()` 的收分支）只摘 `copy-menu-open` 类，没有把包裹层搬回去
   ⇒ 换位是终局的。

潜伏缺陷同一处：参考节点取自**另一层**（`menu.nextSibling` 是包裹层内部的孩子，而 `wrap.parentNode`
期待的是自己这一层的孩子）。只因它是 `null` 才侥幸没报错；菜单后头一旦多出一个文本节点，这句会
直接抛 `NotFoundError`。

## 三、根因

开合是**可视态**变化，不是**结构**变化：浮层靠 `position: absolute` ＋ `z-index: 20` 管层叠，
DOM 序＝内容序，网格按序铺格。搬节点既不解决注释里写的遮挡问题（菜单是 `bottom: calc(100% + 8px)`
往上弹，老仓 `.fmt-menu` 同样往上弹），又必然破坏「收起要能回到原状」这条。

对照老仓实物（`卡路里/templates/crud_receipt.html` 的可点版本 `2262fee1~1`）：老仓开合只有
`menu.style.display = 'block' / 'none'` 一句，DOM 一动不动。⇒ 这不是「老仓原样」，是 #247 移植时新加的。

## 四、第二处：窄屏菜单的锚点（同一次返修）

搬 DOM 那笔**顺手把窄屏缺陷挡住了**：窄屏规则是「菜单宽取视口（`calc(100vw - 32px)`）＋右缘贴按钮」，
只在按钮位于**右格**时成立；而复制数据排在复制日志前头，窄屏上它在**左格**。搬移把按钮挪到右格，
菜单于是落在 `x=16`（看着是对的）；把搬移删掉，菜单左缘立刻跑到视口外：

| 页（390 档） | 修前（含搬移）菜单 x | 只删搬移 | 本次落法 |
| --- | --- | --- | --- |
| `seeded-profile-set.html` | 16（按钮已被搬到右格） | **-167**（三项格式名全在视口外） | 16（`left:0; right:0` 落在行盒） |

落法：窄屏把锚点从**包裹层**换成**整行**——行在这一档挂 `position: relative`（`actionBar` 区），
包裹层在这一档 `position: static`（`copyButton` 区），菜单 `left: 0; right: 0; width: auto`。
行盒＝内容宽，按钮在左格还是右格都一样在视口内，且仍是跟着内容滚的绝对定位浮层（不是 `position: fixed`）。
桌面档一个字不动：菜单仍是 200px、右缘贴按钮（用户 2026-09-12 已验收的样子）。

## 五、修法与回归断言

- `src/controls.ts`：删掉那两句搬移，开合只翻 `copy-menu-open` 类 ＋ `aria-expanded`（注释同步改写成
  「只翻可视态、不动 DOM」的理由）。
- `src/style.ts`：上表第四列的窄屏锚点落法（两处：`actionBar` 区的窄屏 `position: relative`、
  `copyButton` 区窄屏档的包裹层／菜单规则）。
- `test/copy-format-menu-247.test.mjs`：
  - **B7**（行为面）：行里放「复制数据（包裹层）＋ 复制日志」，开／收各一次，断言行内子节点序与包裹层
    下标一字不动、菜单仍住在包裹层里（锚点不丢）。把搬移那两句加回去，B7 立刻红（实测：`pass 15 / fail 1`）。
  - DOM 桩的 `insertBefore` 按真 DOM 收严：`null` → 插到末尾；**参考节点不是这个父节点的孩子 → 抛**
    （原先静默退化 `appendChild`，正是它把这次搬移吞成了绿）；桩补 `nextSibling` 取值。
  - **S10**（静态面）：钉住窄屏那份锚点（包裹层 `static`、行 `relative`、菜单 `left/right: 0`、
    `width: auto`、`min-width: 0`、`max-width: none`），并钉住桌面档那一份仍是 `right: 0`／`min-width: 200px`。

## 六、证据

- 行为（headless Chrome ＋ CDP，`file://` 真产物，6 张页 × 390／1440）：`.scratch/t152-review/probe-swap.mjs`
  → 12／12 PASS：行序不变（`wrapIndex 0→0→0`）、菜单恒在上一行 8px（`gapAboveWrap: 8`）、
  桌面贴包裹层右缘（`rightGapToWrap: 0`）／窄屏贴行盒右缘（`rightGapToRow: 0`）、`onTop: true`、
  恒在视口内、开合前后 `docHeight` 相同（不重排整页）。读数：`.scratch/t152-review/probe-swap.report.json`。
- 落点细节：`.scratch/t152-review/probe-menu-place.mjs`（含菜单项目标文字的可视坐标：390 档
  `labelX=35`（修前 -148）、`hintRight=355`）。
- 为什么此前没红：`#247` 的两档实拍只量了**关菜单态**的按钮 x，开放态只量菜单框与 `docHeight`；
  横向溢出那条判据是 `right > innerWidth`，抓不到左侧越界。

## 七、门禁

| 门 | 读数 |
| --- | --- |
| `packages/base-render` 全部测试 | 见下方「本次实跑」 |
| `packages/skill-calorie` 全部测试 | 同上 |
| `node tooling/check-boundaries.mjs` | `boundaries: PASS` |
| `node tooling/skill-html-snapshot.mjs --check` | `OK: 5 技能 HTML 快照 == 实际（186 件产物，changed=0）` |

**本次实跑（2026-09-13）**：`base-render` ＋ `skill-calorie` 两包结果写在交付评论里；
工作树里另有在途会话未提交的 `src/style.ts` 改动（`#152` 返修的菜单项最小高与说明小字对比度），
本票的提交只取本票的段落，不含它。

## 八、交付对账（第五步）

| 第一步清单 | 实际 | 偏差 |
| --- | --- | --- |
| `packages/base-render/src/controls.ts`（运行时不搬 DOM） | 同上 | 0 |
| `packages/base-render/src/style.ts`（窄屏锚点改整行） | 同上 | 0 |
| `packages/base-render/test/copy-format-menu-247.test.mjs`（B7 ＋ 桩收严 ＋ S10） | 同上 | 0 |
| `docs/base/base-render/t249-menu-dom-mutation.md`（本文件） | 同上 | 0 |
| `docs/skills/skill-calorie/t247-delivery.md`（补一段返修指针） | 同上 | 0 |

未碰：卡路里侧调用点、冻结常量、`COPY_ACTION_IDS`、菜单的桌面档几何、复制／提示文案。
