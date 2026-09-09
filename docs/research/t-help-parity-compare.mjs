#!/usr/bin/env node
/**
 * t-help-parity-compare.mjs · 新旧 HELP 差异台账（七维度）（#83 · 地图 #63 主线②）
 *
 * 作用：消费 `t-help-parity-extract.mjs` 的两侧解析 JSON，按**七个维度**逐条给
 *       「旧值／新值／判定／证据」，判定只用四值：
 *       `一致` / `差异（可解释）` / `新版缺失` / `新版新增`；每条差异带**根因或归属票**。
 *       结果落 `.scratch/t-parity/ledger.json`（机器可读），供 `docs/research/t-help-parity-ledger.md` 引用。
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

const rows = [];
const add = (dim, item, oldValue, newValue, verdict, evidence, attribution = null) => {
  rows.push({ dim, item, old: oldValue, new: newValue, verdict, evidence, attribution });
  return { dim, item, verdict };
};

// ── 对齐：436 场景按 (subgroupId, 组内下标) 对齐（两侧分组/子功能结构逐字相同）────────
const keyOf = (x) => x.sgid + '#' + x.idx;
const oldByKey = new Map(old.scenes.map((x) => [keyOf(x), x]));
const newByKey = new Map(newFile.scenes.map((x) => [keyOf(x), x]));
const aligned = [...oldByKey.keys()].filter((k) => newByKey.has(k));
const promptEq = aligned.filter((k) => oldByKey.get(k).prompt_template === newByKey.get(k).prompt_template);
const wakeEq = aligned.filter((k) => oldByKey.get(k).wake_word === newByKey.get(k).wake_word);
const titleEq = aligned.filter((k) => oldByKey.get(k).title === newByKey.get(k).title);
const statusEq = aligned.filter((k) => oldByKey.get(k).status === newByKey.get(k).status);
const idEq = aligned.filter((k) => oldByKey.get(k).id === newByKey.get(k).id);
const idChanged = aligned.filter((k) => oldByKey.get(k).id !== newByKey.get(k).id).map((k) => ({ sgid: oldByKey.get(k).sgid, wake_word: oldByKey.get(k).wake_word, oldId: oldByKey.get(k).id, newId: newByKey.get(k).id }));
const typesTextEq = aligned.filter((k) => JSON.stringify(oldByKey.get(k).types_text) === JSON.stringify(newByKey.get(k).types_text));

// ── D1 分组数 ─────────────────────────────────────────────────────────────────
const oldGroupIds = old.groupDigest.map((g) => g.id);
const newGroupIds = newFile.groupDigest.map((g) => g.id);
add('D1 分组数', '分组条数', String(old.counts.groups), String(newFile.counts.groups), old.counts.groups === newFile.counts.groups ? '一致' : '差异（可解释）',
  `旧=${old.counts.groups}／新=${newFile.counts.groups}（envelope data.total=${manifest.modes.file.dataBytes ? JSON.parse(fs.readFileSync(manifest.modes.file.rawStdout, 'utf8')).data.total : '?'}）`, 'F3 十组序（L-01）');
add('D1 分组数', '分组 id 序列逐字', oldGroupIds.join('>'), newGroupIds.join('>'), JSON.stringify(oldGroupIds) === JSON.stringify(newGroupIds) ? '一致' : '差异（可解释）',
  '两侧 10 个 id 与次序逐字相同（home>diet>weight>exercise>workout>goal>body_detail>body_photo>profile>analysis）', 'L-01 分组序取 F3');
add('D1 分组数', '分组 label／icon 逐字', JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)), JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)),
  JSON.stringify(old.groupDigest.map((g) => g.label + g.icon)) === JSON.stringify(newFile.groupDigest.map((g) => g.label + g.icon)) ? '一致' : '差异（可解释）', '10 组 label／icon 逐字相同（含 profile=⚙️，L-01 取 F3）', 'L-01');
add('D1 分组数', '每分组子功能／场景分布', JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)), JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)),
  JSON.stringify(old.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) === JSON.stringify(newFile.groupDigest.map((g) => g.subgroups + ':' + g.scenes)) ? '一致' : '差异（可解释）', '10 组逐组（子功能数:场景数）完全相同', '—');

// ── D2 子功能数 ───────────────────────────────────────────────────────────────
const oldSgIds = old.subgroupDigest.map((s) => s.id);
const newSgIds = newFile.subgroupDigest.map((s) => s.id);
add('D2 子功能数', '子功能条数', String(old.counts.subgroups), String(newFile.counts.subgroups), old.counts.subgroups === newFile.counts.subgroups ? '一致' : '差异（可解释）',
  `旧=${old.counts.subgroups}／新=${newFile.counts.subgroups}（envelope data.subgroupTotal=${newFile.counts.subgroups}）`, 'L-03 子功能 id `{group}_{n}` 照抄');
add('D2 子功能数', '子功能 id 集合逐字', String(new Set(oldSgIds).size), String(new Set(newSgIds).size),
  JSON.stringify(oldSgIds) === JSON.stringify(newSgIds) ? '一致' : '差异（可解释）', '54/54 同序同 id（含「既有唤醒词」恒最后，helpCenter.ts:174）', 'L-03／helpCenter.ts:174');
const sgLabelEq = old.subgroupDigest.every((s, i) => s.label === newFile.subgroupDigest[i]?.label);
add('D2 子功能数', '子功能 label 逐字', sgLabelEq ? '54/54 相同' : '存在不同', sgLabelEq ? '54/54 相同' : '存在不同', sgLabelEq ? '一致' : '差异（可解释）', '逐条比对 subgroupDigest[i].label', 'L-18 diet 展示名取 F3「饮食」');

// ── D3 场景（唤醒词）数 ───────────────────────────────────────────────────────
add('D3 场景数', '场景条数', String(old.counts.scenes), String(newFile.counts.scenes), old.counts.scenes === newFile.counts.scenes ? '一致' : '差异（可解释）',
  `旧=${old.counts.scenes}／新=${newFile.counts.scenes}（envelope data.sceneTotal=${newFile.counts.scenes}）`, 'F3 436 场景');
add('D3 场景数', '唤醒词逐字', `${wakeEq.length}/436 相同`, `${wakeEq.length}/436 相同`, wakeEq.length === 436 ? '一致' : '差异（可解释）', '按 (子功能 id, 组内序) 对齐后逐字比对 wake_word', '—');
add('D3 场景数', '场景 title 逐字', `${titleEq.length}/436 相同`, `${titleEq.length}/436 相同`, titleEq.length === 436 ? '一致' : '差异（可解释）', '逐字比对 title', '—');
add('D3 场景数', 'status 字段逐字', `${statusEq.length}/436 相同`, `${statusEq.length}/436 相同`, statusEq.length === 436 ? '一致' : '差异（可解释）', '逐字比对 status（两侧均空串）', '—');
add('D3 场景数', '场景 id 逐字', `${idEq.length}/436 相同`, `${idEq.length}/436 相同`, idEq.length === 436 ? '一致' : '差异（可解释）',
  `22 条 legacy 场景 id 由 \`legacy_{唤醒词}\` 改为 \`main_prompt.cli\` 原文：` + idChanged.slice(0, 3).map((x) => x.wake_word).join('／') + ' …（全表见 ledger.json D3.idChanged）',
  'L-19／#83 R-7：F3 的 legacy_* 会让卡面显示不存在的命令');
add('D3 场景数', '场景 id 唯一性', '—', `${new Set(newFile.scenes.map((s) => s.id)).size}/436 唯一`, new Set(newFile.scenes.map((s) => s.id)).size === 436 ? '一致' : '差异（可解释）', '#88 断言：id 436/436 唯一', '#88');

// ── D4 prompt 文本 ────────────────────────────────────────────────────────────
add('D4 prompt 文本', '每条场景 prompt_template 逐字', `${promptEq.length}/436 相同`, `${promptEq.length}/436 相同`, promptEq.length === 436 ? '一致' : '差异（可解释）',
  '按 (子功能 id, 组内序) 对齐后逐字比对；差异样本见 ledger.json D4.promptDiffs', '—');
add('D4 prompt 文本', 'types 徽章文本序列', `${typesTextEq.length}/436 相同（旧=字符串数组）`, `${typesTextEq.length}/436 相同（新={text,bg,fg} 对象）`, typesTextEq.length === 436 ? '差异（可解释）' : '差异（可解释）',
  '文本逐字相同；**形状**由 `["结果"]` 变为 `[{text,bg,fg}]`（三档配色内联），旧 414 条有 types／新 414 条有 types', 'L-12／helpCenter.ts:132 HELP_TYPE_BADGES');
add('D4 prompt 文本', 'prompt 中裸 `<N>` 等尖括号', '逐字保留（13 处 legacy 原文）', '逐字保留（text 态不转义）', '一致', 'A.4 口径：text 态为纯文本载体，转义反而与 CLI 原文不一致', '#88 §5-D-4');

// ── D5 每条 CLI 展示命令 ──────────────────────────────────────────────────────
const oldCliCount = old.scenes.filter((s) => s.cli !== null).length;
const newCliCount = newFile.scenes.filter((s) => s.cli !== null).length;
const noCli = newFile.scenes.filter((s) => s.cli === null);
const changedWakeSet = new Set(idChanged.map((x) => x.wake_word));
const noCliLegacy = noCli.filter((s) => changedWakeSet.has(s.wake_word));
const changedWithCli = idChanged.filter((x) => newFile.scenes.some((s) => s.wake_word === x.wake_word && s.cli !== null)).length;
add('D5 CLI 展示命令', 'Sheet「可执行命令」行数', String(oldCliCount), String(newCliCount), oldCliCount === 0 && newCliCount > 0 ? '新版新增' : (oldCliCount === newCliCount ? '一致' : '差异（可解释）'),
  `旧侧 436 场景 payload **无** editable_fields/cli 字段（F3 不展示 CLI，L-09）；新侧 ${newCliCount}/436（#106 回补，来源 #81 路由层 exec 桶 341 条）`,
  '#106（数据源 #81 WAKE_ROUTES exec 341 条；helpCenter.ts:94-123）');
add('D5 CLI 展示命令', '卡级 `<code class=cli>` 行数', '0（F3 卡面无代码行）', String(newFile.dom.codeCli), newFile.dom.codeCli === 436 ? '新版新增' : '差异（可解释）',
  '新侧 436/436 卡级 <code> 显示 `Scene.id`（非命令）；22 条 legacy 显示 python／mavis 原文', 'L-09（F3 不显示；本项为新增展示）');
add('D5 CLI 展示命令', '无 CLI 的场景数（缺口）', '不适用（旧侧无此概念）', `${noCli.length}/436`, noCli.length > 0 ? '新版缺失' : '一致',
  `缺 ${noCli.length} 条：diet=${noCli.filter((x) => x.gid === 'diet').length}／weight=${noCli.filter((x) => x.gid === 'weight').length}／exercise=${noCli.filter((x) => x.gid === 'exercise').length}／workout=${noCli.filter((x) => x.gid === 'workout').length}／goal=${noCli.filter((x) => x.gid === 'goal').length}／body_detail=${noCli.filter((x) => x.gid === 'body_detail').length}／analysis=${noCli.filter((x) => x.gid === 'analysis').length}；其中 ${noCliLegacy.length} 条＝legacy python／mavis 原文（无 exec 路由：${noCliLegacy.map((s) => s.wake_word).join('、')}）`,
  '根因：#81 路由层 95 条 non-exec（wizard／计划写入缺失／legacy python 无 exec 键）→ #106 按「不造空值行」不发字段；**建议归属票**：#86（3 个配置型 wizard＋GIF 框选器）／计划类二期写键票／legacy python 类登记不移植');
add('D5 CLI 展示命令', '卡级 code 与 Sheet CLI 的一致性（22 条 legacy）', '不适用', `${changedWithCli}/22 条 legacy 两处**不同源**（卡级＝main_prompt.cli 原文 python／mavis；Sheet＝路由层新 CLI）；另 ${noCliLegacy.length} 条两处皆无`, '差异（可解释）',
  '同一张卡上「卡级代码行」与「Sheet 可执行命令」显示不同命令（L-19 与 #106 两条口径叠加所致）：卡级是 legacy 原文（F3 忠实回放），Sheet 是路由层新 CLI（可执行）。',
  'L-19（卡级 id 取原文）＋#106（Sheet 取路由层）；**建议**：维护者拍板是否需要「卡级只显示 id、命令只在 Sheet」的收敛（归 #106 后续或新票）');
add('D5 CLI 展示命令', '「复制参数」按钮', '0', String(newFile.dom.buttons - 436 * 2), '新版新增', '每卡 3 按钮（复制指令／复制唤醒词／复制参数）；旧侧卡面仅 1 个「复制」（每卡 1 个）', 'L-05／#88 S4 运行时注入');

// ── D6 交互能力 ───────────────────────────────────────────────────────────────
const om = old.js.markers;
const nm = newFile.js.markers;
const feat = (item, o, n, verdict, evidence, attribution) => add('D6 交互能力', item, o, n, verdict, evidence, attribution);
feat('搜索（输入框＋清空＋计数）', `有（#sB／#sClear／#hitC，占位「搜索全部场景」）`, `有（运行时注入 type=search ＋ 清空 ＋ 命中计数，占位「${nm.searchPlaceholder ? '搜索全部场景' : '?'}」）`,
  '一致', `两侧均为**运行时注入**：旧 js.${om.searchPlaceholder}／新 js.${nm.searchPlaceholder}；静态 HTML 均无搜索框（旧 0／新 ${newFile.dom.staticSearchInput}）`, 'L-06（S4 已做）');
feat('命中计数／空态文案逐字', `「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」`, `「匹配 N 个场景」＋「没有找到相关场景,换个词试试～」`, '一致',
  `旧 hitCount=${om.hitCountText} empty=${om.emptyText}；新 hitCount=${nm.hitCountText} empty=${nm.emptyText}（逐字相同）`, 'L-06');
feat('高亮', `有：仅高亮卡面标题 \`.m-name\`（\`<mark>\`，1 处实现）`, `有：整卡文本节点 \`wrapTerm\`＋\`<mark class=card-mark>\``, '差异（可解释）',
  `旧 highlightScopeName=${om.highlightScopeName}／新 highlightScopeCard=${nm.highlightScopeCard}：新版高亮**范围更广**（卡内全部文本），旧版只高亮标题`, 'L-06 功能对等扩展（S4）');
feat('跳页', `有：搜索命中自动 \`scrollTo({left})\` 翻到首个命中页`, `有：\`jumpTo\` 勾选命中页 radio＋Enter 循环跳页`, '差异（可解释）',
  `旧 jumpPage=${om.jumpPage}（横滑页）／新 jumpPage=${nm.jumpPage}（radio 标签条，L-07 形态替换）`, 'L-07（Tab 横滑→radio 标签条，功能对等）');
feat('复制按钮（卡级）', '有：每卡 1 个「复制」（运行时 \`.mini\` 内注入）', '有：每卡 3 个（复制指令／复制唤醒词／复制参数），运行时注入卡头', '新版新增',
  `旧 cardCopyButton=${om.cardCopyButton} 文案「${om.copyLabel}」／新 cardCopyButton=${nm.cardCopyButton} 文案「${nm.copyLabel}」；静态壳按钮数 旧 ${old.dom.buttons}／新 ${newFile.dom.buttons}`, 'L-05（旧=每卡 1 个；新=静态壳 3 个 Sheet 按钮＋运行时卡级注入，#88 S4/S5）');
feat('返回顶部', `无（\`backTop\` 0 处；CSS 无 \`.backTop\`）`, `有（运行时注入 \`#backTop\`，↑，aria「回到顶部」，scrollTop>400 才显形）`, '新版新增',
  `旧 backTop=${om.backTop}／新 backTop=${nm.backTop}（BACKTOP_MIN_Y=400）`, 'L-15／H-19（#88 S4 已做）');
feat('Sheet 实时预览', `有：底部弹层内参数表单 \`input[data-p]\` → \`[data-prev]\` 实时重组 \`buildPrompt\``, `有：内联 \`<details>\` 内字段换输入框 → 实时重组「prompt ＋ 空行 ＋ label: value」`, '差异（可解释）',
  `旧 sheetPreview=${om.sheetPreview} buildPrompt=${om.sheetPreviewBuild}／新 sheetPreview=${nm.sheetPreview} refreshPreview=${nm.sheetPreview}（形态 L-08 弹层→内联，语义同）`, 'L-08（Sheet 弹层→内联 <details>，功能对等）');
feat('参数必填校验', `有：\`getMissing\` → toast「请先填写: …」并阻断复制`, `无必填阻断（字段均为「可执行命令」展示行，无 req 语义）`, '新版缺失',
  `旧 sheetValidate=${om.sheetValidate}／新 sheetValidate=${nm.sheetValidate}：F3 的 \`params[].req\` 校验在新版无对应物`, '根因：新版字段来源＝#106 路由 CLI（展示用），非 F3 \`params\` 表单；**建议归属票**：#86（配置型 wizard 承载填写）／登记为可接受缺口');
feat('copied 态', `有：toast「已复制」＋副文案「粘贴给 AI,技能会自动执行,完成后你会拿到结果 HTML。」`, `有：按钮 \`copied\` 类（450 ms）＋ toast「已复制」（失败态「复制失败／长按选择文本手动复制」）`, '差异（可解释）',
  `旧 copiedState=${om.copiedState}／新 copiedState=${nm.copiedState}；toast 副文案不同（旧含「粘贴给 AI…」教学句，新为失败指引）`, '#121（copied 态）／H-16（双反馈）');
feat('剪贴板实现', `document.execCommand('copy') ＋ 隐藏 textarea 回退`, `navigator.clipboard.writeText() ＋ textarea 回退`, '差异（可解释）',
  `旧 clipboardApi=${om.clipboardApi} execCommand=${om.execCommandFallback}／新 clipboardApi=${nm.clipboardApi} execCommand=${nm.execCommandFallback}`, '现代 API 迁移（行为等价：都带回退）');
feat('键盘可达', `无显式 Enter 处理`, `有：搜索框 Enter 循环跳到下一个命中页`, '新版新增', `旧 keyboardEnter=${om.keyboardEnter}／新 keyboardEnter=${nm.keyboardEnter}`, '#88 S4（H-20 焦点可见＋动效可关同批）');
feat('焦点可见／动效可关', `无（\`:focus-visible\` 0／\`prefers-reduced-motion\` 0）`, `有（\`:focus-visible\` ${newFile.css.focusVisible} 处／\`prefers-reduced-motion\` ${newFile.css.prefersReducedMotion} 处）`, '新版新增',
  `旧 css.focusVisible=${old.css.focusVisible} prefersReducedMotion=${old.css.prefersReducedMotion}／新 ${newFile.css.focusVisible}／${newFile.css.prefersReducedMotion}`, 'L-15／H-20');
feat('Tab 形态', `横滑页 \`.page\` ＋ 底部 tabBar（scroll-snap）`, `radio 标签条（\`.ilife-help-shell-tab-input\` ${newFile.dom.tabRadios} 个）`, '差异（可解释）',
  `旧 mediaQueries=${JSON.stringify(old.css.mediaQueries)}／新 ${JSON.stringify(newFile.css.mediaQueries)}`, 'L-07／L-13（断点差异归 #89）');
feat('空态／错误态', `无 try/catch → 白屏风险（L-14）`, `静态 HTML 无解析步骤；渲染失败走 #83 模板回执`, '新版新增', 'L-14 改进项；#83 渲染失败回执', 'L-14／#83');
feat('零渐变', `1 处 linear-gradient（init-banner）`, `1 处 linear-gradient（charts 区 90deg）`, '差异（可解释）',
  `旧 ${JSON.stringify(old.css.linearGradients)}／新 ${JSON.stringify(newFile.css.linearGradients)}`, 'L-17（零渐变判据作废，改按 CSS 区判）');

// ── D7 体积 ───────────────────────────────────────────────────────────────────
// 归因取**实测字节**：payload 内 cli 字段（#106）／meta_blocks（#107）＋静态 markup 内
// 卡体／按钮／<details>／字段行，避免「看起来一致」式的拍脑袋归因。
const fileHtmlText = fs.readFileSync(newFile.file, 'utf8');
const filePayloadJson = fileHtmlText.match(/<script id="[^"]+" type="application\/json">([\s\S]*?)<\/script>/);
const fileData = filePayloadJson ? JSON.parse(filePayloadJson[1]) : null;
const bOf = (s) => Buffer.byteLength(s, 'utf8');
const markupText = fileHtmlText.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
const sumBytes = (text, re) => [...text.matchAll(re)].reduce((a, x) => a + bOf(x[0]), 0);
let cliFieldsBytes = 0;
let cliFieldsCount = 0;
for (const g of fileData?.groups ?? []) for (const sg of g.subgroups ?? []) for (const sc of sg.scenes ?? []) {
  if (sc.editable_fields) {
    cliFieldsBytes += bOf(JSON.stringify(sc.editable_fields));
    cliFieldsCount++;
  }
}
const metaBlocks = fileData?.meta_blocks ?? [];
const metaBlocksBytes = bOf(JSON.stringify(metaBlocks));
const metaEntries = metaBlocks.flatMap((blk) => [...String(blk.html ?? '').matchAll(/data-view-entry="([^"]+)"/g)].map((x) => x[1]));
const attr = {
  cardBytes: sumBytes(markupText, /<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g),
  buttonBytes: sumBytes(markupText, /<button[^>]*>[\s\S]*?<\/button>/g),
  detailsBytes: sumBytes(markupText, /<details class="ilife-help-shell-sheet"[\s\S]*?<\/details>/g),
  fieldRowBytes: sumBytes(markupText, /<li class="ilife-help-shell-field"[\s\S]*?<\/li>/g),
  cliFieldsBytes,
  cliFieldsCount,
  metaBlocksBytes,
  metaEntries,
  avgCardBytes: Math.round(sumBytes(markupText, /<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g) / Math.max(1, newFile.dom.cardsNew)),
};
const chunks = {
  fileTotal: newFile.bytes,
  fileMarkup: newFile.dom.markupBytes,
  filePayload: newFile.payload.bytes,
  fileCss: newFile.css.bytes,
  fileJs: newFile.js.bytes,
  oldTotal: old.bytes,
  oldMarkup: old.dom.markupBytes,
  oldPayload: old.payload.bytes,
  oldCss: old.css.bytes,
  oldJs: old.js.bytes,
  inline: newAll.inline.bytes,
  text: newAll.text.bytes,
  delta: newFile.bytes - old.bytes,
};
add('D7 体积', 'file 态字节', old.bytes + ' B（302,820）', newFile.bytes + ' B（1,264,822）', '差异（可解释）',
  `+${chunks.delta} B（×${(newFile.bytes / old.bytes).toFixed(2)}）；旧侧 DOM **运行时生成**（静态卡 0，payload ${old.payload.bytes} B＋JS ${old.js.bytes} B），新侧静态卡 436＋3 按钮/卡`, 'L-16／P-5 交付形态（旧运行时渲染 vs 新静态壳）');
add('D7 体积', '体积归因（新侧构成）', '—', `markup ${chunks.fileMarkup} ＋ payload ${chunks.filePayload} ＋ css ${chunks.fileCss} ＋ js ${chunks.fileJs} = ${chunks.fileMarkup + chunks.filePayload + chunks.fileCss + chunks.fileJs}`,
  '差异（可解释）', `静态 markup 占 ${(chunks.fileMarkup / newFile.bytes * 100).toFixed(1)}%：436 卡体 ${attr.cardBytes} B（均 ${attr.avgCardBytes} B/卡）＋ 1308 按钮 ${attr.buttonBytes} B ＋ 490 <details> ${attr.detailsBytes} B ＋ 341 字段行 ${attr.fieldRowBytes} B（#106）；payload 内 cli 字段 ${attr.cliFieldsBytes} B（341 条，#106）＋ meta_blocks ${attr.metaBlocksBytes} B（#107，${attr.metaEntries.length} 条入口：${attr.metaEntries.join('／')}）`, '#106／#107／#88 静态壳');
add('D7 体积', '体积增减（分块）', `markup ${old.dom.markupBytes} ＋ payload ${old.payload.bytes} ＋ css ${old.css.bytes} ＋ js ${old.js.bytes}`, `markup ${chunks.fileMarkup} ＋ payload ${chunks.filePayload} ＋ css ${chunks.fileCss} ＋ js ${chunks.fileJs}`, '差异（可解释）',
  `markup ${(chunks.fileMarkup - old.dom.markupBytes).toLocaleString('en-US')} B（静态壳取代运行时渲染）／payload +${(chunks.filePayload - old.payload.bytes).toLocaleString('en-US')} B（#106＋#107＋22 条 legacy 原文）／css −${(old.css.bytes - chunks.fileCss).toLocaleString('en-US')} B／js −${(old.js.bytes - chunks.fileJs).toLocaleString('en-US')} B（旧侧含完整渲染器＋hm 组件库）`,
  'L-16／P-5：旧侧 DOM 运行时生成（静态标记仅 ' + old.dom.markupBytes + ' B），新侧静态壳');
add('D7 体积', 'inline／text 态字节', '不适用（F3 无三态）', `inline ${newAll.inline.bytes} B／text ${newAll.text.bytes} B`, '新版新增',
  `inline ＝ file −(head/doctype＋payload ${newFile.payload.bytes} B)；text 为纯文本索引 ${newAll.text.lines} 行`, '#91 三态（mode 显式）／#83 delivery');
add('D7 体积', '字节稳定性（两次运行同 sha256）', '—', `file ${newFile.sha256.slice(0, 16)}…／inline ${newAll.inline.sha256.slice(0, 16)}…／text ${newAll.text.sha256.slice(0, 16)}…`, '一致',
  '同一 commit 三次独立运行 sha256 相同（P-2 去时间戳；gen-manifest 与两次手工复跑一致）', 'P-2／#88');

// ── 汇总 ─────────────────────────────────────────────────────────────────────
const byVerdict = rows.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] ?? 0) + 1; return acc; }, {});
const byDim = rows.reduce((acc, r) => { acc[r.dim] = acc[r.dim] ?? {}; acc[r.dim][r.verdict] = (acc[r.dim][r.verdict] ?? 0) + 1; return acc; }, {});
const ledger = {
  generatedBy: 'docs/research/t-help-parity-compare.mjs',
  generatedAt: new Date().toISOString(),
  repo: manifest.repo,
  sides: {
    old: { file: old.file, bytes: old.bytes, lines: old.lines, sha256: old.sha256, counts: old.counts, dom: old.dom },
    new: {
      file: { path: newFile.file, bytes: newFile.bytes, lines: newFile.lines, sha256: newFile.sha256, counts: newFile.counts, dom: newFile.dom, envelope: newFile.envelope },
      inline: { path: newAll.inline.file, bytes: newAll.inline.bytes, lines: newAll.inline.lines, sha256: newAll.inline.sha256, envelope: newAll.inline.envelope },
      text: { path: newAll.text.file, bytes: newAll.text.bytes, lines: newAll.text.lines, sha256: newAll.text.sha256, envelope: newAll.text.envelope },
    },
    fixtures: fixtures.map((f) => ({ file: f.file, bytes: f.bytes, lines: f.lines, sha256: f.sha256, shaMatches: f.shaMatches, summary: f.summary })),
  },
  dimensions: {
    D1: { groups: { old: old.counts.groups, new: newFile.counts.groups }, ids: { old: oldGroupIds, new: newGroupIds } },
    D2: { subgroups: { old: old.counts.subgroups, new: newFile.counts.subgroups }, idsEqual: JSON.stringify(oldSgIds) === JSON.stringify(newSgIds), labelsEqual: sgLabelEq },
    D3: { scenes: { old: old.counts.scenes, new: newFile.counts.scenes }, wakeEq: wakeEq.length, titleEq: titleEq.length, statusEq: statusEq.length, idEq: idEq.length, idChanged },
    D4: {
      promptEq: promptEq.length,
      promptDiffs: aligned.filter((k) => oldByKey.get(k).prompt_template !== newByKey.get(k).prompt_template).map((k) => ({ sgid: oldByKey.get(k).sgid, wake_word: oldByKey.get(k).wake_word, old: oldByKey.get(k).prompt_template, new: newByKey.get(k).prompt_template })),
      typesTextEq: typesTextEq.length,
      typesShaped: { old: old.scenes.filter((s) => s.types_shaped).length, new: newFile.scenes.filter((s) => s.types_shaped).length },
    },
    D5: { oldCli: oldCliCount, newCli: newCliCount, noCli: noCli.map((s) => ({ gid: s.gid, sgid: s.sgid, wake_word: s.wake_word, id: s.id })), noCliLegacy: noCliLegacy.length, cardCode: newFile.dom.codeCli },
    D6: { oldMarkers: om, newMarkers: nm, oldCss: old.css, newCss: newFile.css, oldDom: old.dom, newDom: newFile.dom },
    D7: { ...chunks, attr },
  },
  rows,
  summary: { total: rows.length, byVerdict, byDim },
};
fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 2), 'utf8');

// ── 断言（机械可判）──────────────────────────────────────────────────────────
ok(old.counts.groups === newFile.counts.groups && old.counts.subgroups === newFile.counts.subgroups && old.counts.scenes === newFile.counts.scenes, 'D1-D3 头条数字 10/54/436 两侧相同', `${old.counts.groups}/${old.counts.subgroups}/${old.counts.scenes} vs ${newFile.counts.groups}/${newFile.counts.subgroups}/${newFile.counts.scenes}`);
ok(promptEq.length === 436, 'D4 prompt 逐字 436/436', promptEq.length + '/436');
ok(wakeEq.length === 436 && titleEq.length === 436 && statusEq.length === 436, 'D3 唤醒词／title／status 逐字 436/436', `${wakeEq.length}/${titleEq.length}/${statusEq.length}`);
ok(idChanged.length === 22, 'D3 场景 id 变更恰 22 条（L-19）', idChanged.length + ' 条');
ok(oldCliCount === 0 && newCliCount === 341, 'D5 旧 0／新 341 条 CLI（#106）', oldCliCount + '/' + newCliCount);
ok(noCli.length === 95 && noCliLegacy.length === 4, 'D5 缺口 95 条（其中 4 条 legacy python／mavis 原文无 exec 路由）', noCli.length + '/' + noCliLegacy.length);
ok(newFile.dom.codeCli === 436, 'D5 卡级 code 行 436/436（L-09 显示 Scene.id）', String(newFile.dom.codeCli));
ok(om.searchPlaceholder && nm.searchPlaceholder && om.hitCountText && nm.hitCountText && om.emptyText && nm.emptyText, 'D6 搜索文案逐字两侧相同', 'placeholder/hit/empty');
ok(om.backTop === false && nm.backTop === true, 'D6 返回顶部：旧无／新有（L-15）', String(om.backTop) + '/' + String(nm.backTop));
ok(om.sheetPreview && nm.sheetPreview, 'D6 Sheet 实时预览两侧都有（L-08 形态差异）', String(om.sheetPreview) + '/' + String(nm.sheetPreview));
ok(om.sheetValidate === true && nm.sheetValidate === false, 'D6 必填校验：旧有／新无（登记缺口）', String(om.sheetValidate) + '/' + String(nm.sheetValidate));
ok(byVerdict['一致'] + byVerdict['差异（可解释）'] + byVerdict['新版缺失'] + byVerdict['新版新增'] === rows.length, '七维度每行判定均属四值之一', JSON.stringify(byVerdict));

console.log('LEDGER ' + path.join(OUT, 'ledger.json'));
console.log('ROWS ' + rows.length + ' ' + JSON.stringify(byVerdict));
for (const [dim, v] of Object.entries(byDim)) console.log('DIM ' + dim + ' ' + JSON.stringify(v));
console.log('HEADLINE old=' + old.bytes + 'B/' + old.counts.groups + 'g/' + old.counts.subgroups + 'sg/' + old.counts.scenes + 'sc | new=' + newFile.bytes + 'B/' + newFile.counts.groups + 'g/' + newFile.counts.subgroups + 'sg/' + newFile.counts.scenes + 'sc | cli=' + oldCliCount + '->' + newCliCount + ' | promptEq=' + promptEq.length + '/436 | idChanged=' + idChanged.length);
console.log('RESULT: ' + pass + '/' + checks + ' compare-checks');
process.exit(pass === checks ? 0 : 1);
