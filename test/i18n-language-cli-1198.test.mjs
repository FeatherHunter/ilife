/**
 * #1198 · 语言选择链的**端到端**验收（真出口 spawn ＋ 隔离家目录）。
 *
 * 与 `test/i18n-language-1198.test.mjs`（公共层纯函数那半）分工：那一件证明算法，本件证明
 * **生产真正走的那条路**——`packages/skill-bill/dist/cli/cmd_read.js` 这条出口真的把
 * `--language`／`language.text` 读进来、未知值真的响亮失败。
 *
 * 票面三条验收（读数形状）：
 *   ① 不设语言时产物与基线逐字节相同；
 *   ② 设 `language.text: en` 后同一条命令的输出走英文（本件读的是**链**：解析出来的语言是不是 en。
 *      文本本身的英文要等词条层 #1200 的渲染消费方接线，本件不伪造一个「英文产物」）；
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
      assert.equal(b.delivery.bytes, a.delivery.bytes, '本轮未接渲染消费方：产物字节数不变（只接线与校验）');
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
