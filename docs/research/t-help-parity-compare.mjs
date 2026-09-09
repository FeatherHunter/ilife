#!/usr/bin/env node
/**
 * t-help-parity-compare.mjs · 新旧 HELP 差异台账（七维度）（#83 · 地图 #63 主线②）
 *
 * 作用：消费 `t-help-parity-extract.mjs` 的两侧解析 JSON，按**七个维度**逐条给
 *       「旧值／新值／判定／证据」，判定只用四值：
 *       `一致` / `差异（可解释）` / `新版缺失` / `新版新增`；每条差异带**根因或归属票**。
 *       结果落 `.scratch/t-parity/ledger.json`（机器可读），供 `docs/research/t-help-parity-ledger.md` 引用。
 *
 * **R-3 加固（两席审查 S3-1／A §4）**：
 *   1. **判定由测量产生**：每行的 `verdict` 恒由 `rule(实测值)` 计算，脚本内**不写判定字面量**；
 *      并删除了旧版恒真表达式 `? A : A`。
 *   2. **每行带 `evidenceRef`**（指向 `ledger.dimensions.*` 的取数路径），收尾断言**所有 ref 可解析**
 *      —— 杜绝「判定与证据脱钩」。
 *   3. **禁用 `wake_word` 作 join 键**（434/436 唯一，`记身材照`×3）→ 一律 `(子分组 id, 组内序)` 对齐。
 *   4. **D7 体积等式闭合断言**：块口径和 ＝ 文件字节；增减分块和 ＋ 标签壳差 ＝ 头条 delta。
 *
 * **只观测**：不修代码、不改产物、不为「看起来一致」造数。
 *
 * 用法（工作目录＝仓库根）：
 *   node docs/research/t-help-parity-compare.mjs
 *   node docs/research/t-help-parity-compare.mjs --out .scratch/t-parity
 *
 * 输出：`RESULT: n/m …` 摘要行（最后一行恒为总判定）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, argOf('--out', '.scratch/t-parity'));

const old = JSON.parse(fs.readFileSync(path.join(OUT, 'old-parse.json'), 'utf8'));
const newAll = JSON.parse(fs.readFileSync(path.join(OUT, 'new-parse.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(OUT, 'fixtures-parse.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'gen-manifest.json'), 'utf8'));
const newFile = newAll.file;

let checks = 0;
let pass = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) pass++;
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ' · ' + detail : ''));
  return !!cond;
};

/** 四值闭集（**唯一**判定字面量来源；行内一律用 rule 计算，不写字面量）。 */
const V = Object.freeze({
  SAME: '一致',
  EXPLAINED: '差异（可解释）',
  MISSING: '新版缺失',
  ADDED: '新版新增',
});

const rows = [];
const add = (dim, item, oldValue, newValue, rule, evidence, attribution, evidenceRef) => {
  const verdict = rule();
  if (!Object.values(V).includes(verdict)) throw new Error('非法判定：' + verdict + ' @ ' + dim + '/' + item);
  rows.push({ dim, item, old: oldValue, new: newValue, verdict, evidence, attribution, evidenceRef });
  return verdict;
};

// ── 对齐：436 场景按 (子分组 id, 组内序) 对齐（**不用 wake_word**：434/436 唯一，B-S3-6）────
const keyOf = (x) => x.sgid + '#' + x.idx;
const oldByKey = new Map(old.scenes.map((x) => [keyOf(x), x]));
const newByKey = new Map(newFile.scenes.map((x) => [keyOf(x), x]));
const aligned = [...oldByKey.keys()].filter((k) => newByKey.has(k));
const promptEq = aligned.filter((k) => oldByKey.get(k).prompt_template === newByKey.get(k).prompt_template);
const wakeEq = aligned.filter((k) => oldByKey.get(k).wake_word === newByKey.get(k).wake_word);
const titleEq = aligned.filter((k) => oldByKey.get(k).title === newByKey.get(k).title);
const statusEq = aligned.filter((k) => oldByKey.get(k).status === newByKey.get(k).status);
const idEq = aligned.filter((k) => oldByKey.get(k).id === newByKey.get(k).id);
const idChanged = aligned
  .filter((k) => oldByKey.get(k).id !== newByKey.get(k).id)
  .map((k) => ({
    sgid: oldByKey.get(k).sgid,
    wake_word: oldByKey.get(k).wake_word,
    oldId: oldByKey.get(k).id,
    newId: newByKey.get(k).id,
    cardCode: newFile.dom.cardCodeDiff.find((d) => d.id === newByKey.get(k).id)?.code ?? newByKey.get(k).id,
    sheetCli: newByKey.get(k).cli,
  }));
const typesTextEq = aligned.filter((k) => JSON.stringify(oldByKey.get(k).types_text) === JSON.stringify(newByKey.get(k).types_text));
const oldGroupIds = old.groupDigest.map((g) => g.id);
const newGroupIds = newFile.groupDigest.map((g) => g.id);
const oldSgIds = old.subgroupDigest.map((s) => s.id);
const newSgIds = newFile.subgroupDigest.map((s) => s.id);
const sgLabelEq = old.subgroupDigest.every((s, i) => s.label === newFile.subgroupDigest[i]?.label);
const oldCliCount = old.scenes.filter((s) => s.cli !== null).length;
const newCliCount = newFile.scenes.filter((s) => s.cli !== null).length;
const noCli = newFile.scenes.filter((s) => s.cli === null);
// 22 条 legacy：**按 (子分组, 组内序) 对齐**后的 id 变更集（B-S1-1：22/22 卡级 code ≠ Sheet CLI）
const legacyCardOnly = idChanged.filter((x) => x.sheetCli === null).length;
const legacyBothDifferent = idChanged.filter((x) => x.sheetCli !== null && x.cardCode !== x.sheetCli).length;
const om = old.js.markers;
const nm = newFile.js.markers;

// ── D1 分组数 ─────────────────────────────────────────────────────────────────
add('D1 分组数', '分组条数', String(old.counts.groups), String(newFile.counts.groups),
  () => (old.counts.groups === newFile.counts.groups ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.groups}／新=${newFile.counts.groups}（envelope data.total=${manifest.modes.file.delivery ? 10 : '?'}）`, 'F3 十组序（L-01）', 'D1.groups');
add('D1 分组数', '分组 id 序列逐字', oldGroupIds.join('>'), newGroupIds.join('>'),
  () => (JSON.stringify(oldGroupIds) === JSON.stringify(newGroupIds) ? V.SAME : V.EXPLAINED),
  '两侧 10 个 id 与次序逐字相同（home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis）', 'L-01 分组序取 F3', 'D1.ids');
add('D1 分组数', '分组 label／icon 逐字', JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)), JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)),
  () => (JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)) === JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)) ? V.SAME : V.EXPLAINED),
  '10 组 label／icon 逐字相同（含 profile=⚙️，L-01 取 F3）', 'L-01', 'D1.groupDigest');
add('D1 分组数', '每分组子功能／场景分布', JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)), JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)),
  () => (JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) === JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) ? V.SAME : V.EXPLAINED),
  '10 组逐组（子功能数:场景数）完全相同', '—', 'D1.groupDigest');

// ── D2 子功能数 ───────────────────────────────────────────────────────────────
add('D2 子功能数', '子功能条数', String(old.counts.subgroups), String(newFile.counts.subgroups),
  () => (old.counts.subgroups === newFile.counts.subgroups ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.subgroups}／新=${newFile.counts.subgroups}（envelope data.subgroupTotal=${newFile.counts.subgroups}）`, 'L-03 子功能 id `{group}_{n}` 照抄', 'D2.subgroups');
add('D2 子功能数', '子功能 id 集合逐字', String(new Set(oldSgIds).size), String(new Set(newSgIds).size),
  () => (JSON.stringify(oldSgIds) === JSON.stringify(newSgIds) ? V.SAME : V.EXPLAINED),
  '54/54 同序同 id；「既有唤醒词」仅出现在 diet_9／analysis_9 两组且恒列组末（`helpCenter.ts:174` 排序键；其余 8 组无此子功能，A-S3-8 措辞更正）', 'L-03／helpCenter.ts:174', 'D2.idsEqual');
add('D2 子功能数', '子功能 label 逐字', sgLabelEq ? '54/54 相同' : '存在不同', sgLabelEq ? '54/54 相同' : '存在不同',
  () => (sgLabelEq ? V.SAME : V.EXPLAINED),
  '逐条比对 subgroupDigest[i].label', 'L-18 diet 展示名取 F3「饮食」', 'D2.labelsEqual');

// ── D3 场景（唤醒词）数 ───────────────────────────────────────────────────────
add('D3 场景数', '场景条数', String(old.counts.scenes), String(newFile.counts.scenes),
  () => (old.counts.scenes === newFile.counts.scenes ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.scenes}／新=${newFile.counts.scenes}（envelope data.sceneTotal=${newFile.counts.scenes}）`, 'F3 436 场景', 'D3.scenes');
add('D3 场景数', '唤醒词逐字', `${wakeEq.length}/436 相同`, `${wakeEq.length}/436 相同`,
  () => (wakeEq.length === 436 ? V.SAME : V.EXPLAINED),
  '按 (子分组 id, 组内序) 对齐后逐字比对 wake_word（**不以 wake_word 为 join 键**：434/436 唯一）', '—', 'D3.wakeEq');
add('D3 场景数', '场景 title 逐字', `${titleEq.length}/436 相同`, `${titleEq.length}/436 相同`,
  () => (titleEq.length === 436 ? V.SAME : V.EXPLAINED), '逐字比对 title', '—', 'D3.titleEq');
add('D3 场景数', 'status 字段逐字', `${statusEq.length}/436 相同`, `${statusEq.length}/436 相同`,
  () => (statusEq.length === 436 ? V.SAME : V.EXPLAINED), '逐字比对 status（两侧均空串）', '—', 'D3.statusEq');
add('D3 场景数', '场景 id 逐字', `${idEq.length}/436 相同`, `${idEq.length}/436 相同`,
  () => (idEq.length === 436 ? V.SAME : V.EXPLAINED),
  `22 条 legacy 场景 id 由 \`legacy_{唤醒词}\` 改为 \`main_prompt.cli\` 原文：` + idChanged.slice(0, 3).map((x) => x.wake_word).join('／') + ' …（全表见 ledger.json D3.idChanged）',
  'L-19／#83 R-7：F3 的 legacy_* 会让卡面显示不存在的命令', 'D3.idChanged');
add('D3 场景数', '场景 id 唯一性', '—', `${new Set(newFile.scenes.map((s) => s.id)).size}/436 唯一`,
  () => (new Set(newFile.scenes.map((s) => s.id)).size === 436 ? V.SAME : V.EXPLAINED), '#88 断言：id 436/436 唯一', '#88', 'D3.idUnique');

// ── D4 prompt 文本 ────────────────────────────────────────────────────────────
add('D4 prompt 文本', '每条场景 prompt_template 逐字', `${promptEq.length}/436 相同`, `${promptEq.length}/436 相同`,
  () => (promptEq.length === 436 ? V.SAME : V.EXPLAINED),
  '按 (子分组 id, 组内序) 对齐后逐字比对；差异样本见 ledger.json D4.promptDiffs', '—', 'D4.promptEq');
add('D4 prompt 文本', 'types 徽章文本序列', `${typesTextEq.length}/436 文本相同（旧=字符串数组）`, `${typesTextEq.length}/436 文本相同（新={text,bg,fg} 对象）`,
  () => (typesTextEq.length === 436 && old.scenes.filter((s) => s.types_shaped).length !== newFile.scenes.filter((s) => s.types_shaped).length ? V.EXPLAINED : V.SAME),
  `文本逐字相同；**形状**由 \`["结果"]\` 变为 \`[{text,bg,fg}]\`（三档配色内联）：旧 shaped=${old.scenes.filter((s) => s.types_shaped).length}／新 shaped=${newFile.scenes.filter((s) => s.types_shaped).length}`,
  'L-12／helpCenter.ts:132 HELP_TYPE_BADGES', 'D4.typesShaped');
add('D4 prompt 文本', '裸 `<N>` 等尖括号', `源码侧 13 处（\`t88-final.md:129\`：scene-02-diet.ts:29 等）／产物侧 prompt 内 0 处`,
  `源码侧 13 处／产物侧 prompt 内 ${newFile.derived.promptWithLt} 处（唯一 \`<N>\` 在 1 条 scene id：text 态裸 1 处、payload 转义 \`\\u003cN>\`、卡级 \`&lt;N&gt;\`）`,
  () => (old.derived.promptWithLt === newFile.derived.promptWithLt ? V.SAME : V.EXPLAINED),
  `产物侧两侧 prompt 内裸 \`<\` 均 ${newFile.derived.promptWithLt} 处（A-2／B-S2-1 更正：13 处是**源码侧**计数，产物侧不可复现）`,
  '#88 §5-D-4（A.4）', 'D4.ltProductSide');
add('D4 prompt 文本', 'subtitle（L-10 时间戳）', JSON.stringify(old.meta.subtitle), JSON.stringify(newFile.meta.subtitle),
  () => (old.meta.subtitle === newFile.meta.subtitle ? V.SAME : V.EXPLAINED),
  '旧含「更新于 2026-08-14 11:38」；新**不发**时间戳（`updatedAt` 缺省不写 → 字节稳定，P-2）', 'L-10（P-2）', 'D4.subtitle');

// ── D5 每条 CLI 展示命令 ──────────────────────────────────────────────────────
add('D5 CLI 展示命令', 'Sheet「可执行命令」行数', String(oldCliCount), String(newCliCount),
  () => (oldCliCount === 0 && newCliCount > 0 ? V.ADDED : oldCliCount === newCliCount ? V.SAME : V.EXPLAINED),
  `旧侧 436 场景 payload **无** editable_fields/cli 字段（F3 不展示 CLI，L-09）；新侧 ${newCliCount}/436（#106 回补，来源 #81 路由层 exec 桶 341 条）`,
  '#106（数据源 #81 WAKE_ROUTES exec 341 条；helpCenter.ts:94-123）', 'D5.newCli');
add('D5 CLI 展示命令', '卡级 `<code class=cli>` 行数', '0（F3 卡面无代码行）', `${newFile.dom.codeCli} 条（其中 ${newFile.dom.cardCodeVerbatimEq} 条逐字＝Scene.id，1 条为 HTML 实体转义形式）`,
  () => (newFile.dom.codeCli === 436 ? V.ADDED : V.EXPLAINED),
  `卡级 code 与 Scene.id：逐字相等 **${newFile.dom.cardCodeVerbatimEq}/436**；反转义后 ${newFile.dom.cardCodeUnescapeEq}/436（唯一例外＝含 \`<N>\` 与 \`"\` 的 1 条 id，渲染为 \`&lt;N&gt;\`／\`&quot;\`，语义同、字节不同，A-1／B-S3-2）`,
  'L-09（F3 不显示；本项为新增展示）', 'D5.cardCode.verbatimEq');
add('D5 CLI 展示命令', '无 CLI 的场景数（缺口）', '不适用（旧侧无此概念）', `${noCli.length}/436`,
  () => (noCli.length > 0 ? V.MISSING : V.SAME),
  `缺 ${noCli.length} 条：diet=${noCli.filter((x) => x.gid === 'diet').length}／weight=${noCli.filter((x) => x.gid === 'weight').length}／exercise=${noCli.filter((x) => x.gid === 'exercise').length}／workout=${noCli.filter((x) => x.gid === 'workout').length}／goal=${noCli.filter((x) => x.gid === 'goal').length}／body_detail=${noCli.filter((x) => x.gid === 'body_detail').length}／analysis=${noCli.filter((x) => x.gid === 'analysis').length}；根因 #81 non-exec（110 − 漂移 15 ＝ 95，漂移归 #111/#112/#113；细分 out-of-scope 10 ＋ legacy-chain 85）`,
  '根因：#81 路由层 95 条 non-exec；**建议归属票**：#86（wizard 5 条）／计划类二期写键票／legacy python 类登记不移植', 'D5.noCli');
add('D5 CLI 展示命令', '卡级 code vs Sheet CLI（22 条 legacy）', '不适用', `${idChanged.length}/22 条**不同源**（${legacyBothDifferent} 条双命令冲突 ＋ ${legacyCardOnly} 条卡级有原文／Sheet 无字段行）`,
  () => (legacyBothDifferent + legacyCardOnly === 22 && legacyCardOnly > 0 ? V.EXPLAINED : V.MISSING),
  `22/22：18 条卡级＝\`python…\`／\`mavis…\` 而 Sheet＝路由层新 CLI；4 条（\`看「有备注」的饮食记录\`＋\`开启／关闭／查定时复盘\`）卡级有 python／mavis 原文、Sheet **无字段行**（reason code：noNoteFilter ×1、oosCron ×3）`,
  'L-19（卡级取 main_prompt.cli 原文）＋#106（Sheet 取路由层）；**建议**：维护者拍板是否收敛（归 #106 后续或新票）', 'D5.legacyCardVsSheet');
add('D5 CLI 展示命令', '每卡按钮（静态 vs 运行时）', '每卡 1 个「复制」（运行时注入 `.mini`）', `静态 markup ${newFile.dom.staticButtonsWithActionId} 个（data-action-id 各 436：复制指令／复制唤醒词／复制参数）＋ 运行时注入卡头第 4 个（\`injectCardCopy\`）`,
  () => (newFile.dom.staticButtonsWithActionId === 1308 && newFile.dom.staticCardCopyButtons === 0 ? V.ADDED : V.EXPLAINED),
  `A-4／B-S2-3 更正：**1,308 个按钮全在静态 markup**（\`ilife-help-shell-actions\` 内 3 个/卡），卡头按钮才是运行时注入（静态 \`card-copy\` = ${newFile.dom.staticCardCopyButtons} 个；JS \`createElement("button")\` 仅 ${newFile.dom.jsCreateButton} 处）`,
  'L-05／#88 S4-S5', 'D5.staticActionIds');
add('D5 CLI 展示命令', 'CLI 参数含冻结绝对日期', '不适用（F3 无 CLI 展示）', `${newFile.derived.cliDatedCount}/${newFile.derived.cliCount} 条命令参数带 \`YYYY-MM-DD\`（如 \`calorie.view.home --params '{"date":"2026-09-07"}'\` 当日即错）`,
  () => (newFile.derived.cliDatedCount > 0 ? V.EXPLAINED : V.SAME),
  `B-S2-5 新增登记：${newFile.derived.cliDatedCount}/${newFile.derived.cliCount} 条（${newFile.derived.cliUndatedCount} 条无日期参数）；样例参数由 #81 路由层冻结写入，复制即执行会指向过去日期`,
  '#81（样例参数口径）／#106 登记；建议：#81 后续维护票或新票', 'D5.cliDatedCount');
add('D5 CLI 展示命令', '95 条无字段卡的「复制参数」按钮', '不适用', `回落复制**卡级 code（＝Scene.id）**而非命令（样例 \`diet_scan_label\` → data-t=\`diet_scan_label\`）`,
  () => (noCli.length === newFile.dom.codeCli - newCliCount ? V.EXPLAINED : V.MISSING),
  'B-S3-5 新增登记：无 cli 字段时「复制参数」复制的是场景 id（`t106:73` L-106-03 口径），非空、非命令', '#106（L-106-03 登记）', 'D5.noFieldParamsButton');

// ── D6 交互能力 ───────────────────────────────────────────────────────────────
const feat = (item, o, n, rule, evidence, attribution, ref) => add('D6 交互能力', item, o, n, rule, evidence, attribution, ref);
feat('搜索（输入框＋清空＋计数）', '有（#sB／#sClear／#hitC，占位「搜索全部场景」）', `有（运行时注入 type=search ＋ 清空 ＋ 命中计数，占位「${nm.searchPlaceholder ? '搜索全部场景' : '?'}」）`,
  () => (om.searchPlaceholder && nm.searchPlaceholder && om.hitCountText && nm.hitCountText ? V.SAME : V.MISSING),
  `两侧均为**运行时注入**：旧 js.searchPlaceholder=${om.searchPlaceholder}／新 ${nm.searchPlaceholder}；静态 HTML 均无搜索框（旧 ${old.dom.staticSearchInput}／新 ${newFile.dom.staticSearchInput}）`,
  'L-06（S4 已做）', 'D6.oldMarkers.searchPlaceholder');
feat('命中计数／空态文案逐字', '「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」', '「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」',
  () => (om.hitCountText && nm.hitCountText && om.emptyText && nm.emptyText ? V.SAME : V.MISSING),
  `旧 hitCount=${om.hitCountText} empty=${om.emptyText}；新 hitCount=${nm.hitCountText} empty=${nm.emptyText}（逐字相同）`, 'L-06', 'D6.newMarkers.hitCountText');
feat('高亮', '有：仅高亮卡面标题 `.m-name`（`<mark>`，1 处实现）', '有：整卡文本节点 `wrapTerm`＋`<mark class=card-mark>`',
  () => (om.highlightScopeName && nm.highlightScopeCard ? V.EXPLAINED : V.MISSING),
  `旧 highlightScopeName=${om.highlightScopeName}／新 highlightScopeCard=${nm.highlightScopeCard}：新版高亮**范围更广**（卡内全部文本），旧版只高亮标题`, 'L-06 功能对等扩展（S4）', 'D6.newMarkers.highlightScopeCard');
feat('跳页', '有：搜索命中自动 `scrollTo({left})` 翻到首个命中页', '有：`jumpTo` 勾选命中页 radio＋Enter 循环跳页',
  () => (om.jumpPage && nm.jumpPage ? V.EXPLAINED : V.MISSING),
  `旧 jumpPage=${om.jumpPage}（横滑页）／新 jumpPage=${nm.jumpPage}（radio 标签条，L-07 形态替换）`, 'L-07（Tab 横滑→radio 标签条，功能对等）', 'D6.newMarkers.jumpPage');
feat('复制按钮（卡级）', '有：每卡 1 个「复制」（运行时 `.mini` 内注入）', '有：静态 3 个/卡（Sheet 内）＋ 运行时注入卡头 1 个',
  () => (nm.cardCopyButton && newFile.dom.staticButtonsWithActionId === 1308 ? V.ADDED : V.MISSING),
  `旧 cardCopyButton=${om.cardCopyButton} 文案「${om.copyLabel}」／新 cardCopyButton=${nm.cardCopyButton} 文案「${nm.copyLabel}」；静态按钮数 旧 ${old.dom.buttons}／新 ${newFile.dom.buttons}`,
  'L-05（旧=每卡 1 个；新=静态 3 个 Sheet 按钮＋运行时卡头注入，#88 S4/S5）', 'D6.newMarkers.cardCopyButton');
feat('返回顶部', '无（`backTop` 0 处；CSS 无 `.backTop`）', '有（运行时注入 `#backTop`，↑，aria「回到顶部」，scrollTop>400 才显形）',
  () => (om.backTop === false && nm.backTop === true ? V.ADDED : om.backTop === nm.backTop ? V.SAME : V.EXPLAINED),
  `旧 backTop=${om.backTop}／新 backTop=${nm.backTop}（BACKTOP_MIN_Y=400）`, 'L-15／H-19（#88 S4 已做）', 'D6.newMarkers.backTop');
feat('Sheet 实时预览', '有：底部弹层内参数表单 `input[data-p]` → `[data-prev]` 实时重组 `buildPrompt`', '有：内联 `<details>` 内字段换输入框 → 实时重组「prompt ＋ 空行 ＋ label: value」',
  () => (om.sheetPreview && nm.sheetPreview ? V.EXPLAINED : V.MISSING),
  `旧 sheetPreview=${om.sheetPreview} buildPrompt=${om.sheetPreviewBuild}／新 sheetPreview=${nm.sheetPreview}（形态 L-08 弹层→内联，语义同）`, 'L-08（Sheet 弹层→内联 <details>，功能对等）', 'D6.newMarkers.sheetPreview');
feat('参数必填校验', '有：`getMissing` → toast「请先填写: …」并阻断复制（**代码级判定**：F3 根镜像 436 场景 `editable_fields` 全空 → 该表单/校验在本数据上不可观测，A-S3-7）', '无必填阻断（Sheet 字段为可编辑输入，但无 `req` 语义、不阻断复制）',
  () => (om.sheetValidate === true && nm.sheetValidate === false ? V.MISSING : V.SAME),
  `旧 sheetValidate=${om.sheetValidate}（代码级）／新 sheetValidate=${nm.sheetValidate}：F3 的 \`params[].req\` 校验在新版无对应物`, '根因：新版 Sheet 字段来源＝#106 路由 CLI（展示＋可改），非 F3 `params` 表单；**建议归属票**：#86（配置型 wizard 已落地，承载填写）', 'D6.oldMarkers.sheetValidate');
feat('copied 态（toast 文案）', '有：toast「已复制」＋副文案「粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。」', '有：toast「已复制」（失败态「复制失败／长按选择文本手动复制」）',
  () => (om.toastOkMsg && nm.toastOkMsg ? V.EXPLAINED : V.MISSING),
  `旧 toastOkMsg=${om.toastOkMsg}／新 ${nm.toastOkMsg}；toast 副文案不同（旧含「粘贴给 AI…」教学句，新为失败指引）`, '#121／H-16（双反馈；toast 4500 ms 取冻结值）', 'D6.newMarkers.toastOkMsg');
feat('copied 态（按钮 450 ms 态）', '无（`.copy-btn` 无 `copied` 类切换）', '有：按钮 `copied` 类（450 ms 后复原）',
  () => (om.copiedState === false && nm.copiedState === true ? V.ADDED : V.SAME),
  `旧 copiedState=${om.copiedState}／新 ${nm.copiedState}（COPIED_MS=450）；旧侧只有 toast 反馈、无按钮态`, '#121（copied 态）／H-16', 'D6.newMarkers.copiedState');
feat('剪贴板实现', `document.execCommand('copy') ＋ 隐藏 textarea 回退`, `navigator.clipboard.writeText() ＋ textarea 回退，**仍带** execCommand('copy') 兜底（A-S3-6 更正）`,
  () => (nm.clipboardApi && nm.execCommandFallback ? V.EXPLAINED : V.MISSING),
  `旧 clipboardApi=${om.clipboardApi} execCommand=${om.execCommandFallback}／新 clipboardApi=${nm.clipboardApi} execCommand=${nm.execCommandFallback}（两侧都含 execCommand 回退）`, '现代 API 迁移（行为等价）', 'D6.newMarkers.execCommandFallback');
feat('键盘可达', `有：\`newIn.addEventListener('keydown'…Enter…doNew())\`（作用于「新增」输入框）`, '有：搜索框 Enter 循环跳到下一个命中页',
  () => (om.keyboardEnter && nm.keyboardEnter ? V.EXPLAINED : nm.keyboardEnter ? V.ADDED : V.MISSING),
  `A-3 更正：旧 keyboardEnter=${om.keyboardEnter}（ledger.json 自身机器证据）／新 ${nm.keyboardEnter} → **能力对等扩展**（旧作用于新增输入框，新作用于搜索框循环跳页），非「新版新增」`, '#88 S4（H-20 同批）', 'D6.oldMarkers.keyboardEnter');
feat('焦点可见／动效可关', '无（`:focus-visible` 0／`prefers-reduced-motion` 0）', `有（\`:focus-visible\` ${newFile.css.focusVisible} 处／\`prefers-reduced-motion\` ${newFile.css.prefersReducedMotion} 处）`,
  () => (old.css.focusVisible === 0 && old.css.prefersReducedMotion === 0 && newFile.css.focusVisible > 0 && newFile.css.prefersReducedMotion > 0 ? V.ADDED : V.EXPLAINED),
  `旧 css.focusVisible=${old.css.focusVisible} prefersReducedMotion=${old.css.prefersReducedMotion}／新 ${newFile.css.focusVisible}／${newFile.css.prefersReducedMotion}`, 'L-15／H-20（R35 D-14 强制）', 'D6.newCss.focusVisible');
feat('Tab 形态', '横滑页 `.page` ＋ 底部 tabBar（scroll-snap）', `radio 标签条（\`.ilife-help-shell-tab-input\` ${newFile.dom.tabRadios} 个）`,
  () => (om.jumpPage !== nm.jumpPage ? V.EXPLAINED : V.SAME),
  `旧 mediaQueries=${JSON.stringify(old.css.mediaQueries)}／新 ${JSON.stringify(newFile.css.mediaQueries)}`, 'L-07／L-13（断点差异归 #89）', 'D6.newCss.mediaQueries');
feat('空态／错误态', '无 try/catch → 白屏风险（L-14）', '静态 HTML 无解析步骤；渲染失败走 #83 模板回执',
  () => (nm.toast || nm.copiedState ? V.ADDED : V.MISSING), 'L-14 改进项；#83 渲染失败回执', 'L-14／#83', 'D6.newMarkers.toast');
feat('数字等宽（tnum，H-07）', '无（`tnum` 命中 0）', `有（\`font-feature-settings: "tnum"\`）`,
  () => (old.css.tnum === false && newFile.css.tnum === true ? V.ADDED : V.SAME),
  '旧 css.tnum=false／新 true（H-07「所有数字 tnum」；旧侧不达标＝OLD-DEVIATION）', 'H-07／#89', 'D6.newCss.tnum');
feat('零渐变（H-04）', `1 处（init-banner 135deg，H-04 判 OLD-DEVIATION）`, `1 处 \`linear-gradient(90deg,var(--fg3,#86868b)…)\`（charts 区）——**与 H-04「命中数 = 0」冲突，未消解**`,
  () => (old.css.linearGradients.length > 0 && newFile.css.linearGradients.length > 0 ? V.EXPLAINED : V.SAME),
  `B-S1-2 更正：删去 L-17「判据作废」的消解写法。H-04（\`visual-spec-help.md:82\`，级别 C，R35 已定「零渐变基准取 B1」）要求最终 CSS 命中 0，新侧 charts 区 1 处不达标 → **交 #89 裁定**；旧侧 hero 渐变＝OLD-DEVIATION`,
  '#89（裁定）＋#83（登记）', 'D6.newCss.linearGradients');
feat('正文字体栈（H-06）', '有：`-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif`', `**无**（CSS 内仅 \`"SF Mono", monospace\` 与 \`font-family: inherit\`；\`-apple-system\`／\`PingFang\` 命中 0）`,
  () => (old.css.fontStack === true && newFile.css.fontStack === false ? V.MISSING : V.SAME),
  `B-S2-6 新增登记：旧 fontStack=${old.css.fontStack}／新 ${newFile.css.fontStack}；H-06 断言形式（字体栈逐字）在新侧不成立（\`visual-spec-help.md:99\`）`,
  '#83（登记）／#89（裁定：宿主继承 vs 显式栈）', 'D6.newCss.fontStack');

// ── D7 体积 ───────────────────────────────────────────────────────────────────
const so = newFile.size;
const soOld = old.size;
const chunks = {
  fileTotal: newFile.bytes,
  fileMarkup: so.markup,
  filePayload: so.payloadInner,
  fileCss: so.styleInner,
  fileJs: so.jsInner,
  blockSum: so.blockSum,
  innerSum: so.innerSum,
  innerResidual: so.innerResidual,
  oldTotal: old.bytes,
  oldMarkup: soOld.markup,
  oldPayload: soOld.payloadInner,
  oldCss: soOld.styleInner,
  oldJs: soOld.jsInner,
  oldInnerSum: soOld.innerSum,
  oldInnerResidual: soOld.innerResidual,
  inline: newAll.inline.bytes,
  text: newAll.text.bytes,
  delta: newFile.bytes - old.bytes,
  innerDeltaSum: (so.markup - soOld.markup) + (so.payloadInner - soOld.payloadInner) + (so.styleInner - soOld.styleInner) + (so.jsInner - soOld.jsInner),
  shellDelta: so.innerResidual - soOld.innerResidual,
};
add('D7 体积', 'file 态字节', `${old.bytes} B（302,820）`, `${newFile.bytes} B（1,264,822）`,
  () => (newFile.bytes !== old.bytes ? V.EXPLAINED : V.SAME),
  `+${chunks.delta} B（×${(newFile.bytes / old.bytes).toFixed(2)}）；旧侧 DOM **运行时生成**（静态标记 ${old.dom.markupBytes} B＋payload ${old.payload.bytes} B＋JS ${old.js.bytes} B），新侧静态卡 436＋静态按钮 1,308`,
  'L-16／P-5 交付形态（旧运行时渲染 vs 新静态壳）', 'D7.fileTotal');
add('D7 体积', '体积构成（块口径闭合）', '—', `markup ${so.markup} ＋ payload 块 ${so.payloadBlock} ＋ style 块 ${so.styleBlock} ＋ js 块 ${so.jsBlock} ＝ **${so.blockSum}** ＝ 文件 ${so.total}（残差 ${so.blockResidual}）`,
  () => (so.blockResidual === 0 ? V.EXPLAINED : V.MISSING),
  'B-S2-4 更正：**块口径（含标签）闭合残差 0**；内容口径（不含标签）残差＝标签壳 86 B', '#106／#107／#88 静态壳', 'D7.blockSum');
add('D7 体积', '体积残差（两处）', `旧侧标签壳 ${soOld.innerResidual} B`, `新侧标签壳 ${so.innerResidual} B`,
  () => (so.innerResidual > 0 && soOld.innerResidual > 0 ? V.EXPLAINED : V.SAME),
  `B-S2-4／A-S3-1：① 构成残差 **${so.innerResidual} B**（＝payload／style／js 三个块的标签壳；旧侧 ${soOld.innerResidual} B）；② 增减残差 **${chunks.shellDelta} B**（标签壳 ${soOld.innerResidual}→${so.innerResidual}）。口径声明：本脚本 size 账以「多块 style 原文直接相连」计（不含连接符），与席 B 的 join('\\n') 口径相差 1 B（旧侧壳 120 vs 119）——A-S3-5 已登记 ±1 口径混用`,
  '#83（登记）', 'D7.innerResidual');
add('D7 体积', '体积增减（分块 ＋ 标签壳闭合）', `markup ${soOld.markup} ＋ payload ${soOld.payloadInner} ＋ css ${soOld.styleInner} ＋ js ${soOld.jsInner}`, `markup ${so.markup} ＋ payload ${so.payloadInner} ＋ css ${so.styleInner} ＋ js ${so.jsInner}`,
  () => (chunks.innerDeltaSum + chunks.shellDelta === chunks.delta ? V.EXPLAINED : V.MISSING),
  `markup **+${so.markup - soOld.markup}**／payload **+${so.payloadInner - soOld.payloadInner}**（#106 cli 字段 53,596 B＋#107 meta_blocks 1,826 B＋22 条 legacy 原文）／css **${so.styleInner - soOld.styleInner}**／js **${so.jsInner - soOld.jsInner}**；分块和 ${chunks.innerDeltaSum} ＋ 标签壳 ${chunks.shellDelta} ＝ **${chunks.delta}**（闭合）`,
  'L-16／P-5；残差已显式登记（A-S3-5：css 多块连接口径 ±1 B 已在 extract 双记块/内容口径）', 'D7.innerDeltaSum');
add('D7 体积', '与 L-16 记录值对账', 'L-16 记录 1,010,979 B（#88 期）', `${newFile.bytes} B → 较 L-16 **+${newFile.bytes - 1010979} B**`,
  () => (newFile.bytes !== 1010979 ? V.EXPLAINED : V.SAME),
  `B-S3-3 新增登记：L-16（\`t88-final.md:97,166\`）记 #88 期 1,010,979 B／4,042 行；最终代码 ${newFile.bytes} B／${newFile.lines} 行，增量归 #106（341 条 CLI 字段）＋#107（看板入口）＋#121 等，未逐字节二分`,
  '#83（登记）／L-16', 'D7.deltaVsL16');
add('D7 体积', 'payload 顶层键', `${old.payload.topKeys.join(',')}（5 键）`, `${newFile.payload.topKeys.join(',')}（6 键）`,
  () => (newFile.payload.topKeys.length > old.payload.topKeys.length ? V.ADDED : V.SAME),
  `B-S3-4 新增登记：新侧 payload 顶层新增 \`meta_blocks\`（#107 看板页入口段，${newFile.derived.metaBlockEntries.length} 条：${newFile.derived.metaBlockEntries.join('／')}），旧侧 5 键无此项`,
  '#107（独立成行登记）', 'D7.topKeys');
add('D7 体积', 'inline／text 态字节', '不适用（F3 无三态）', `inline ${newAll.inline.bytes} B／text ${newAll.text.bytes} B`,
  () => (newAll.inline.bytes !== newFile.bytes ? V.ADDED : V.SAME),
  `inline ＝ file −(head/doctype＋payload 块)；text 为纯文本索引 ${newAll.text.lines} 行`, '#91 三态（mode 显式）／#83 delivery', 'D7.inline');
add('D7 体积', '字节稳定性（多次运行同 sha256）', '—', `file ${newFile.sha256.slice(0, 16)}…／inline ${newAll.inline.sha256.slice(0, 16)}…／text ${newAll.text.sha256.slice(0, 16)}…`,
  () => (newFile.sha256 === manifest.modes.file.artifact.sha256 ? V.SAME : V.EXPLAINED),
  '同一 commit 多次独立运行 sha256 相同（P-2 去时间戳；gen-manifest 与两席独立重生成一致）', 'P-2／#88', 'D7.stableSha');

// ── 穷举对账（B §4.5-3）：两侧解析 JSON 里**可枚举**的键集／token 差异，逐条要求有登记行覆盖 ──
const enumPairs = {
  'payload.topKeys': [old.payload.topKeys, newFile.payload.topKeys],
  'scene.fieldKeys': [
    ['id', 'title', 'wake_word', 'status', 'prompt_template', 'types'],
    ['id', 'title', 'wake_word', 'status', 'prompt_template', 'types', 'editable_fields'],
  ],
  'group.fieldKeys': [['id', 'icon', 'label', 'subgroups'], ['id', 'icon', 'label', 'subgroups']],
  'css.focusVisible': [String(old.css.focusVisible), String(newFile.css.focusVisible)],
  'css.prefersReducedMotion': [String(old.css.prefersReducedMotion), String(newFile.css.prefersReducedMotion)],
  'css.tnum': [String(old.css.tnum), String(newFile.css.tnum)],
  'css.fontStack': [String(old.css.fontStack), String(newFile.css.fontStack)],
  'css.mediaQueries': [old.css.mediaQueries.join('|'), newFile.css.mediaQueries.join('|')],
  'css.linearGradients': [old.css.linearGradients.join('|'), newFile.css.linearGradients.join('|')],
  'js.markers.backTop': [String(om.backTop), String(nm.backTop)],
  'js.markers.sheetValidate': [String(om.sheetValidate), String(nm.sheetValidate)],
  'js.markers.highlightScope': [String(om.highlightScopeName), String(nm.highlightScopeCard)],
  'js.markers.jumpPage': [String(om.jumpPage), String(nm.jumpPage)],
  'js.markers.keyboardEnter': [String(om.keyboardEnter), String(nm.keyboardEnter)],
  'js.markers.copiedState': [String(om.copiedState), String(nm.copiedState)],
  'dom.cards': [String(old.dom.cardsOld), String(newFile.dom.cardsNew)],
  'dom.buttons': [String(old.dom.buttons), String(newFile.dom.buttons)],
  'dom.details': [String(old.dom.details), String(newFile.dom.details)],
  'dom.fieldRows': [String(old.dom.fieldRows), String(newFile.dom.fieldRows)],
  'dom.codeCli': [String(old.dom.codeCli), String(newFile.dom.codeCli)],
  'dom.viewEntries': [String(old.dom.viewEntries), String(newFile.dom.viewEntries)],
};
/** 覆盖表：每个**可枚举差异键**必须映射到一条已登记行的 item（未覆盖 → 红）。 */
const COVERAGE = {
  'payload.topKeys': 'payload 顶层键',
  'scene.fieldKeys': 'Sheet「可执行命令」行数',
  'css.focusVisible': '焦点可见／动效可关',
  'css.prefersReducedMotion': '焦点可见／动效可关',
  'css.tnum': '数字等宽（tnum，H-07）',
  'css.fontStack': '正文字体栈（H-06）',
  'css.mediaQueries': 'Tab 形态',
  'css.linearGradients': '零渐变（H-04）',
  'js.markers.backTop': '返回顶部',
  'js.markers.sheetValidate': '参数必填校验',
  'js.markers.highlightScope': '高亮',
  'js.markers.jumpPage': '跳页',
  'js.markers.keyboardEnter': '键盘可达',
  'js.markers.copiedState': 'copied 态（按钮 450 ms 态）',
  'dom.cards': '卡级 `<code class=cli>` 行数',
  'dom.buttons': '每卡按钮（静态 vs 运行时）',
  'dom.details': 'Sheet 实时预览',
  'dom.fieldRows': 'Sheet「可执行命令」行数',
  'dom.codeCli': '卡级 `<code class=cli>` 行数',
  'dom.viewEntries': 'payload 顶层键',
};
const enumDiffs = Object.entries(enumPairs)
  .filter(([, [a, b]]) => JSON.stringify(a) !== JSON.stringify(b))
  .map(([k, [a, b]]) => ({ key: k, old: a, new: b, coveredBy: COVERAGE[k] ?? null }));

// ── 汇总 ─────────────────────────────────────────────────────────────────────
const byVerdict = rows.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] ?? 0) + 1; return acc; }, {});
const byDim = rows.reduce((acc, r) => { acc[r.dim] = acc[r.dim] ?? {}; acc[r.dim][r.verdict] = (acc[r.dim][r.verdict] ?? 0) + 1; return acc; }, {});
const ledger = {
  generatedBy: 'docs/research/t-help-parity-compare.mjs',
  // **不写 generatedAt**：ledger.json 保持**逐字节确定**（同一输入 → 同一 sha256），
  // 便于把 sha256 写进台账供第三方复算（R-3 · B-S3-2）。运行时刻见 gen-manifest.json。
  repo: manifest.repo,
  sides: {
    old: { file: old.file, bytes: old.bytes, lines: old.lines, sha256: old.sha256, counts: old.counts, dom: old.dom, size: old.size },
    new: {
      file: { path: newFile.file, bytes: newFile.bytes, lines: newFile.lines, sha256: newFile.sha256, counts: newFile.counts, dom: newFile.dom, size: newFile.size, envelope: newFile.envelope },
      inline: { path: newAll.inline.file, bytes: newAll.inline.bytes, lines: newAll.inline.lines, sha256: newAll.inline.sha256, envelope: newAll.inline.envelope },
      text: { path: newAll.text.file, bytes: newAll.text.bytes, lines: newAll.text.lines, sha256: newAll.text.sha256, envelope: newAll.text.envelope },
    },
    fixtures: fixtures.map((f) => ({ file: f.file, bytes: f.bytes, lines: f.lines, sha256: f.sha256, shaMatches: f.shaMatches, summary: f.summary })),
  },
  dimensions: {
    D1: { groups: { old: old.counts.groups, new: newFile.counts.groups }, ids: { old: oldGroupIds, new: newGroupIds }, groupDigest: { old: old.groupDigest, new: newFile.groupDigest } },
    D2: { subgroups: { old: old.counts.subgroups, new: newFile.counts.subgroups }, idsEqual: JSON.stringify(oldSgIds) === JSON.stringify(newSgIds), labelsEqual: sgLabelEq },
    D3: { scenes: { old: old.counts.scenes, new: newFile.counts.scenes }, wakeEq: wakeEq.length, titleEq: titleEq.length, statusEq: statusEq.length, idEq: idEq.length, idUnique: new Set(newFile.scenes.map((s) => s.id)).size, idChanged },
    D4: {
      promptEq: promptEq.length,
      promptDiffs: aligned.filter((k) => oldByKey.get(k).prompt_template !== newByKey.get(k).prompt_template).map((k) => ({ sgid: oldByKey.get(k).sgid, wake_word: oldByKey.get(k).wake_word, old: oldByKey.get(k).prompt_template, new: newByKey.get(k).prompt_template })),
      typesTextEq: typesTextEq.length,
      typesShaped: { old: old.scenes.filter((s) => s.types_shaped).length, new: newFile.scenes.filter((s) => s.types_shaped).length },
      ltProductSide: { old: old.derived.promptWithLt, new: newFile.derived.promptWithLt, sourceSideRecorded: 13 },
      subtitle: { old: old.meta.subtitle, new: newFile.meta.subtitle },
    },
    D5: {
      oldCli: oldCliCount, newCli: newCliCount, noCli: noCli.map((s) => ({ gid: s.gid, sgid: s.sgid, wake_word: s.wake_word, id: s.id })),
      cardCode: { total: newFile.dom.codeCli, verbatimEq: newFile.dom.cardCodeVerbatimEq, unescapeEq: newFile.dom.cardCodeUnescapeEq, diff: newFile.dom.cardCodeDiff },
      legacyCardVsSheet: { total: idChanged.length, bothDifferent: legacyBothDifferent, cardOnly: legacyCardOnly },
      staticActionIds: newFile.dom.staticActionIds, staticCardCopyButtons: newFile.dom.staticCardCopyButtons, jsCreateButton: newFile.dom.jsCreateButton,
      cliDatedCount: newFile.derived.cliDatedCount, cliCount: newFile.derived.cliCount, cliUndatedCount: newFile.derived.cliUndatedCount, cliSampleDated: newFile.derived.cliSampleDated,
      noFieldParamsButton: 'data-t = Scene.id（t106 L-106-03）',
    },
    D6: { oldMarkers: om, newMarkers: nm, oldCss: old.css, newCss: newFile.css, oldDom: old.dom, newDom: newFile.dom },
    D7: { ...chunks, blockSum: so.blockSum, innerResidual: so.innerResidual, topKeys: { old: old.payload.topKeys, new: newFile.payload.topKeys }, deltaVsL16: newFile.bytes - 1010979, stableSha: newFile.sha256 },
  },
  rows,
  enumDiffs,
  summary: { total: rows.length, byVerdict, byDim, enumDiffs: enumDiffs.length, uncoveredEnumDiffs: enumDiffs.filter((d) => !d.coveredBy).length },
};
fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2), 'utf8');
const ledgerSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, 'ledger.json'))).digest('hex');

// ── 断言（机械可判）──────────────────────────────────────────────────────────
const resolveRef = (ref) => ref.split('.').reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), ledger.dimensions);
const badRefs = rows.filter((r) => !r.evidenceRef || resolveRef(r.evidenceRef) === undefined);
ok(badRefs.length === 0, '每行 evidenceRef 均可解析（判定与证据不脱钩，S3-1）', badRefs.length ? JSON.stringify(badRefs.map((r) => r.evidenceRef)) : `${rows.length}/${rows.length}`);
ok(rows.every((r) => Object.values(V).includes(r.verdict)), '七维度每行判定均属四值之一', JSON.stringify(byVerdict));
ok(old.counts.groups === newFile.counts.groups && old.counts.subgroups === newFile.counts.subgroups && old.counts.scenes === newFile.counts.scenes, 'D1-D3 头条数字 10/54/436 两侧相同', `${old.counts.groups}/${old.counts.subgroups}/${old.counts.scenes} vs ${newFile.counts.groups}/${newFile.counts.subgroups}/${newFile.counts.scenes}`);
ok(promptEq.length === 436, 'D4 prompt 逐字 436/436', promptEq.length + '/436');
ok(wakeEq.length === 436 && titleEq.length === 436 && statusEq.length === 436, 'D3 唤醒词／title／status 逐字 436/436', `${wakeEq.length}/${titleEq.length}/${statusEq.length}`);
ok(idChanged.length === 22, 'D3 场景 id 变更恰 22 条（L-19）', idChanged.length + ' 条');
ok(oldCliCount === 0 && newCliCount === 341, 'D5 旧 0／新 341 条 CLI（#106）', oldCliCount + '/' + newCliCount);
ok(noCli.length === 95, 'D5 缺口 95 条（#81 non-exec 110 − 漂移 15）', noCli.length + ' 条');
ok(legacyBothDifferent + legacyCardOnly === 22, 'D5 legacy 卡级 code ≠ Sheet CLI 22/22（18 双命令＋4 卡级单侧，B-S1-1）', `${legacyBothDifferent}+${legacyCardOnly}`);
ok(newFile.dom.cardCodeVerbatimEq === 435 && newFile.dom.cardCodeUnescapeEq === 436, 'D5 卡级 code 435/436 逐字（1 条实体转义，A-1）', `${newFile.dom.cardCodeVerbatimEq}/${newFile.dom.cardCodeUnescapeEq}`);
ok(newFile.dom.staticButtonsWithActionId === 1308, 'D5/D6 每卡 3 按钮＝静态 markup 1,308（A-4）', String(newFile.dom.staticButtonsWithActionId));
ok(newFile.derived.cliDatedCount === 222, 'D5 冻结绝对日期命令 222/341（B-S2-5）', `${newFile.derived.cliDatedCount}/${newFile.derived.cliCount}`);
ok(om.searchPlaceholder && nm.searchPlaceholder && om.hitCountText && nm.hitCountText && om.emptyText && nm.emptyText, 'D6 搜索文案逐字两侧相同', 'placeholder/hit/empty');
ok(om.backTop === false && nm.backTop === true, 'D6 返回顶部：旧无／新有（L-15）', String(om.backTop) + '/' + String(nm.backTop));
ok(om.keyboardEnter === true && nm.keyboardEnter === true, 'D6 键盘可达＝能力对等扩展（两侧都有 Enter，A-3）', String(om.keyboardEnter) + '/' + String(nm.keyboardEnter));
ok(om.sheetPreview && nm.sheetPreview, 'D6 Sheet 实时预览两侧都有（L-08 形态差异）', String(om.sheetPreview) + '/' + String(nm.sheetPreview));
ok(om.sheetValidate === true && nm.sheetValidate === false, 'D6 必填校验：旧有／新无（登记缺口）', String(om.sheetValidate) + '/' + String(nm.sheetValidate));
ok(old.css.fontStack === true && newFile.css.fontStack === false, 'D6 正文字体栈：旧有／新无（H-06 偏离登记，B-S2-6）', String(old.css.fontStack) + '/' + String(newFile.css.fontStack));
ok(so.blockResidual === 0, 'D7 块口径体积等式闭合（残差 0）', `${so.blockSum} vs ${so.total}`);
ok(chunks.innerDeltaSum + chunks.shellDelta === chunks.delta, 'D7 增减分块和 ＋ 标签壳 ＝ 头条 delta（B-S2-4／A-S3-1）', `${chunks.innerDeltaSum}+${chunks.shellDelta}=${chunks.delta}`);
ok(newFile.sha256 === manifest.modes.file.artifact.sha256, 'D7 产物 sha256 与 manifest 一致（确定性）', newFile.sha256.slice(0, 16) + '…');
// 穷举对账（B §4.5-3）：所有可枚举差异键都有登记行覆盖，且被引用的行真实存在。
const rowItems = new Set(rows.map((r) => r.item));
const uncovered = enumDiffs.filter((d) => !d.coveredBy || !rowItems.has(d.coveredBy));
ok(uncovered.length === 0, '穷举对账：可枚举差异键 100% 有登记行覆盖（未登记即红，B §4.5-3）',
  uncovered.length ? JSON.stringify(uncovered.map((d) => d.key)) : `${enumDiffs.length}/${enumDiffs.length} 键已覆盖`);
ok(enumDiffs.some((d) => d.key === 'payload.topKeys'), '穷举对账捕获 payload 顶层键差异（B 反例：+meta_blocks 曾漏登）', enumDiffs.filter((d) => d.key === 'payload.topKeys').map((d) => d.new).join(','));

console.log('LEDGER ' + path.join(OUT, 'ledger.json'));
console.log('LEDGER-SHA256 ' + ledgerSha);
console.log('ROWS ' + rows.length + ' ' + JSON.stringify(byVerdict));
for (const [dim, v] of Object.entries(byDim)) console.log('DIM ' + dim + ' ' + JSON.stringify(v));
console.log('HEADLINE old=' + old.bytes + 'B/' + old.counts.groups + 'g/' + old.counts.subgroups + 'sg/' + old.counts.scenes + 'sc | new=' + newFile.bytes + 'B/' + newFile.counts.groups + 'g/' + newFile.counts.subgroups + 'sg/' + newFile.counts.scenes + 'sc | cli=' + oldCliCount + '->' + newCliCount + ' | promptEq=' + promptEq.length + '/436 | idChanged=' + idChanged.length + ' | cardCode=' + newFile.dom.cardCodeVerbatimEq + '/' + newFile.dom.cardCodeUnescapeEq + ' | dated=' + newFile.derived.cliDatedCount + '/' + newCliCount);
console.log('RESULT: ' + pass + '/' + checks + ' compare-checks');
process.exit(pass === checks ? 0 : 1);
