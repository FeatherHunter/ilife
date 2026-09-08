# #75 发布面实证（票面验收①「files 实证」）— 输出快照

> 可复跑：`node docs/research/t75-publish-evidence.mjs`（需先 `pnpm build`）。真打 tarball → 解包 → 从发布产物 import；末行 `RESULT: n/m`。

```
# #75 发布面实证（票面验收①「files 实证」）

- 包：`base-paint`（`packages/base-render`）；命令：`npm pack --dry-run` ＋ `npm pack --pack-destination <tmp>` → 解包 → import
- 口径：裁定 R1 —— 现成 `pnpm publish:tarball` **不覆盖** base-paint，故必须真打 tarball 取证；任一条不成立 → exit 1

| 判据 | 结果 | 证据 |
|---|---|---|
| dry-run 退出码 0 | PASS | status=0 |
| 清单含 dist/index.js | PASS | dist/index.js |
| 清单含 dist/style.js | PASS | dist/style.js |
| 清单含 dist/spec/style.js | PASS | dist/spec/style.js |
| 清单含 dist/charts.js | PASS | dist/charts.js |
| 清单不含 style/tokens.css（非契约资产、不在 files） | PASS | style/ 命中=0 |
| total files ≥ 69（基线 69，只增不减） | PASS | total=69 |
| 真打 tarball 成功 | PASS | tgz=base-paint-0.1.0.tgz status=0 |
| 解包成功 | PASS | status=0 |
| 解包含 package/dist/index.js | PASS | D:\ilife\.scratch\t75\pack-EIQtFk\package\dist\index.js |
| 发布产物导出 buildStyleSheet（function） | PASS | typeof=function |
| 四字段齐全且冻结 | PASS | frozen=true |
| css 非空 | PASS | cssBytes=16912 |
| tokens 恰 11 个 | PASS | tokens=11 |
| prefix 缺省 ilife- | PASS | prefix=ilife- |
| version === STYLE_VERSION | PASS | 0.1.0 vs 0.1.0 |
| css 含 --blue 逐字 | PASS | hasBlue=true |
| css 无 Q14 禁入项 | PASS | forbidden=0 |
| css 无包裹标签（可直接喂 fillTemplate） | PASS | bare=true |

RESULT: 19/19（发布产物 css=16912 B）
node : (node:23288) [DEP0190] DeprecationWarning: Passing args to a child proce
ss with shell option true can lead to security vulnerabilities, as the argument
s are not escaped, only concatenated.
At line:1 char:627
+ ... ar]10; $b2 = node docs/research/t75-publish-evidence.mjs 2>&1 | Out-S ...
+                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ((node:23288) [D...y concatenated. 
   :String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
(Use `node --trace-deprecation ...` to show where the warning was created)
```

