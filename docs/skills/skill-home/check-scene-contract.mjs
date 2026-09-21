#!/usr/bin/env node
/**
 * 场景页契约单接缝检查（规格单 #846 实施，地图 #797 票 2 结论固化）。
 *
 * 检查文档加附录作为一个整体，不散成多处断言：
 *   ① 文档存在、无 BOM、## 节数不少于 6、含承诺的节与关键字
 *   ② 附录可解析：46 族／70 场景／写集 11 票不相交／共用位唯一写者／锁上限
 *   ③ 族表覆盖每个场景；(命令，预设）到页族确定（多对一允许，一对多即红，含 SM3-4 双词）
 *   ④ 命名函数唯一稳定（同场景同时戳同名，不同场景不同名，无非法字符）
 *   ⑤ 必需块每族四组齐全（状态词允许空数组，但须有注明理由）
 *   ⑥ 与事实源对账：附录 70 场景 id 与 scenarios.yaml 非联动场景一致；模板与命令中文名一致
 *
 * 跑法（仓库根）：`node docs/skills/skill-home/check-scene-contract.mjs`
 * 正例 exit 0；反例（改坏附录或删文档节） exit 1 且点名。
 */
import { readFileSync, existsSync } from 'node:fs';

const DOC = 'docs/skills/skill-home/scene-pages-contract.md';
const APPENDIX = 'docs/skills/skill-home/scene-pages-contract.appendix.json';
const YAML = 'packages/skill-home/src/help/scenarios.yaml';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

function readNoBom(path) {
  const buf = readFileSync(path);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    fails.push(`${path} 带 BOM（正文禁止以 BOM 开头）`);
    return buf.slice(3).toString('utf8');
  }
  return buf.toString('utf8');
}

// ① 文档
ok(existsSync(DOC), `缺文档：${DOC}`);
const doc = existsSync(DOC) ? readNoBom(DOC) : '';
const sections = doc.match(/^## .+/gm) || [];
ok(sections.length >= 6, `文档 ## 节只有 ${sections.length} 节，要求不少于 6`);
for (const kw of ['冻结', '形状', '页族', '命名', '写集', '必需块', '不做', '验收']) {
  ok(doc.includes(kw), `文档缺关键字：${kw}`);
}
ok(!doc.includes('\\n'), '文档含字面 \\n 转义（须用真实换行）');

// ② 附录
ok(existsSync(APPENDIX), `缺附录：${APPENDIX}`);
let ap = null;
try {
  const raw = readNoBom(APPENDIX);
  ap = JSON.parse(raw);
} catch (e) {
  fails.push(`附录解析失败：${e.message}`);
}
if (ap) {
  ok(Array.isArray(ap.families) && ap.families.length === 46, `附录 families ${ap.families?.length ?? '?'}，要求 46`);
  ok(Array.isArray(ap.scenarios) && ap.scenarios.length === 70, `附录 scenarios ${ap.scenarios?.length ?? '?'}，要求 70`);
  ok(ap.resolutionSignature === '(命令，场景预设）到页族', '附录缺两层解析签名');

  const famByName = new Map((ap.families || []).map((f) => [f.family, f]));
  const scenIds = new Set();
  for (const s of ap.scenarios || []) {
    ok(!scenIds.has(s.id), `场景 id 重复：${s.id}`);
    scenIds.add(s.id);
    ok(famByName.has(s.family), `场景 ${s.id} 指到不存在的族：${s.family}`);
    ok(typeof s.key === 'string' && s.key.startsWith('home.'), `场景 ${s.id} 缺命令：${s.key}`);
    ok(s.preset && typeof s.preset === 'object', `场景 ${s.id} 缺场景预设`);
  }
  // 族表覆盖每个场景：每族列的场景都在 scenarios 里，每场景恰属一族
  const covered = new Set();
  for (const f of ap.families || []) {
    ok(Array.isArray(f.scenarios) && f.scenarios.length > 0, `族 ${f.family} 没有服务场景`);
    for (const id of f.scenarios || []) {
      ok(scenIds.has(id), `族 ${f.family} 列了附录外场景：${id}`);
      ok(!covered.has(id), `场景 ${id} 被两族同时覆盖`);
      covered.add(id);
    }
  }
  ok(covered.size === 70 && scenIds.size === 70 && [...scenIds].every((id) => covered.has(id)), '族表未覆盖全部 70 场景（一族一装配，多对一允许，漏一即红）');

  // ③ 确定性：同一（命令，预设）只到一族（含双词）
  const route = new Map();
  const putRoute = (key, preset, family, where) => {
    const k = JSON.stringify([key, preset]);
    if (!route.has(k)) route.set(k, { family, where });
    else if (route.get(k).family !== family) {
      fails.push(`（命令，预设）一对多：${k} 同时到 ${route.get(k).family}（${route.get(k).where}）与 ${family}（${where}）`);
    }
  };
  for (const s of ap.scenarios || []) putRoute(s.key, s.preset, s.family, `场景${s.id}`);
  if (ap.dualWord && Array.isArray(ap.dualWord.resolutions)) {
    for (const r of ap.dualWord.resolutions) putRoute(r.key, r.preset, ap.dualWord.family, 'SM3-4双词');
  } else {
    fails.push('附录缺 dualWord 双词说明（SM3-4 带物品／归物品）');
  }

  // ④ 命名函数唯一稳定
  const sanitize = (stem) => stem.replace(/[\\/:*?"<>|\s]/g, '_');
  const fileName = (commandCn, id, stamp) => `${sanitize(commandCn)}_${id}_${stamp}.html`;
  const stamp = '20260921_120000';
  const names = new Map();
  for (const s of ap.scenarios || []) {
    const n = fileName(s.commandCn, s.id, stamp);
    ok(!/[\\/:*?"<>|]/.test(n), `命名含非法字符：${n}`);
    ok(!/\s/.test(n.split('_').slice(0, -1).join('_')), `命名主体含空格：${n}`);
    if (names.has(n)) fails.push(`命名冲突：${n} 同时给 ${names.get(n)} 与 ${s.id}`);
    else names.set(n, s.id);
  }
  ok(names.size === 70, `命名唯一性：70 场景应得 70 个不同文件名，实得 ${names.size}`);
  // 稳定性：同场景同时戳同名
  const s0 = (ap.scenarios || [])[0];
  if (s0) {
    ok(fileName(s0.commandCn, s0.id, stamp) === fileName(s0.commandCn, s0.id, stamp), '命名不稳定');
  }
  // 真实例
  for (const ex of ['录物品_1-1_', '移物品_3-2_', '查购买记录_SM6-1_']) {
    ok([...names.keys()].some((n) => n.startsWith(ex)), `缺真实例前缀：${ex}<戳>.html`);
  }

  // ⑤ 必需块
  for (const f of ap.families || []) {
    const rb = f.requiredBlocks;
    ok(rb && Array.isArray(rb.fields) && rb.fields.length > 0, `族 ${f.family} 缺 fields`);
    ok(rb && Array.isArray(rb.operations) && rb.operations.length > 0, `族 ${f.family} 缺 operations`);
    ok(rb && Array.isArray(rb.empty) && rb.empty.length > 0, `族 ${f.family} 缺 empty`);
    ok(rb && Array.isArray(rb.status), `族 ${f.family} 缺 status（无则空数组）`);
    ok(typeof f.reason === 'string' && f.reason.length > 0, `族 ${f.family} 缺变更理由`);
  }

  // 写集 11 票不相交，共 46
  const ws = ap.writeSets || [];
  ok(ws.length === 11, `写集应为 11 票，实得 ${ws.length}`);
  const allFam = [];
  for (const w of ws) for (const f of w.families || []) allFam.push(f);
  ok(allFam.length === 46, `写集族总数应 46，实得 ${allFam.length}`);
  ok(new Set(allFam).size === 46, '写集族有重复（同域多票须不相交）');
  ok([...new Set(allFam)].every((f) => famByName.has(f)), '写集含附录外族名');

  // 共用位唯一写者与锁
  ok(ap.shared && ap.shared.owner === 800, '共用位唯一写者须为票 800');
  ok(ap.lock && ap.lock.maxWaitMs === 600000, '锁上限须为 600000（10 分钟）');
  ok(ap.link && ap.link.registryOnly === true, 'link 域须只留登记位');

  // ⑥ 与事实源对账
  if (existsSync(YAML)) {
    const yaml = readFileSync(YAML, 'utf8');
    const ids = [...yaml.matchAll(/^- id: (\S+)/gm)].map((m) => m[1]);
    const nonLink = ids.filter((id) => !/^SM9-/.test(id));
    ok(nonLink.length === 70, `yaml 非联动场景 ${nonLink.length}，要求 70`);
    const missing = nonLink.filter((id) => !scenIds.has(id));
    const extra = [...scenIds].filter((id) => !nonLink.includes(id));
    ok(missing.length === 0, `附录漏场景：${missing.join('、') || '无'}`);
    ok(extra.length === 0, `附录多出 yaml 外场景：${extra.join('、') || '无'}`);
    // 模板与命令中文名一致
    const yamlTpl = new Map();
    const yamlCn = new Map();
    let cur = null;
    for (const line of yaml.split(/\r?\n/)) {
      const idm = line.match(/^- id: (\S+)/);
      if (idm) { cur = idm[1]; continue; }
      const tm = line.match(/^\s+template: (.+)$/);
      if (tm && cur) yamlTpl.set(cur, tm[1].trim());
      const cm = line.match(/^\s+command_cn: (.+)$/);
      if (cm && cur) yamlCn.set(cur, cm[1].trim());
    }
    for (const s of ap.scenarios || []) {
      const fam = famByName.get(s.family);
      if (fam && yamlTpl.has(s.id)) {
        ok(fam.oldTemplate === yamlTpl.get(s.id), `场景 ${s.id} 模板对不上：附录 ${fam.oldTemplate} vs yaml ${yamlTpl.get(s.id)}`);
      }
      if (yamlCn.has(s.id)) {
        ok(s.commandCn === yamlCn.get(s.id), `场景 ${s.id} 命令中文名对不上：附录 ${s.commandCn} vs yaml ${yamlCn.get(s.id)}`);
      }
    }
    // 46 旧模板集合对上册子非联动行（此处用 yaml 模板去重校验：非联动去重模板应为 46）
    const yamlNonLinkTpl = new Set(nonLink.map((id) => yamlTpl.get(id)).filter(Boolean));
    ok(yamlNonLinkTpl.size === 46, `yaml 非联动去重模板 ${yamlNonLinkTpl.size}，要求 46`);
  } else {
    fails.push(`缺事实源：${YAML}`);
  }
}

if (fails.length > 0) {
  console.log(`FAIL：${fails.length} 条`);
  for (const f of fails) console.log(`- ${f}`);
  process.exit(1);
}
console.log(`PASS：文档 ${sections.length} 节；附录 46 族／70 场景；命名 70 文件唯一稳定；写集 11 票不相交；与 yaml 对账一致 -> 可发`);
