# Windows 桌面版为什么拿不到系统文件夹对话框（2026-09-20 现场）

**结论：不是插件缺陷，也不随重启改变。DSH Desktop 的启动器在 win32 上主动把目录选择行
从 `-auto` 换成 `-browse`，所以宿主的能力永远是 `browse`，`pick` 一定被拒。**

复现用户看到的那句：

```
打不开系统文件夹对话框（directoryPicker.pick needs the native capability;
the composed picker serves "browse"）：请直接在框里填绝对路径。
```

- 中文前后缀是本仓六个插件的 `readPickAnswer`／`pickDirectory` 加的人话
  （例：`packages/plugin-chef/src/client.ts:218`）。
- 括号里那截英文是宿主自己的原话，出自
  `@deepseek-ai/dsh-api-workspace-controller` 的 `requireCapability()`
  （`resources/app/node_modules/@deepseek-ai/dsh-api-workspace-controller/lib/types/directory-picker.js:130`）。

## 直接证据：桌面启动器的 win32 替换

`D:\0Tools\DSH Desktop\resources\app\lib\profile-pZhrTizp.js:838-850`（DSH Desktop 2.0.10）：

```js
if (platform === "win32") {
  if (!rows.has(DIRECTORY_PICKER_ROW_ID)) throw new Error("... has no directory-picker row");
  patches.push(
    { id: "directory-picker", name: AUTO_PICKER_PACKAGE, disabled: true },
    { insert: [
      { id: "desktop-directory-picker-browse-host",    name: "@deepseek-ai/dsh-host-directory-picker-browse" },
      { id: "desktop-directory-picker-browse-surface", name: "@deepseek-ai/dsh-client-ui-directory-picker-browse" },
    ] },
  );
  // …同处的 pwsh-sandbox 也换成桌面自有实现
}
```

配套常量：`DIRECTORY_PICKER_ROW_ID = "directory-picker"`、
`AUTO_PICKER_PACKAGE = "@deepseek-ai/dsh-host-directory-picker-auto"`、`BROWSE_PICKER_*`（同文件 182-185 行）。

也就是说：**在这台机器上，`directory-picker-auto` 那一行根本没被挂载**，挂的是 browse 后端
（`capability()` 回 `{kind:'browse'}`，只有 `list`／`createDirectory`）＋ browse 界面。所以

- `.scratch/picker-resolve-probe.mjs` 复算出来的「win32 ＋ loopback ＋ 无 SSH → native」是**别的组合下**的结论；
  这台机器走不到那个判定，因为该行被禁用了。
- `webServer.host` 恒等于 `127.0.0.1`（`desktopWebServerHost()` 忽略入参直接回环，
  `lib/desktop-network-CoOWAs8b.js:35`），所以「绑定地址导致 browse」这条路也不成立。

## 现场时间线（排除「没重启」这条解释）

| 时刻 | 事件 | 取处 |
| --- | --- | --- |
| 2026-09-20 14:55:35 | DSH Desktop 上一代启动 | 进程启动时间 |
| 2026-09-20 15:44:43-55 | `profiles/web` 重装六个 ilife 插件 0.3.1 | `node_modules/dsh-*` mtime |
| 2026-09-20 16:47:35／16:47:50 | **完全重启**（主进程 41084、宿主 46488，监听 127.0.0.1:43120） | 进程启动时间 |
| 重启之后 | 提示照旧 | 用户回报 |

⇒ 重启后仍是同一句 ⇒ 组合层面的确定性行为，与代码新旧、与启动环境里的 SSH 标记都无关。

## 三个入口都被同一个事实掐住

| 从哪点 | 走到哪 | 结果 |
| --- | --- | --- |
| ilife 六件设置页的「选择文件夹…」 | `ctx.get('remote.directoryPicker').pick()` | 被拒 |
| DSH 自带的「选择工作区目录」 | 同一控制器（`ui-workspace` 注入 `remote.directoryPicker`） | 被拒 |
| 界面上的应用内浏览 | browse 后端 `list`／`createDirectory` | 能用 |

`@deepseek-ai/dsh-client-ui-directory-picker-browse` 这两个界面本身是齐的，所以「应用内浏览」
这一半在 Windows 桌面上是可用的；缺的只有原生 `pick` 一格。

## 复算方式（只读，两分钟）

```powershell
node .scratch\desktop-picker-compose-probe.mjs    # 复算三层 patch → 生效目录行
node .scratch\desktop-picker-fix-dryrun.mjs       # 复算三种组合的最终状态
```

两个探针共用应用自带的 `composeEntries`（`@deepseek-ai/dsh-app-boot`），即 DSH 自己的补丁语义，
不是另写一套模拟。

## 修法（两种都验过补丁语义）

写进 `C:\Users\辰辰洋洋\.dsh\profiles\web\cordis.patch.yml`（用户层最后应用，能覆盖桌面层），
改完需重启一次：

```yaml
- id: directory-picker
  disabled: true
- id: desktop-directory-picker-browse-host
  name: '@deepseek-ai/dsh-host-directory-picker-browse'
  disabled: true
- id: desktop-directory-picker-browse-surface
  name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'
  disabled: true
- insert:
    - id: desktop-directory-picker-native-host
      name: '@deepseek-ai/dsh-host-directory-picker-native'
    - id: desktop-directory-picker-native-surface
      name: '@deepseek-ai/dsh-client-ui-directory-picker-native'
```

复算结果：生效行只剩 `desktop-directory-picker-native-host` 一个服务 ⇒ 原生 `pick` 可用。

**三条坑（都是复算出来的，不是猜的）**：

1. 补丁按 `id` 匹配时**名字对不上整条跳过**（`dsh-app-boot/lib/index.js:98-101`），所以不能在一条补丁里
   同时改 `name` 又指望生效——换后端必须走「禁用旧行 ＋ 插入新行」。
2. 只把 `-auto` 行启用回来、不动桌面层插入的 browse 行 ⇒ 两个目录选择服务同时挂载 ⇒ 重复服务、启动失败。
3. `-auto` 在 win32 上自己就会挂原生那一对，所以别再插一对；本修法把 `-auto` 禁用掉，自己插。

代价：原生后端每次调用都会在**宿主屏幕**上开一个系统对话框。若这台机器以后要被远程浏览器访问，
这个修法会让对话框出现在摸不到的屏幕上——那时应该撤掉这段，回到 browse。

## 真机探针：这台机器上原生对话框**是能用的**

```powershell
node .scratch\native-picker-reality-probe.mjs   # 直接调应用自带的 pickNativeDirectory
```

读数（2026-09-20 17:0x，用户在场确认）：**Windows 系统文件夹对话框确实弹出来了，用户手动关掉它，
调用在 4990 ms 返回 `null`（＝取消）**。所以「win32 上原生对话框起不来」在这台机器上不成立。

但上游有一条**仍然开着**的讨论，症状正是这个后端：

- [deepseek-ai/deepseek-harness Discussion #30](https://github.com/deepseek-ai/deepseek-harness/discussions/30)：
  「directory picker failed: win32 folder dialog worker exited before reporting a result」，
  2026-08-13 建、28 条评论、**state=open**（2026-09-03 仍有更新）。
- [Discussion #1658](https://github.com/deepseek-ai/deepseek-harness/discussions/1658)：「无法选择文件夹是怎么回事？」（open）。

两条合起来读：原生后端在 win32 上是**能弹但会偶发失败**的。桌面启动器在 win32 上整段禁掉它、
换成 browse，与这条已知缺陷对得上——它是一道规避，不是随手写的。

⇒ **把原生钉回来＝把一道已知偶发缺陷请回来**；探针只证明「这次能用」，不证明「每次都能用」。

## 方案对比（"用户要用文件夹浏览器挑目录"这件事怎么办）

| 方案 | 覆盖范围 | 代码量 | 风险 |
| --- | --- | --- | --- |
| A. profile 补丁钉原生 | 六件插件设置页 ＋ DSH 自带的工作区选择 | 零代码（改配置） | 请回上游 #30 的偶发失败；远程浏览器下对话框开在宿主屏幕 |
| B. 插件自带应用内浏览器 | 六件插件设置页（＋可选开放给 DSH 工作区流程） | 新组件，见下 | 无外部依赖；与平台自带浏览器界面存在两套实现 |
| C. 复用 DSH 自带浏览器面 | — | — | **做不到**：`DirectoryBrowser` 是包内私有，只经工作区流程的空位暴露；插件侧没有"打开它并拿回路径"的入口 |

**推荐 B**，理由是它把"选目录"这件事放回插件自己的界面里：宿主给的两个原语
`list`／`createDirectory`（browse 后端）在所有部署形态下都可用，Windows／远程／SSH 都不打折。
A 只值得当"一分钟验证"。

**B 已开票：[#744](https://github.com/FeatherHunter/ilife/issues/744)**（共用件放 `dsh-life-pack`，
六家只做接线；票面含结构设计、解耦要求与验收）。

### B 的设计要点（可行性已逐条验过）

- **宿主原语已经够用**，无需改平台：`remote.directoryPicker.list(path?)` 回
  `{path, home, crumbs[], entries[], truncated}`，`createDirectory(path, name)` 回新路径
  （wire schema 见 `@deepseek-ai/dsh-api-workspace-controller/lib/typert.remote-client.js:7-23`）。
  界面里需要的「上一级／面包屑／可编辑路径／隐藏目录／新建文件夹」这五件事全部由这两个原语支撑。
- **界面自绘**，不引平台私有组件：一个约 680×500 的对话框（Miller 两栏或单栏列表皆可），
  props 就是 `{listDirectory, createDirectory, initialPath, onPicked, onCancel}`——
  与平台那个 `DirectoryBrowser` 同形，便于将来上游若开放复用再换过去。
- **落点**：`packages/dsh-life-pack`（六个插件的公共依赖已存在），把现在六份重复的
  `resolveDirectoryPicker`／`readPickAnswer`／`pickDirectory`／`createBrowseHandler` 收成一份共享件，
  再加这个对话框与目录行控件。六件的 `client.ts` 只留"行接线"。
- **按钮语义要做成三态**，而不是像现在这样"点了才知道供不了"：
  1. 有原生能力 → 「选择文件夹…」调 `pick`；
  2. 只有 browse 能力 → 「浏览…」打开自绘对话框；
  3. 两者都没有 → 不画按钮，只留可编辑的路径框。
  判定方式：首次调用返回 `directory-picker/unavailable` 时把该行降级到第 2 档（或按组合探测一次）。

## 未做项

- **没有替用户改 `cordis.patch.yml`、也没有替用户重启**：配置与重启属于用户的操作现场。
- **上游 #30／#1658 的正文与评论没读全**：GitHub 的讨论页是前端壳（抓回来全是导航），
  REST 的 comments 端点返回 403（未认证限流）。目前只取了标题、状态、时间与评论数三样事实，
  「偶发失败的触发条件、有没有修、哪个版本修的」都还没有一手答案。
- **没有验「原生后端在这台机器的 GUI 会话里真能弹出对话框」**：那要人手点一次。
  补丁语义只保证「挂上的是原生那一对」。
  （2026-09-20 已由用户当场确认：`native-picker-reality-probe.mjs` 弹出的对话框是真的，
  用户手动关的。这条已结。）
- **启动器为什么在 win32 上这么做，没有拿到决策记录**：`resources/app` 是打包产物，仓内没有
  `directory-picker-auto` 与桌面替换的 Agent Note／ADR。现有证据只到"它确实这么做"＋
  "上游同症状的讨论还开着"这两条，够支撑"这是规避"的判断，不够支撑"规避已过时"。
