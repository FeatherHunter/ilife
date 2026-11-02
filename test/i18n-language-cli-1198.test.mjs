/**
 * #1198 · 语言选择链的**端到端**验收（真出口 spawn ＋ 隔离家目录）。
 *
 * 与 `test/i18n-language-1198.test.mjs`（公共层纯函数那半）分工：那一件证明算法，本件证明
 * **生产真正走的那条路**——`packages/skill-bill/dist/cli/cmd_read.js` 这条出口真的把
 * `--language`／`language.text` 读进来、未知值真的响亮失败。
 *
 * 票面三条验收（读数形状）：
 *   ① 不设语言时产物与基线逐字节相同；
 *   ② 设 `language.text: en` 后同一条命令的输出走英文：
 *      · 链：解析出来的语言是不是 en（--language／配置两条来路都要通）；
 *      · 产物：真跑 `bill.record.add` 读**落盘 HTML 的可见正文**，英文锚点在、中文只剩
 *        冻结面（命令关键字）与数据值（ADR-0004 不译）——不伪造一个「英文产物」；
 *   ③ 设 `zz` 时退出码非 0 且报错里列出可用语言。
 *
 * 隔离：家目录指到临时目录（`test/helpers/home-test-base.mjs`），真实家目录一行不碰。
 * 时钟：产物里那几处时间戳按 `<TS>` 归一（口径照 `packages/skill-bill/scripts/gen-page-fingerprints.mjs`：
 * 先换时钟来源再取 sha256），归一后逐字节比较。
 *
 * 运行：先 `tsc -b`（或 `pnpm build`），再 `node --test test/i18n-language-cli-1198.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf, requireIsolatedHome } from './helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const BILL_CLI = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');

/** 日期时间形（含只到分钟的）：产物里凡出现一律归一成 `<TS>`。 */
const TS_RE = /\d{4}[-\/]\d{2}[-\/]\d{2}(?:[ T]\d{2}:?\d{2}(?::?\d{2})?)?/g;

/** 归一化：时间戳 → `<TS>`，CRLF → LF（跨 OS 同值）。 */
function normalize(text) {
  return String(text).replace(/\r\n/g, '\n').replace(TS_RE, '<TS>');
}

/** 一次真出口运行：隔离家目录 ＋ 可选配置文件全文。回 `{ code, stdout, stderr }`（非 0 不抛）。 */
function runBill(home, key, extraArgs = []) {
  const args = [BILL_CLI, key, ...extraArgs];
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', env: homeEnvOf(home) });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

/** 一次「带配置的 help 交付」：落盘产物归一化后的 sha256 ＋ 归一化后的文件路径。 */
function helpArtifactDigest(home, yamlText) {
  const dir = configDirOf(home);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'bill.yaml'), yamlText, 'utf8');
  const r = runBill(home, 'bill.help.lookup');
  assert.equal(r.code, 0, 'help 交付须成功，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  const path = envelope.delivery?.path;
  assert.ok(typeof path === 'string' && path.length > 0, '交付须带落盘路径');
  const html = readFileSync(path, 'utf8');
  const digest = createHash('sha256').update(normalize(html), 'utf8').digest('hex');
  // 落点只比**家目录之后的那一段**（临时家目录名每次不同，它本身不是产物的一部分），
  // 段内的时间戳同样归一（落点名字里的时间戳就是时钟来源那一处）。
  const tail = normalize(path).slice(configDirOf(home).length).replace(/\d{8}_\d{6}/g, '<TS>');
  return { digest, tail, bytes: Buffer.byteLength(normalize(html), 'utf8') };
}

/** 建一个临时家目录，跑完即删。 */
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'ilife-1198-cli-'));
  requireIsolatedHome(home);
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/** 老写法那份配置：**没有** language 组（升级前的现场）。 */
const OLD_YAML = [
  'db:',
  "  dir: ''",
  '  name: biscuit_accountant.db',
  '  goals: goals.json',
  'backup:',
  "  dir: ''",
  '  stem: biscuit_',
  'html:',
  '  dir: biscuit_accountant_html',
  '',
].join('\n');

/** 新写法那份配置：language 组两格空串（＝跟随调用方，最终 zh）。 */
const BLANK_LANGUAGE_YAML = OLD_YAML.replace(
  'html:\n  dir: biscuit_accountant_html\n',
  'html:\n  dir: biscuit_accountant_html\nlanguage:\n  text: \'\'\n  format: \'\'\n',
);

/** 新写法那份配置：language.text 落 en。 */
const EN_YAML = BLANK_LANGUAGE_YAML.replace("  text: ''", '  text: en');

describe('#1198 语言选择链（真出口端到端）', () => {
  it('① 不设语言：老配置（无 language 组）与空串配置两份产物逐字节相同', () => {
    const old = withHome((home) => helpArtifactDigest(home, OLD_YAML));
    const blank = withHome((home) => helpArtifactDigest(home, BLANK_LANGUAGE_YAML));
    assert.equal(old.digest, blank.digest, '未声明的差异为零：加了 language 组两格空串不许改产物');
    assert.equal(old.bytes, blank.bytes, '字节数也须相同');
    assert.equal(old.tail, blank.tail, '落点（家目录之后那一段，归一后）也须相同');
  });

  it('② 命令行 --language en 被真出口接受（链：argv 覆盖最优先）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), OLD_YAML, 'utf8');
      const plain = runBill(home, 'bill.help.lookup');
      assert.equal(plain.code, 0, 'stderr=' + plain.stderr);
      const withLang = runBill(home, 'bill.help.lookup', ['--language', 'en']);
      assert.equal(withLang.code, 0, '--language en 不许报错，stderr=' + withLang.stderr);
      const a = JSON.parse(plain.stdout);
      const b = JSON.parse(withLang.stdout);
      assert.equal(b.key, a.key);
      // 渲染消费方已接线：--language en 必须真的改到产物（不是只解析了参数就丢）。
      const htmlOf = (envelope) => readFileSync(envelope.delivery.path, 'utf8');
      const helpDataOf = (html) => {
        const open = '<script id="help-data" type="application/json">';
        const i = html.indexOf(open);
        assert.ok(i >= 0, 'help 产物须带 help-data 载荷');
        const j = html.indexOf('</script>', i + open.length);
        return JSON.parse(html.slice(i + open.length, j));
      };
      const zhData = helpDataOf(htmlOf(a));
      const enData = helpDataOf(htmlOf(b));
      assert.match(zhData.subtitle, /功能域|场景/, '未设语言时 help 载荷仍是中文：' + zhData.subtitle);
      assert.match(enData.subtitle, /domains|scenes/, '--language en 后 help 载荷须是英文：' + enData.subtitle);
      assert.match(enData.contact.items[0].label, /Email|邮箱/, '联系方式标签随语言：' + enData.contact.items[0].label);
    });
  });

  it('② 配置文件 language.text: en 能读进来（无 argv 覆盖时也走通）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), EN_YAML, 'utf8');
      const r = runBill(home, 'bill.help.lookup');
      assert.equal(r.code, 0, 'language.text: en 不许让命令失败，stderr=' + r.stderr);
      const envelope = JSON.parse(r.stdout);
      assert.equal(envelope.key, 'bill.help.lookup');
    });
  });

  it('② 配置文件 language.text: en：bill.record.add 采集页的可见正文是英文（真产物）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), EN_YAML, 'utf8');
      const r = runBill(home, 'bill.record.add');
      assert.equal(r.code, 0, 'language.text: en 不许让记账页交付失败，stderr=' + r.stderr);
      const envelope = JSON.parse(r.stdout);
      const path = envelope.delivery?.path;
      assert.ok(typeof path === 'string' && path.length > 0, '交付须带落盘路径');
      const html = readFileSync(path, 'utf8');
      // 可见正文：剥掉 style／script／标签，只留用户能看见的字。
      const visible = html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
      // ① 英文锚点：这几句是采集页的固定文案，en 下必须真的是英文。
      for (const anchor of ['Fill in the items below', 'Pick a category', 'Additional optional fields', 'Copy data', 'Plain text']) {
        assert.ok(visible.includes(anchor), 'en 可见正文缺英文锚点「' + anchor + '」：' + visible.slice(0, 300));
      }
      // ② 中文残留只许两类：冻结的命令关键字（#1236）、数据值（ADR-0004 不译）。
      const ALLOW = new Set(['记一笔', '餐饮', '工资', '出行', '其他收入']);
      const cjk = [...new Set(visible.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g) || [])];
      assert.deepEqual(cjk.filter((s) => !ALLOW.has(s)), [], 'en 可见正文出现未申报的中文残留：' + JSON.stringify(cjk));
      // ③ 显示面连接符按语言（#1311）：en 下不许顿号／全角加号。
      assert.ok(!visible.includes('、'), 'en 可见正文仍出现顿号（列表连接符未按语言）');
      assert.ok(!visible.includes('＋'), 'en 可见正文仍出现全角加号（符号未按语言）');
      // ④ 回执里的可见数据串同样不许中文（这句是回执 message，不是落盘文件）。
      assert.ok(!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(String(envelope.data?.message ?? '')), '回执 message 仍是中文：' + String(envelope.data?.message ?? ''));
    });
  });

  it('③ 未识别的语言：退出码 1，报错点名这个值并列出可用语言（argv 侧）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), OLD_YAML, 'utf8');
      const r = runBill(home, 'bill.help.lookup', ['--language', 'zz']);
      assert.equal(r.code, 1, '未识别语言＝预检那一档（exit 1），实得 ' + r.code + '，stderr=' + r.stderr);
      assert.match(r.stderr, /zz/, '报文点名这个值：' + r.stderr);
      assert.match(r.stderr, /zh/, '报文列出可用语言 zh：' + r.stderr);
      assert.match(r.stderr, /en/, '报文列出可用语言 en：' + r.stderr);
    });
  });

  it('③ 未识别的语言：配置文件侧同样 exit 1 且列可用语言', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), EN_YAML.replace('  text: en', '  text: zz'), 'utf8');
      const r = runBill(home, 'bill.help.lookup');
      assert.equal(r.code, 1, 'stderr=' + r.stderr);
      assert.match(r.stderr, /zz/);
      assert.match(r.stderr, /zh/);
      assert.match(r.stderr, /en/);
    });
  });

  it('格式语言可单独覆盖（--format-language 与 --language 两条链互不串）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), OLD_YAML, 'utf8');
      const ok = runBill(home, 'bill.help.lookup', ['--format-language', 'en']);
      assert.equal(ok.code, 0, 'stderr=' + ok.stderr);
      const bad = runBill(home, 'bill.help.lookup', ['--format-language', 'zz']);
      assert.equal(bad.code, 1, 'stderr=' + bad.stderr);
      assert.match(bad.stderr, /zz/);
    });
  });

  it('缺值形态：--language 后面没值即按用法错挡下（不当成下一个参数吃掉）', () => {
    withHome((home) => {
      const dir = configDirOf(home);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'bill.yaml'), OLD_YAML, 'utf8');
      const r = runBill(home, 'bill.help.lookup', ['--language']);
      assert.equal(r.code, 2, '用法／参数那一档（exit 2），实得 ' + r.code + '，stderr=' + r.stderr);
      assert.match(r.stderr, /--language/);
    });
  });
});
