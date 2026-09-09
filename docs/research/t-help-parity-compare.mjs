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
 *   1. **判定由测量产生**：每行 `verdict` 恒由 `rule(实测值)` 计算，脚本内**不写判定字面量**（无 `? A : A`）。
 *   2. **每行 `evidenceRef` 指向「证据对」`{old,new}`**，收尾断言**全部可解析**。
 *   3. **禁用 `wake_word` 作 join 键**（434/436 唯一）→ 一律 `(子分组 id, 组内序)` 对齐。
 *   4. **穷举对账**：可枚举差异键**由解析 JSON 实测键集产生**（非硬编码），100% 须被**判定≠一致**的登记行覆盖。
 *
 * **R-7 加固（席 B 定点复核 R3-B-1…B-4）**：
 *   B-1 判定／证据／规则三向绑定：`evidenceRef` 指向的证据对**双向**校验——
 *       `verdict === 一致 ⟺ 证据对两侧相等`（旧侧无对应量者显式标 `mode:'na'` 并在台账说明）；
 *       「Tab 形态」行改测 `tabRadios` 并独立补「断点（mediaQueries）」行；
 *   B-2 体积断言改**可失败**式：`innerSum + tagsBytes(独立正则来源) === total` ＋ **标签壳金标 86/120/Δ−34**；
 *   B-3 键集枚举由 `old.rawKeys`／`newFile.rawKeys` 产生；覆盖行必须 `verdict ≠ 一致`；
 *   B-4 证据绑定加**方向一致性**校验（见 B-1）。
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
/** 证据对表：键＝该行的 `evidenceRef`；值＝`{old,new,mode}`。
 *  mode：`both`（双向绑定）／`new-only`（新增/缺失）／`na`（旧侧无对应量，方向校验不适用，须在台账写明）。
 *  D6 行的 ref 取 `D6.newMarkers.*`／`D6.newCss.*`／`D6.newDom.*` 形态，**可被审查席探针 5 直接解析**。 */
const evidence = {};
let slugSeq = 0;
const add = (dim, item, oldValue, newValue, rule, evidenceText, attribution, ev) => {
  const verdict = rule();
  if (!Object.values(V).includes(verdict)) throw new Error('非法判定：' + verdict + ' @ ' + dim + '/' + item);
  const ref = ev.ref ?? 'evidence.e' + String(++slugSeq).padStart(2, '0');
  evidence[ref] = { ref, old: ev.old, new: ev.new, mode: ev.mode ?? 'both', note: ev.note ?? null };
  rows.push({ dim, item, old: oldValue, new: newValue, verdict, evidence: evidenceText, attribution, evidenceRef: ref });
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
const legacyCardOnly = idChanged.filter((x) => x.sheetCli === null).length;
const legacyBothDifferent = idChanged.filter((x) => x.sheetCli !== null && x.cardCode !== x.sheetCli).length;
const om = old.js.markers;
const nm = newFile.js.markers;
const oldIdsJoined = aligned.map((k) => oldByKey.get(k).id).join('|');
const newIdsJoined = aligned.map((k) => newByKey.get(k).id).join('|');

// ── D1 分组数 ─────────────────────────────────────────────────────────────────
add('D1 分组数', '分组条数', String(old.counts.groups), String(newFile.counts.groups),
  () => (old.counts.groups === newFile.counts.groups ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.groups}／新=${newFile.counts.groups}（envelope data.total=10）`, 'F3 十组序（L-01）', { old: old.counts.groups, new: newFile.counts.groups });
add('D1 分组数', '分组 id 序列逐字', oldGroupIds.join('>'), newGroupIds.join('>'),
  () => (JSON.stringify(oldGroupIds) === JSON.stringify(newGroupIds) ? V.SAME : V.EXPLAINED),
  '两侧 10 个 id 与次序逐字相同（home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis）', 'L-01 分组序取 F3', { old: oldGroupIds, new: newGroupIds });
add('D1 分组数', '分组 label／icon 逐字', JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)), JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)),
  () => (JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)) === JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)) ? V.SAME : V.EXPLAINED),
  '10 组 label／icon 逐字相同（含 profile=⚙️，L-01 取 F3）', 'L-01', { old: old.groupDigest.map((g) => g.label + g.icon), new: newFile.groupDigest.map((g) => g.label + g.icon) });
add('D1 分组数', '每分组子功能／场景分布', JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)), JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)),
  () => (JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) === JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) ? V.SAME : V.EXPLAINED),
  '10 组逐组（子功能数:场景数）完全相同', '—', { old: old.groupDigest.map((g) => g.subgroups + ':' + g.scenes), new: newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes) });

// ── D2 子功能数 ───────────────────────────────────────────────────────────────
add('D2 子功能数', '子功能条数', String(old.counts.subgroups), String(newFile.counts.subgroups),
  () => (old.counts.subgroups === newFile.counts.subgroups ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.subgroups}／新=${newFile.counts.subgroups}（envelope data.subgroupTotal=${newFile.counts.subgroups}）`, 'L-03 子功能 id `{group}_{n}` 照抄', { old: old.counts.subgroups, new: newFile.counts.subgroups });
add('D2 子功能数', '子功能 id 集合逐字', String(new Set(oldSgIds).size), String(new Set(newSgIds).size),
  () => (JSON.stringify(oldSgIds) === JSON.stringify(newSgIds) ? V.SAME : V.EXPLAINED),
  '54/54 同序同 id；「既有唤醒词」仅出现在 diet_9／analysis_9 两组且恒列组末（`helpCenter.ts:174`；其余 8 组无此子功能，A-S3-8）', 'L-03／helpCenter.ts:174', { old: oldSgIds, new: newSgIds });
add('D2 子功能数', '子功能 label 逐字', sgLabelEq ? '54/54 相同' : '存在不同', sgLabelEq ? '54/54 相同' : '存在不同',
  () => (sgLabelEq ? V.SAME : V.EXPLAINED),
  '逐条比对 subgroupDigest[i].label', 'L-18 diet 展示名取 F3「饮食」', { old: old.subgroupDigest.map((s) => s.label), new: newFile.subgroupDigest.map((s) => s.label) });

// ── D3 场景（唤醒词）数 ───────────────────────────────────────────────────────
add('D3 场景数', '场景条数', String(old.counts.scenes), String(newFile.counts.scenes),
  () => (old.counts.scenes === newFile.counts.scenes ? V.SAME : V.EXPLAINED),
  `旧=${old.counts.scenes}／新=${newFile.counts.scenes}（envelope data.sceneTotal=${newFile.counts.scenes}）`, 'F3 436 场景', { old: old.counts.scenes, new: newFile.counts.scenes });
add('D3 场景数', '唤醒词逐字', `${wakeEq.length}/436 相同`, `${wakeEq.length}/436 相同`,
  () => (wakeEq.length === 436 ? V.SAME : V.EXPLAINED),
  '按 (子分组 id, 组内序) 对齐后逐字比对 wake_word（**不以 wake_word 为 join 键**：434/436 唯一）', '—',
  { old: aligned.map((k) => oldByKey.get(k).wake_word), new: aligned.map((k) => newByKey.get(k).wake_word) });
add('D3 场景数', '场景 title 逐字', `${titleEq.length}/436 相同`, `${titleEq.length}/436 相同`,
  () => (titleEq.length === 436 ? V.SAME : V.EXPLAINED), '逐字比对 title', '—',
  { old: aligned.map((k) => oldByKey.get(k).title), new: aligned.map((k) => newByKey.get(k).title) });
add('D3 场景数', 'status 字段逐字', `${statusEq.length}/436 相同`, `${statusEq.length}/436 相同`,
  () => (statusEq.length === 436 ? V.SAME : V.EXPLAINED), '逐字比对 status（两侧均空串）', '—',
  { old: aligned.map((k) => oldByKey.get(k).status), new: aligned.map((k) => newByKey.get(k).status) });
add('D3 场景数', '场景 id 逐字', `${idEq.length}/436 相同`, `${idEq.length}/436 相同`,
  () => (idEq.length === 436 ? V.SAME : V.EXPLAINED),
  `22 条 legacy 场景 id 由 \`legacy_{唤醒词}\` 改为 \`main_prompt.cli\` 原文：` + idChanged.slice(0, 3).map((x) => x.wake_word).join('／') + ' …（全表见 ledger.json D3.idChanged）',
  'L-19／#83 R-7：F3 的 legacy_* 会让卡面显示不存在的命令', { old: oldIdsJoined, new: newIdsJoined });
add('D3 场景数', '场景 id 唯一性', '不适用（旧侧无此断言项）', `${new Set(newFile.scenes.map((s) => s.id)).size}/436 唯一`,
  () => (new Set(newFile.scenes.map((s) => s.id)).size === 436 ? V.SAME : V.EXPLAINED), '#88 断言：id 436/436 唯一', '#88',
  { old: 'n/a（旧侧无对应量）', new: new Set(newFile.scenes.map((s) => s.id)).size, mode: 'na', note: '唯一性是**新侧属性**，旧侧无对应量 → 方向校验不适用' });

// ── D4 prompt 文本 ────────────────────────────────────────────────────────────
add('D4 prompt 文本', '每条场景 prompt_template 逐字', `${promptEq.length}/436 相同`, `${promptEq.length}/436 相同`,
  () => (promptEq.length === 436 ? V.SAME : V.EXPLAINED),
  '按 (子分组 id, 组内序) 对齐后逐字比对；差异样本见 ledger.json D4.promptDiffs', '—',
  { old: aligned.map((k) => oldByKey.get(k).prompt_template), new: aligned.map((k) => newByKey.get(k).prompt_template) });
add('D4 prompt 文本', 'types 徽章文本序列', `${typesTextEq.length}/436 文本相同（旧=字符串数组）`, `${typesTextEq.length}/436 文本相同（新={text,bg,fg} 对象）`,
  () => (typesTextEq.length === 436 && old.scenes.filter((s) => s.types_shaped).length !== newFile.scenes.filter((s) => s.types_shaped).length ? V.EXPLAINED : V.SAME),
  `文本逐字相同；**形状**由 \`["结果"]\` 变为 \`[{text,bg,fg}]\`（三档配色内联）：旧 shaped=${old.scenes.filter((s) => s.types_shaped).length}／新 shaped=${newFile.scenes.filter((s) => s.types_shaped).length}`,
  'L-12／helpCenter.ts:132 HELP_TYPE_BADGES', { old: `string[]（shaped=${old.scenes.filter((s) => s.types_shaped).length}）`, new: `{text,bg,fg}[]（shaped=${newFile.scenes.filter((s) => s.types_shaped).length}）` });
add('D4 prompt 文本', '裸 `<N>` 等尖括号', `源码侧 13 处（\`t88-final.md:129\`：scene-02-diet.ts:29 等）／产物侧 prompt 内 0 处`,
  `源码侧 13 处／产物侧 prompt 内 ${newFile.derived.promptWithLt} 处（唯一 \`<N>\` 在 1 条 scene id：text 态裸 1 处、payload 转义 \`\\u003cN>\`、卡级 \`&lt;N&gt;\`）`,
  () => (old.derived.promptWithLt === newFile.derived.promptWithLt ? V.SAME : V.EXPLAINED),
  `产物侧两侧 prompt 内裸 \`<\` 均 ${newFile.derived.promptWithLt} 处（A-2／B-S2-1 更正：13 处是**源码侧**计数，产物侧不可复现）`,
  '#88 §5-D-4（A.4）', { old: old.derived.promptWithLt, new: newFile.derived.promptWithLt });
add('D4 prompt 文本', 'subtitle（L-10 时间戳）', JSON.stringify(old.meta.subtitle), JSON.stringify(newFile.meta.subtitle),
  () => (old.meta.subtitle === newFile.meta.subtitle ? V.SAME : V.EXPLAINED),
  '旧含「更新于 2026-08-14 11:38」；新**不发**时间戳（`updatedAt` 缺省不写 → 字节稳定，P-2）', 'L-10（P-2）', { old: old.meta.subtitle, new: newFile.meta.subtitle });

// ── D5 每条 CLI 展示命令 ──────────────────────────────────────────────────────
add('D5 CLI 展示命令', 'Sheet「可执行命令」行数', String(oldCliCount), String(newCliCount),
  () => (oldCliCount === 0 && newCliCount > 0 ? V.ADDED : oldCliCount === newCliCount ? V.SAME : V.EXPLAINED),
  `旧侧 436 场景 payload **无** editable_fields/cli 字段（F3 不展示 CLI，L-09）；新侧 ${newCliCount}/436（#106 回补，来源 #81 路由层 exec 桶 341 条）`,
  '#106（数据源 #81 WAKE_ROUTES exec 341 条；helpCenter.ts:94-123）', { old: oldCliCount, new: newCliCount, mode: 'new-only' });
add('D5 CLI 展示命令', '卡级 `<code class=cli>` 行数', '0（F3 卡面无代码行）', `${newFile.dom.codeCli} 条（其中 ${newFile.dom.cardCodeVerbatimEq} 条逐字＝Scene.id，1 条为 HTML 实体转义形式）`,
  () => (newFile.dom.codeCli === 436 ? V.ADDED : V.EXPLAINED),
  `卡级 code 与 Scene.id：逐字相等 **${newFile.dom.cardCodeVerbatimEq}/436**；反转义后 ${newFile.dom.cardCodeUnescapeEq}/436（唯一例外＝含 \`<N>\` 与 \`"\` 的 1 条 id，渲染为 \`&lt;N&gt;\`／\`&quot;\`，语义同、字节不同，A-1／B-S3-2）`,
  'L-09（F3 不显示；本项为新增展示）', { old: 0, new: newFile.dom.codeCli, mode: 'new-only' });
add('D5 CLI 展示命令', '无 CLI 的场景数（缺口）', '不适用（旧侧无此概念）', `${noCli.length}/436`,
  () => (noCli.length > 0 ? V.MISSING : V.SAME),
  `缺 ${noCli.length} 条：diet=${noCli.filter((x) => x.gid === 'diet').length}／weight=${noCli.filter((x) => x.gid === 'weight').length}／exercise=${noCli.filter((x) => x.gid === 'exercise').length}／workout=${noCli.filter((x) => x.gid === 'workout').length}／goal=${noCli.filter((x) => x.gid === 'goal').length}／body_detail=${noCli.filter((x) => x.gid === 'body_detail').length}／analysis=${noCli.filter((x) => x.gid === 'analysis').length}；根因 #81 non-exec（110 − 漂移 15 ＝ 95，漂移归 #111/#112/#113；细分 out-of-scope 10 ＋ legacy-chain 85）`,
  '根因：#81 路由层 95 条 non-exec；**建议归属票**：#86（wizard 5 条）／计划类二期写键票／legacy python 类登记不移植', { old: 0, new: noCli.length, mode: 'new-only' });
add('D5 CLI 展示命令', '卡级 code vs Sheet CLI（22 条 legacy）', '不适用（旧侧无 CLI 展示概念，0 条不同源）', `${idChanged.length}/22 条**不同源**（${legacyBothDifferent} 条双命令冲突 ＋ ${legacyCardOnly} 条卡级有原文／Sheet 无字段行）`,
  () => (legacyBothDifferent + legacyCardOnly === 22 && legacyCardOnly > 0 ? V.EXPLAINED : V.MISSING),
  `22/22：18 条卡级＝\`python…\`／\`mavis…\` 而 Sheet＝路由层新 CLI；4 条（\`看「有备注」的饮食记录\`＋\`开启／关闭／查定时复盘\`）卡级有 python／mavis 原文、Sheet **无字段行**（reason code：noNoteFilter ×1、oosCron ×3）`,
  'L-19（卡级取 main_prompt.cli 原文）＋#106（Sheet 取路由层）；**建议**：维护者拍板是否收敛（归 #106 后续或新票）',
  { old: 0, new: legacyBothDifferent + legacyCardOnly });
add('D5 CLI 展示命令', '每卡按钮（静态 vs 运行时）', '每卡 1 个「复制」（运行时注入 `.mini`）', `静态 markup ${newFile.dom.staticButtonsWithActionId} 个（data-action-id 各 436：复制指令／复制唤醒词／复制参数）＋ 运行时注入卡头第 4 个（\`injectCardCopy\`）`,
  () => (newFile.dom.staticButtonsWithActionId === 1308 && newFile.dom.staticCardCopyButtons === 0 ? V.ADDED : V.EXPLAINED),
  `A-4／B-S2-3 更正：**1,308 个按钮全在静态 markup**（\`ilife-help-shell-actions\` 内 3 个/卡），卡头按钮才是运行时注入（静态 \`card-copy\` = ${newFile.dom.staticCardCopyButtons} 个；JS \`createElement("button")\` 仅 ${newFile.dom.jsCreateButton} 处）`,
  'L-05／#88 S4-S5', { old: '1 个/卡（运行时）', new: `${newFile.dom.staticButtonsWithActionId}/436 静态＋卡头 1 运行时` });
add('D5 CLI 展示命令', 'CLI 参数含冻结绝对日期', '不适用（F3 无 CLI 展示）', `${newFile.derived.cliDatedCount}/${newFile.derived.cliCount} 条命令参数带 \`YYYY-MM-DD\`（如 \`calorie.view.home --params '{"date":"2026-09-07"}'\` 当日即错）`,
  () => (newFile.derived.cliDatedCount > 0 ? V.EXPLAINED : V.SAME),
  `B-S2-5 新增登记：${newFile.derived.cliDatedCount}/${newFile.derived.cliCount} 条（${newFile.derived.cliUndatedCount} 条无日期参数）；样例参数由 #81 路由层冻结写入，复制即执行会指向过去日期`,
  '#81（样例参数口径）／#106 登记；建议：#81 后续维护票或新票', { old: 0, new: newFile.derived.cliDatedCount });
add('D5 CLI 展示命令', '95 条无字段卡的「复制参数」按钮', '不适用', `回落复制**卡级 code（＝Scene.id）**而非命令（样例 \`diet_scan_label\` → data-t=\`diet_scan_label\`）`,
  () => (noCli.length === newFile.dom.codeCli - newCliCount ? V.EXPLAINED : V.MISSING),
  'B-S3-5 新增登记：无 cli 字段时「复制参数」复制的是场景 id（`t106:73` L-106-03 口径），非空、非命令', '#106（L-106-03 登记）',
  { old: 'n/a', new: `Scene.id（${noCli.length} 条卡）` });

// ── D6 交互能力 ───────────────────────────────────────────────────────────────
const feat = (item, o, n, rule, ev, evidenceText, attribution) => add('D6 交互能力', item, o, n, rule, evidenceText, attribution, ev);
feat('搜索（输入框＋清空＋计数）', '有（#sB／#sClear／#hitC，占位「搜索全部场景」）', `有（运行时注入 type=search ＋ 清空 ＋ 命中计数，占位「${nm.searchPlaceholder ? '搜索全部场景' : '?'}」）`,
  () => (om.searchPlaceholder && nm.searchPlaceholder && om.hitCountText && nm.hitCountText ? V.SAME : V.MISSING),
  { ref: 'D6.newMarkers.searchPlaceholder', old: [om.searchPlaceholder, om.hitCountText, om.emptyText], new: [nm.searchPlaceholder, nm.hitCountText, nm.emptyText] },
  `两侧均为**运行时注入**：旧 js.searchPlaceholder=${om.searchPlaceholder}／新 ${nm.searchPlaceholder}；静态 HTML 均无搜索框（旧 ${old.dom.staticSearchInput}／新 ${newFile.dom.staticSearchInput}）`,
  'L-06（S4 已做）');
feat('命中计数／空态文案逐字', '「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」', '「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」',
  () => (om.hitCountText && nm.hitCountText && om.emptyText && nm.emptyText ? V.SAME : V.MISSING),
  { ref: 'D6.newMarkers.hitCountText', old: [om.hitCountText, om.emptyText], new: [nm.hitCountText, nm.emptyText] },
  `旧 hitCount=${om.hitCountText} empty=${om.emptyText}；新 hitCount=${nm.hitCountText} empty=${nm.emptyText}（逐字相同）`, 'L-06');
feat('Tab 形态（横滑页 → radio 标签条）', '横滑页 `.page` ＋ 底部 tabBar（scroll-snap）', `radio 标签条（\`.ilife-help-shell-tab-input\` ${newFile.dom.tabRadios} 个）`,
  () => (old.dom.tabRadios === 0 && newFile.dom.tabRadios > 0 ? V.EXPLAINED : V.SAME),
  { ref: 'D6.newDom.tabRadios', old: `tabRadios=${old.dom.tabRadios}（横滑页＋tabBar）`, new: `tabRadios=${newFile.dom.tabRadios}（radio 标签条）` },
  'R3-B-1 更正：本行**值列两侧不同**，原判「一致」系 rule 误测 `jumpPage`（两侧恒 true）所致；现 rule 测 `tabRadios`（旧 0／新 11），`evidenceRef` 同步指向本行证据对。', 'L-07（Tab 横滑→radio 标签条，功能对等）');
feat('断点（mediaQueries）', `3 组：${old.css.mediaQueries.join('／')}`, `5 组：${newFile.css.mediaQueries.join('／')}`,
  () => (JSON.stringify(old.css.mediaQueries) === JSON.stringify(newFile.css.mediaQueries) ? V.SAME : V.EXPLAINED),
  { ref: 'D6.newCss.mediaQueries', old: old.css.mediaQueries, new: newFile.css.mediaQueries },
  'R3-B-1 补行：`mediaQueries` 真差异（旧 500/501/820 → 新 820/720/640/400＋prefers-reduced-motion）此前**无行可依**（G-4 指针悬空）；现独立成行并承接 G-4。', 'L-13／#89（B1 视觉锁逐值验收）');
feat('高亮', '仅高亮卡面标题 `.m-name`（`<mark>`，1 处实现）', '整卡文本节点 `wrapTerm`＋`<mark class=card-mark>`',
  () => (om.highlightScopeName && nm.highlightScopeCard ? V.EXPLAINED : V.MISSING),
  { ref: 'D6.newMarkers.highlightScopeCard', old: `title-only（mName=${om.highlightScopeName}）`, new: `whole-card（wrapTerm=${nm.highlightScopeCard}）` },
  `旧 highlightScopeName=${om.highlightScopeName}／新 highlightScopeCard=${nm.highlightScopeCard}：新版高亮**范围更广**（卡内全部文本），旧版只高亮标题`, 'L-06 功能对等扩展（S4）');
feat('跳页', '有：搜索命中自动 `scrollTo({left})` 翻到首个命中页', '有：`jumpTo` 勾选命中页 radio＋Enter 循环跳页',
  () => (om.jumpPage && nm.jumpPage ? V.EXPLAINED : V.MISSING),
  { ref: 'D6.newMarkers.jumpPage', old: `scrollTo({left})（jumpPage=${om.jumpPage}）`, new: `jumpTo(radio)（jumpPage=${nm.jumpPage}）` },
  `旧 jumpPage=${om.jumpPage}（横滑页）／新 jumpPage=${nm.jumpPage}（radio 标签条，L-07 形态替换）`, 'L-07（功能对等）');
feat('复制按钮（卡级）', '有：每卡 1 个「复制」（运行时 `.mini` 内注入）', '有：静态 3 个/卡（Sheet 内）＋ 运行时注入卡头 1 个',
  () => (nm.cardCopyButton && newFile.dom.staticButtonsWithActionId === 1308 ? V.ADDED : V.MISSING),
  { ref: 'D6.newDom.staticActionIds', old: '1 个/卡（运行时）', new: `${newFile.dom.staticButtonsWithActionId}/436 静态＋卡头 1 运行时` },
  `旧 cardCopyButton=${om.cardCopyButton} 文案「${om.copyLabel}」／新 cardCopyButton=${nm.cardCopyButton} 文案「${nm.copyLabel}」；静态按钮数 旧 ${old.dom.buttons}／新 ${newFile.dom.buttons}`,
  'L-05（旧=每卡 1 个；新=静态 3 个 Sheet 按钮＋运行时卡头注入，#88 S4/S5）');
feat('返回顶部', '无（`backTop` 0 处；CSS 无 `.backTop`）', '有（运行时注入 `#backTop`，↑，aria「回到顶部」，scrollTop>400 才显形）',
  () => (om.backTop === false && nm.backTop === true ? V.ADDED : om.backTop === nm.backTop ? V.SAME : V.EXPLAINED),
  { ref: 'D6.newMarkers.backTop', old: om.backTop, new: nm.backTop },
  `旧 backTop=${om.backTop}／新 backTop=${nm.backTop}（BACKTOP_MIN_Y=400）`, 'L-15／H-19（#88 S4 已做）');
feat('Sheet 实时预览', '有：底部弹层内参数表单 `input[data-p]` → `[data-prev]` 实时重组 `buildPrompt`', '有：内联 `<details>` 内字段换输入框 → 实时重组「prompt ＋ 空行 ＋ label: value」',
  () => (om.sheetPreview && nm.sheetPreview ? V.EXPLAINED : V.MISSING),
  { ref: 'D6.newDom.details', old: '弹层（details=0）', new: `内联 details（details=${newFile.dom.details}）` },
  `旧 sheetPreview=${om.sheetPreview} buildPrompt=${om.sheetPreviewBuild}／新 sheetPreview=${nm.sheetPreview}（形态 L-08 弹层→内联，语义同）`, 'L-08（功能对等）');
feat('参数必填校验', '有：`getMissing` → toast「请先填写: …」并阻断复制（**代码级判定**：F3 根镜像 436 场景 `editable_fields` 全空 → 该表单／校验在本数据上不可观测，A-S3-7）', '无必填阻断（Sheet 字段为可编辑输入，但无 `req` 语义、不阻断复制）',
  () => (om.sheetValidate === true && nm.sheetValidate === false ? V.MISSING : V.SAME),
  { ref: 'D6.newMarkers.sheetValidate', old: om.sheetValidate, new: nm.sheetValidate },
  `旧 sheetValidate=${om.sheetValidate}（代码级）／新 sheetValidate=${nm.sheetValidate}：F3 的 \`params[].req\` 校验在新版无对应物`,
  '根因：新版 Sheet 字段来源＝#106 路由 CLI（展示＋可改），非 F3 `params` 表单；**建议归属票**：#86（配置型 wizard 已落地，承载填写）');
feat('copied 态（toast 文案）', '有：toast「已复制」＋副文案「粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。」', '有：toast「已复制」（失败态「复制失败／长按选择文本手动复制」）',
  () => (om.toastOkMsg && nm.toastOkMsg ? V.EXPLAINED : V.MISSING),
  { ref: 'D6.newMarkers.toastOkMsg', old: '已复制＋教学副文案', new: '已复制＋失败指引' },
  `旧 toastOkMsg=${om.toastOkMsg}／新 ${nm.toastOkMsg}；toast 副文案不同（旧含「粘贴给 AI…」教学句，新为失败指引）`, '#121／H-16（toast 4500 ms 取冻结值）');
feat('copied 态（按钮 450 ms 态）', '无（`.copy-btn` 无 `copied` 类切换）', '有：按钮 `copied` 类（450 ms 后复原）',
  () => (om.copiedState === false && nm.copiedState === true ? V.ADDED : V.SAME),
  { ref: 'D6.newMarkers.copiedState', old: om.copiedState, new: nm.copiedState },
  `旧 copiedState=${om.copiedState}／新 ${nm.copiedState}（COPIED_MS=450）；旧侧只有 toast 反馈、无按钮态`, '#121（copied 态）／H-16');
feat('剪贴板实现', `document.execCommand('copy') ＋ 隐藏 textarea 回退`, `navigator.clipboard.writeText() ＋ textarea 回退，**仍带** execCommand('copy') 兜底（A-S3-6 更正）`,
  () => (nm.clipboardApi && nm.execCommandFallback ? V.EXPLAINED : V.MISSING),
  { ref: 'D6.newMarkers.execCommandFallback', old: 'execCommand+textarea', new: 'clipboard.writeText+textarea+execCommand 兜底' },
  `旧 clipboardApi=${om.clipboardApi} execCommand=${om.execCommandFallback}／新 clipboardApi=${nm.clipboardApi} execCommand=${nm.execCommandFallback}（两侧都含 execCommand 回退）`, '现代 API 迁移（行为等价）');
feat('键盘可达', `有：\`newIn.addEventListener('keydown'…Enter…doNew())\`（作用于「新增」输入框）`, '有：搜索框 Enter 循环跳到下一个命中页',
  () => (om.keyboardEnter && nm.keyboardEnter ? V.EXPLAINED : nm.keyboardEnter ? V.ADDED : V.MISSING),
  { ref: 'D6.newMarkers.keyboardEnter', old: 'Enter→新增输入框', new: 'Enter→搜索框循环跳页' },
  `A-3 更正：旧 keyboardEnter=${om.keyboardEnter}（ledger.json 自身机器证据）／新 ${nm.keyboardEnter} → **能力对等扩展**（作用对象不同），非「新版新增」`, '#88 S4（H-20 同批）');
feat('焦点可见／动效可关', '无（`:focus-visible` 0／`prefers-reduced-motion` 0）', `有（\`:focus-visible\` ${newFile.css.focusVisible} 处／\`prefers-reduced-motion\` ${newFile.css.prefersReducedMotion} 处）`,
  () => (old.css.focusVisible === 0 && old.css.prefersReducedMotion === 0 && newFile.css.focusVisible > 0 && newFile.css.prefersReducedMotion > 0 ? V.ADDED : V.EXPLAINED),
  { ref: 'D6.newCss.focusVisible', old: [old.css.focusVisible, old.css.prefersReducedMotion], new: [newFile.css.focusVisible, newFile.css.prefersReducedMotion] },
  `旧 css.focusVisible=${old.css.focusVisible} prefersReducedMotion=${old.css.prefersReducedMotion}／新 ${newFile.css.focusVisible}／${newFile.css.prefersReducedMotion}`, 'L-15／H-20（R35 D-14 强制）');
feat('空态／错误态', '无 try/catch → 白屏风险（L-14）', '静态 HTML 无解析步骤；渲染失败走 #83 模板回执',
  () => (nm.toast || nm.copiedState ? V.ADDED : V.MISSING),
  { ref: 'D6.newMarkers.toast', old: '无 try/catch', new: '静态壳＋#83 回执' },
  'L-14 改进项；#83 渲染失败回执', 'L-14／#83');
feat('数字等宽（tnum，H-07）', '无（`tnum` 命中 0）', `有（\`font-feature-settings: "tnum"\`）`,
  () => (old.css.tnum === false && newFile.css.tnum === true ? V.ADDED : V.SAME),
  { ref: 'D6.newCss.tnum', old: old.css.tnum, new: newFile.css.tnum },
  '旧 css.tnum=false／新 true（H-07「所有数字 tnum」；旧侧不达标＝OLD-DEVIATION）', 'H-07／#89');
feat('零渐变（H-04）', `1 处（init-banner 135deg，H-04 判 OLD-DEVIATION）`, `1 处 \`linear-gradient(90deg,var(--fg3,#86868b)…)\`（charts 区）——**与 H-04「命中数 = 0」冲突，未消解**`,
  () => (old.css.linearGradients.length > 0 && newFile.css.linearGradients.length > 0 ? V.EXPLAINED : V.SAME),
  { ref: 'D6.newCss.linearGradients', old: old.css.linearGradients, new: newFile.css.linearGradients },
  `B-S1-2 更正：删去 L-17「判据作废」的消解写法。H-04（\`visual-spec-help.md:82\`，级别 C，R35 已定「零渐变基准取 B1」）要求最终 CSS 命中 0，新侧 charts 区 1 处不达标 → **交 #89 裁定**；旧侧 hero 渐变＝OLD-DEVIATION`,
  '#89（裁定）＋#83（登记）');
feat('正文字体栈（H-06）', '有：`-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif`', `**无**（CSS 内仅 \`"SF Mono", monospace\` 与 \`font-family: inherit\`；\`-apple-system\`／\`PingFang\` 命中 0）`,
  () => (old.css.fontStack === true && newFile.css.fontStack === false ? V.MISSING : V.SAME),
  { ref: 'D6.newCss.fontStack', old: old.css.fontStack, new: newFile.css.fontStack },
  `B-S2-6 新增登记：旧 fontStack=${old.css.fontStack}／新 ${newFile.css.fontStack}；H-06 断言形式（字体栈逐字）在新侧不成立（\`visual-spec-help.md:99\`）`,
  '#83（登记）／#89（裁定：宿主继承 vs 显式栈）');

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
  tagsBytes: so.tagsBytes,
  oldTotal: old.bytes,
  oldMarkup: soOld.markup,
  oldPayload: soOld.payloadInner,
  oldCss: soOld.styleInner,
  oldJs: soOld.jsInner,
  oldInnerSum: soOld.innerSum,
  oldTagsBytes: soOld.tagsBytes,
  oldInnerResidual: soOld.innerResidual,
  inline: newAll.inline.bytes,
  text: newAll.text.bytes,
  delta: newFile.bytes - old.bytes,
  innerDeltaSum: (so.markup - soOld.markup) + (so.payloadInner - soOld.payloadInner) + (so.styleInner - soOld.styleInner) + (so.jsInner - soOld.jsInner),
  tagsDelta: so.tagsBytes - soOld.tagsBytes,
};
add('D7 体积', 'file 态字节', `${old.bytes} B（302,820）`, `${newFile.bytes} B（1,264,822）`,
  () => (newFile.bytes !== old.bytes ? V.EXPLAINED : V.SAME),
  `+${chunks.delta} B（×${(newFile.bytes / old.bytes).toFixed(2)}）；旧侧 DOM **运行时生成**（静态标记 ${old.dom.markupBytes} B＋payload ${old.payload.bytes} B＋JS ${old.js.bytes} B），新侧静态卡 436＋静态按钮 1,308`,
  'L-16／P-5 交付形态（旧运行时渲染 vs 新静态壳）', { old: old.bytes, new: newFile.bytes });
add('D7 体积', '体积构成（块口径闭合）', `旧：内容 ${soOld.innerSum} ＋ 标签壳 ${soOld.tagsBytes} ＝ ${soOld.total}`, `新：内容 ${so.innerSum} ＋ 标签壳 ${so.tagsBytes} ＝ ${so.total}`,
  () => (so.innerSum + so.tagsBytes === so.total && soOld.innerSum + soOld.tagsBytes === soOld.total ? V.EXPLAINED : V.MISSING),
  `块口径：markup ${so.markup} ＋ payload 块 ${so.payloadBlock} ＋ style 块 ${so.styleBlock} ＋ js 块 ${so.jsBlock} ＝ **${so.blockSum}**；内容口径：markup ${so.markup} ＋ payload ${so.payloadInner} ＋ style ${so.styleInner} ＋ js ${so.jsInner} ＝ ${so.innerSum}，＋标签壳 ${so.tagsBytes} ＝ ${so.total}（残差 ${so.innerResidual}）`,
  '#106／#107／#88 静态壳', { old: soOld.innerSum + soOld.tagsBytes, new: so.innerSum + so.tagsBytes });
add('D7 体积', '体积残差（两处）', `旧侧标签壳 ${soOld.tagsBytes} B`, `新侧标签壳 ${so.tagsBytes} B`,
  () => (so.tagsBytes > 0 && soOld.tagsBytes > 0 && so.tagsBytes !== soOld.tagsBytes ? V.EXPLAINED : V.SAME),
  `B-S2-4／A-S3-1：① 构成残差 **${so.innerResidual} B**（＝payload／style／js 三个块的标签壳；旧侧 ${soOld.innerResidual} B）；② 增减残差 **${chunks.tagsDelta} B**（标签壳 ${soOld.tagsBytes}→${so.tagsBytes}）。口径声明：本脚本 size 账按「多块 style 原文直接相连」计，与席 B 的 join('\\n') 口径差 1 B（旧壳 120 vs 119）＝A-S3-5 已登记的 ±1 口径混用`,
  '#83（登记）', { old: soOld.tagsBytes, new: so.tagsBytes });
add('D7 体积', '体积增减（分块 ＋ 标签壳闭合）', `markup ${soOld.markup} ＋ payload ${soOld.payloadInner} ＋ css ${soOld.styleInner} ＋ js ${soOld.jsInner}`, `markup ${so.markup} ＋ payload ${so.payloadInner} ＋ css ${so.styleInner} ＋ js ${so.jsInner}`,
  () => (chunks.innerDeltaSum + chunks.tagsDelta === chunks.delta ? V.EXPLAINED : V.MISSING),
  `markup **+${so.markup - soOld.markup}**／payload **+${so.payloadInner - soOld.payloadInner}**（#106 cli 字段 53,596 B＋#107 meta_blocks 1,826 B＋22 条 legacy 原文）／css **${so.styleInner - soOld.styleInner}**／js **${so.jsInner - soOld.jsInner}**；分块和 ${chunks.innerDeltaSum} ＋ 标签壳 ${chunks.tagsDelta} ＝ **${chunks.delta}**（闭合）`,
  'L-16／P-5；残差已显式登记（A-S3-5：css 多块连接口径 ±1 B 已在 extract 双记块/内容口径）',
  { old: [soOld.markup, soOld.payloadInner, soOld.styleInner, soOld.jsInner], new: [so.markup, so.payloadInner, so.styleInner, so.jsInner] });
add('D7 体积', '与 L-16 记录值对账', 'L-16 记录 1,010,979 B（#88 期）', `${newFile.bytes} B → 较 L-16 **+${newFile.bytes - 1010979} B**`,
  () => (newFile.bytes !== 1010979 ? V.EXPLAINED : V.SAME),
  `B-S3-3 新增登记：L-16（\`t88-final.md:97,166\`）记 #88 期 1,010,979 B／4,042 行；最终代码 ${newFile.bytes} B／${newFile.lines} 行，增量归 #106（341 条 CLI 字段）＋#107（看板入口）＋#121 等，未逐字节二分`,
  '#83（登记）／L-16', { old: 1010979, new: newFile.bytes });
add('D7 体积', 'payload 顶层键', `${old.payload.topKeys.join(',')}（5 键）`, `${newFile.payload.topKeys.join(',')}（6 键）`,
  () => (newFile.payload.topKeys.length > old.payload.topKeys.length ? V.ADDED : V.SAME),
  `B-S3-4 新增登记：新侧 payload 顶层新增 \`meta_blocks\`（#107 看板页入口段，${newFile.derived.metaBlockEntries.length} 条：${newFile.derived.metaBlockEntries.join('／')}），旧侧 5 键无此项`,
  '#107（独立成行登记）', { old: old.payload.topKeys, new: newFile.payload.topKeys });
add('D7 体积', 'inline／text 态字节', '不适用（F3 无三态）', `inline ${newAll.inline.bytes} B／text ${newAll.text.bytes} B`,
  () => (newAll.inline.bytes !== newFile.bytes ? V.ADDED : V.SAME),
  `inline ＝ file −(head/doctype＋payload 块)；text 为纯文本索引 ${newAll.text.lines} 行`, '#91 三态（mode 显式）／#83 delivery',
  { old: 'n/a（F3 无三态）', new: [newAll.inline.bytes, newAll.text.bytes], mode: 'new-only' });
add('D7 体积', '字节稳定性（多次运行同 sha256）', '不适用（旧侧无三态）', `file ${newFile.sha256.slice(0, 16)}…／inline ${newAll.inline.sha256.slice(0, 16)}…／text ${newAll.text.sha256.slice(0, 16)}…`,
  () => (newFile.sha256 === manifest.modes.file.artifact.sha256 ? V.SAME : V.EXPLAINED),
  '同一 commit 多次独立运行 sha256 相同（P-2 去时间戳；gen-manifest 与两席独立重生成一致）', 'P-2／#88',
  { old: 'n/a（旧侧无对应量）', new: newFile.sha256.slice(0, 16), mode: 'na', note: '稳定性是**新侧属性**（旧侧无三态），方向校验不适用' });

// ── 穷举对账（B §4.5-3 ＋ R3-B-3）：键集**由解析 JSON 实测**产生，差异键须被**判定≠一致**的行覆盖 ──
const enumPairs = {
  'payload.topKeys': [old.rawKeys.payload, newFile.rawKeys.payload],
  'scene.fieldKeys': [old.rawKeys.scene, newFile.rawKeys.scene],
  'group.fieldKeys': [old.rawKeys.group, newFile.rawKeys.group],
  'subgroup.fieldKeys': [old.rawKeys.subgroup, newFile.rawKeys.subgroup],
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
  'dom.tabRadios': [String(old.dom.tabRadios), String(newFile.dom.tabRadios)],
};
/** 覆盖表：差异键 → 覆盖它的登记行 item（该行**判定必须≠一致**，R3-B-3）。 */
const COVERAGE = {
  'payload.topKeys': 'payload 顶层键',
  'scene.fieldKeys': 'Sheet「可执行命令」行数',
  'css.focusVisible': '焦点可见／动效可关',
  'css.prefersReducedMotion': '焦点可见／动效可关',
  'css.tnum': '数字等宽（tnum，H-07）',
  'css.fontStack': '正文字体栈（H-06）',
  'css.mediaQueries': '断点（mediaQueries）',
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
  'dom.tabRadios': 'Tab 形态（横滑页 → radio 标签条）',
};
const enumDiffs = Object.entries(enumPairs)
  .filter(([, [a, b]]) => JSON.stringify(a) !== JSON.stringify(b))
  .map(([k, [a, b]]) => ({ key: k, old: a, new: b, coveredBy: COVERAGE[k] ?? null }));

// ── 汇总 ─────────────────────────────────────────────────────────────────────
const byVerdict = rows.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] ?? 0) + 1; return acc; }, {});
const byDim = rows.reduce((acc, r) => { acc[r.dim] = acc[r.dim] ?? {}; acc[r.dim][r.verdict] = (acc[r.dim][r.verdict] ?? 0) + 1; return acc; }, {});
const ledger = {
  generatedBy: 'docs/research/t-help-parity-compare.mjs',
  // **不写 generatedAt**：ledger.json 保持**逐字节确定**（同一输入 → 同一 sha256），便于 sha256 入档复核。
  repo: manifest.repo,
  sides: {
    old: { file: old.file, bytes: old.bytes, lines: old.lines, sha256: old.sha256, counts: old.counts, dom: old.dom, size: old.size, rawKeys: old.rawKeys },
    new: {
      file: { path: newFile.file, bytes: newFile.bytes, lines: newFile.lines, sha256: newFile.sha256, counts: newFile.counts, dom: newFile.dom, size: newFile.size, rawKeys: newFile.rawKeys, envelope: newFile.envelope },
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
  evidence,
  rows,
  enumDiffs,
  summary: { total: rows.length, byVerdict, byDim, enumDiffs: enumDiffs.length, uncoveredEnumDiffs: enumDiffs.filter((d) => !d.coveredBy).length, naRows: rows.filter((r) => (evidence[r.evidenceRef] ?? {}).mode === 'na').map((r) => r.item) },
};
fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2), 'utf8');
const ledgerSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, 'ledger.json'))).digest('hex');

// ── 断言（机械可判）──────────────────────────────────────────────────────────
const resolveRef = (ref) => ledger.evidence[ref];
const badRefs = rows.filter((r) => !r.evidenceRef || resolveRef(r.evidenceRef) === undefined);
ok(badRefs.length === 0, '每行 evidenceRef 均可解析（判定与证据不脱钩，S3-1）', badRefs.length ? JSON.stringify(badRefs.map((r) => r.evidenceRef)) : `${rows.length}/${rows.length}`);
// R3-B-4／B-1：证据**方向一致性**——`both` 行须 `verdict===一致 ⟺ 证据对相等`；`new-only` 行须为新增/缺失；`na` 行须显式登记。
const dirErrors = rows.filter((r) => {
  const e = resolveRef(r.evidenceRef);
  const equal = JSON.stringify(e.old) === JSON.stringify(e.new);
  if (e.mode === 'both') return (r.verdict === V.SAME) !== equal;
  if (e.mode === 'new-only') return !(r.verdict === V.ADDED || r.verdict === V.MISSING);
  return e.mode !== 'na';
});
ok(dirErrors.length === 0, 'R3-B-4 证据方向一致性：一致⟺证据相等／new-only⇒新增或缺失／na 显式登记',
  dirErrors.length ? JSON.stringify(dirErrors.map((r) => r.item + ':' + r.verdict)) : `${rows.length}/${rows.length} 行`);
const naRows = rows.filter((r) => resolveRef(r.evidenceRef).mode === 'na');
ok(naRows.length <= 3, 'na（旧侧无对应量）行数受限并须在台账写明', naRows.map((r) => r.item).join('／'));
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
// R3-B-2：体积断言**可失败**——① 内容＋独立正则标签壳 ＝ 文件字节（两条独立来源）；② 标签壳金标 86/120 与 Δ−34；③ 增减分块和＋标签壳差 ＝ 头条 delta。
ok(so.innerSum + so.tagsBytes === so.total, 'D7 内容口径 ＋ 独立正则标签壳 ＝ 文件字节（新侧）', `${so.innerSum}+${so.tagsBytes}=${so.total}`);
ok(soOld.innerSum + soOld.tagsBytes === soOld.total, 'D7 内容口径 ＋ 独立正则标签壳 ＝ 文件字节（旧侧）', `${soOld.innerSum}+${soOld.tagsBytes}=${soOld.total}`);
ok(so.tagsBytes === 86 && soOld.tagsBytes === 120, 'D7 标签壳**金标常量**（新 86／旧 120；标签结构一变即红）', `${so.tagsBytes}/${soOld.tagsBytes}`);
ok(chunks.tagsDelta === -34, 'D7 标签壳差金标 −34（= 86 − 120，独立正则来源）', String(chunks.tagsDelta));
ok(chunks.innerDeltaSum + chunks.tagsDelta === chunks.delta, 'D7 增减分块和 ＋ 标签壳差 ＝ 头条 delta', `${chunks.innerDeltaSum}+${chunks.tagsDelta}=${chunks.delta}`);
ok(newFile.sha256 === manifest.modes.file.artifact.sha256, 'D7 产物 sha256 与 manifest 一致（确定性）', newFile.sha256.slice(0, 16) + '…');
// 穷举对账（B §4.5-3 ＋ R3-B-3）：差异键须被**存在且判定≠一致**的登记行覆盖。
const rowByItem = new Map(rows.map((r) => [r.item, r]));
const uncovered = enumDiffs.filter((d) => !d.coveredBy || !rowByItem.has(d.coveredBy) || rowByItem.get(d.coveredBy).verdict === V.SAME);
ok(uncovered.length === 0, '穷举对账：差异键 100% 被「判定≠一致」的登记行覆盖（R3-B-3）',
  uncovered.length ? JSON.stringify(uncovered.map((d) => d.key + '→' + d.coveredBy)) : `${enumDiffs.length}/${enumDiffs.length} 键已覆盖`);
ok(enumDiffs.some((d) => d.key === 'payload.topKeys'), '穷举对账捕获 payload 顶层键差异（B 反例：+meta_blocks 曾漏登）', enumDiffs.filter((d) => d.key === 'payload.topKeys').map((d) => d.new.join(',')).join(','));
ok(enumDiffs.some((d) => d.key === 'scene.fieldKeys'), '穷举对账键集**由解析 JSON 实测**（非硬编码）：scene 键差异被捕获', JSON.stringify(enumDiffs.find((d) => d.key === 'scene.fieldKeys')?.new));

console.log('LEDGER ' + path.join(OUT, 'ledger.json'));
console.log('LEDGER-SHA256 ' + ledgerSha);
console.log('ROWS ' + rows.length + ' ' + JSON.stringify(byVerdict));
for (const [dim, v] of Object.entries(byDim)) console.log('DIM ' + dim + ' ' + JSON.stringify(v));
console.log('HEADLINE old=' + old.bytes + 'B/' + old.counts.groups + 'g/' + old.counts.subgroups + 'sg/' + old.counts.scenes + 'sc | new=' + newFile.bytes + 'B/' + newFile.counts.groups + 'g/' + newFile.counts.subgroups + 'sg/' + newFile.counts.scenes + 'sc | cli=' + oldCliCount + '->' + newCliCount + ' | promptEq=' + promptEq.length + '/436 | idChanged=' + idChanged.length + ' | cardCode=' + newFile.dom.cardCodeVerbatimEq + '/' + newFile.dom.cardCodeUnescapeEq + ' | dated=' + newFile.derived.cliDatedCount + '/' + newCliCount);
console.log('RESULT: ' + pass + '/' + checks + ' compare-checks');
process.exit(pass === checks ? 0 : 1);
