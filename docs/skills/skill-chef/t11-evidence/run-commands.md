# 票 11（`#219`）跑过的命令与原始读数

环境：`D:\ilife`（Windows／pwsh）；`SKILLS_DB_PATH` 取实机 User 级取值 `D:\2Study\StudyNotes\.db`。
**只逐包**使用已构建的产物，**没有**跑仓级 `pnpm build`／`tsc -b`／`pnpm test`。

## 1. 缺省支（本票的主路：说一句 help 就落文件）

```powershell
$env:SKILLS_DB_PATH='D:\2Study\StudyNotes\.db'
node packages\skill-chef\dist\cli\cmd_read.js chef.help.lookup        # exit 0
```

stdout（一行 JSON，已格式化节选）：

```json
{"version":"0.1.0","skill":"chef","shape":"list","key":"chef.help.lookup",
 "data":{"items":[ …10 个功能域… ],"total":10,"sceneTotal":48,"subgroupTotal":33,
         "mode":"file","bytes":127154},
 "delivery":{"mode":"file",
             "path":"D:\\2Study\\StudyNotes\\.db\\cook_html\\help\\私家大厨_HELP_20260912_161114.html",
             "bytes":127154}}
```

stderr：**空**（没有任何 `NOTE:`／`TOAST:`；跑之前那份 `chef_data.db` 已存在，所以也不会打「已初始化」——那条 note 只出现在真开库的键上）。

## 2. 速查支（显式参数）

```powershell
node packages\skill-chef\dist\cli\cmd_read.js chef.help.lookup --params '{"mode":"lookup"}'   # exit 0
```

- `data.total = 37`（37 条短语，与 `SKILL.md` 注入区逐条同源）
- `delivery.path = D:\2Study\StudyNotes\.db\cook_html\help\私家大厨_速查表_20260912_161128.html`（5,041 B）
- 与 HELP 文件**分名**（照 #139 判法：一个命令两种产物就分两个名字）

## 3. 落点目录（实机）

```
D:\2Study\StudyNotes\.db\cook_html\help\
  私家大厨_HELP_20260912_161114.html      127,154 B   2026/9/12 16:11:14
  私家大厨_速查表_20260912_161128.html       5,041 B   2026/9/12 16:11:28
```

`cook_html\` 是本轮**新建**的（跑之前实机目录清单里没有它）；`help\` 由落盘件递归建出。

## 4. 三条「没被本次跑动」的旁证

```powershell
Get-Item 'D:\2Study\StudyNotes\.db\chef_data.db' | Select-Object Length, LastWriteTime
#   Length 294912   LastWriteTime 2026/8/9 13:38:15     ← 跑完仍是这样（8/9 的旧时间）

Get-ChildItem 'D:\2Study\StudyNotes\.db\CookHub\help' | Measure-Object Length -Sum
#   Count 2   Sum 164734                                ← 老两份原封不动

node -e "…读产物载荷…"
#   hidden:true 出现: true | hidden:false 出现: false
#   ↑ 实机库文件在 ⇒ 首次使用横幅按设计隐藏；隔离目录里跑出来是 127,155 B，
#     差的那 1 字节正是 "false"→"true"（这也顺带证明「库是否存在」的只读探针真的生效）
```

## 5. 产物的载荷读数（打开落盘的那一份数出来的）

```
文件字节: 127154 | LF: 2055
载荷键: skill_name,title,subtitle,contact,groups,version,init_banner
域数: 10 | 组数: 33 | 卡数: 48
title: 私家大厨 HELP · 能力速查 | version: 0.1.0 | skill_name: 私家大厨
tab（域 label）: 做菜／查看／搜索筛选／修改／历史／采购／录入／派生／开始使用／数据管理   （＋「关于」＝ 11 个底部 tab）
待开发徽章数: 14
subtitle: 10 功能域 · 48 场景 · 版本 0.1.0 · 更新于 2026-09-12 16:11
chef_data.db mtime: 2026-08-09T05:38:15.375Z | size: 294912
```

## 6. 截图命令（可复现）

```powershell
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$help='file:///D:/2Study/StudyNotes/.db/cook_html/help/私家大厨_HELP_20260912_161114.html'
& $chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --virtual-time-budget=2000 --screenshot=help-mobile-375x900.png --window-size=375,900 $help
```

（`1440×900`／`375×2600`／`1440×2200` 同法；邻居对照那张把 `$help` 换成
`file:///D:/2Study/StudyNotes/.db/biscuit_accountant_html/饼干记账_HELP_20260911_163117.html`。）

## 7. 门禁与包内测试（本轮读数，供交叉引用）

```
node --test packages/skill-chef/test/*.test.mjs   → 46/46 绿（连跑 6 次）
node --test packages/plugin-chef/test/*.test.mjs  → 15/15 绿
node tooling/check-boundaries.mjs                 → PASS
node tooling/write-snapshot.mjs --check           → OK
```
