// 词条层读数（票 #1200）：node --test。
//
// 读的是**编译产物** `../dist/index.js`（与兄弟包同形：先 `tsc -b`，再跑测试）。
// 夹具一律用 ASCII 标记（ZH:／EN:），不拿中文文案当判据——门只锁结构与行为，不锁文案字面（ADR-0004 §6）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE_LANGUAGE,
  MissingMessageError,
  MissingParamError,
  defineCatalog,
  evaluate,
  formatDate,
  formatNumber,
  resolve,
} from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/**
 * 夹具：基准语言三条、en 两条。
 * `enOnly` 只住在 en 里——正常路径下 MessageId 从基准语言派生，取不到这一格；这里用它钉
 * 「基准语言缺 → 落到终站 en」这一站（词条表是运行期数据，真会有这种缺口）。
 */
const catalog = defineCatalog({
  zh: { greeting: 'ZH:{name}', count: 'ZH:{n}', baseOnly: 'ZH-ONLY' },
  en: { greeting: 'EN:{name}', enOnly: 'EN-ONLY' },
});

describe('取词：zh／en 各取到一份值', () => {
  it('同一 key 在两个语言表里出各自的值', () => {
    assert.strictEqual(resolve(catalog, 'zh', 'greeting', { name: 'A' }), 'ZH:A');
    assert.strictEqual(resolve(catalog, 'en', 'greeting', { name: 'A' }), 'EN:A');
  });

  it('语言标识大小写不敏感（BCP 47：EN 与 en 同形）', () => {
    assert.strictEqual(resolve(catalog, 'EN', 'greeting', { name: 'A' }), 'EN:A');
    assert.strictEqual(resolve(catalog, ' En ', 'greeting', { name: 'A' }), 'EN:A');
  });

  it('加一门语言＝加一个语言键（不改代码）', () => {
    const wide = defineCatalog({ zh: { k: 'ZH-K' }, en: { k: 'EN-K' }, ja: { k: 'JA-K' } });
    assert.strictEqual(BASE_LANGUAGE, 'zh');
    assert.strictEqual(resolve(wide, 'ja', 'k'), 'JA-K');
    assert.strictEqual(resolve(wide, 'fr', 'k'), 'ZH-K'); // 没有 fr 表 → 链上第二站
  });
});

describe('缺词条回退链：请求语言 → 基准语言 zh → 终站 en', () => {
  it('请求语言缺 → 落基准语言 zh', () => {
    assert.strictEqual(resolve(catalog, 'en', 'baseOnly'), 'ZH-ONLY');
    assert.strictEqual(resolve(catalog, 'ja', 'baseOnly'), 'ZH-ONLY');
  });

  it('基准语言也缺 → 落终站 en', () => {
    assert.strictEqual(resolve(catalog, 'zh', 'enOnly'), 'EN-ONLY');
    assert.strictEqual(resolve(catalog, 'ja', 'enOnly'), 'EN-ONLY'); // ja → zh(缺) → en
  });

  it('请求语言有值时不看后面两站（顺序是「先命中先得」）', () => {
    assert.strictEqual(resolve(catalog, 'en', 'greeting', { name: 'A' }), 'EN:A');
  });

  it('链按首次出现去重：en 的链是 [en, zh]', () => {
    assert.throws(
      () => resolve(catalog, 'en', 'nope'),
      (error) => {
        assert.ok(error instanceof MissingMessageError);
        assert.deepStrictEqual([...error.languages], ['en', 'zh']);
        return true;
      },
    );
  });

  it('回退链走完仍缺 → 抛 MissingMessageError，绝不返回 undefined／空串', () => {
    assert.throws(
      () => resolve(catalog, 'zh', 'nope'),
      (error) => {
        assert.strictEqual(error.code, 'ENTRIES_MISSING_MESSAGE');
        assert.strictEqual(error.id, 'nope');
        assert.deepStrictEqual([...error.languages], ['zh', 'en']);
        return true;
      },
    );
    assert.throws(
      () => resolve(catalog, 'ja', 'nope'),
      (error) => {
        assert.deepStrictEqual([...error.languages], ['ja', 'zh', 'en']); // 三级链
        return true;
      },
    );
  });
});

describe('插值：朴素 ICU 语义（只认 {name} 具名占位）', () => {
  it('按 params 替换具名占位（字符串与数字都可）', () => {
    assert.strictEqual(evaluate({ template: 'x{name}y', language: 'zh', sourceLanguage: 'zh', params: { name: 'V' } }), 'xVy');
    assert.strictEqual(evaluate({ template: 'x{n}y', language: 'zh', sourceLanguage: 'zh', params: { n: 3 } }), 'x3y');
  });

  it('缺参抛 MissingParamError（不静默留空）', () => {
    assert.throws(
      () => evaluate({ template: 'x{name}y', language: 'zh', sourceLanguage: 'zh', params: {} }),
      (error) => {
        assert.ok(error instanceof MissingParamError);
        assert.strictEqual(error.code, 'ENTRIES_MISSING_PARAM');
        assert.strictEqual(error.param, 'name');
        return true;
      },
    );
    // 走 resolve 这一条路同样抛（端到端）
    assert.throws(() => resolve(catalog, 'zh', 'count'), (error) => error instanceof MissingParamError);
  });

  it('非具名花括号形态原样留在文本里（本期已知近似，真 ICU 从端口接）', () => {
    assert.strictEqual(evaluate({ template: 'x{0}y', language: 'zh', sourceLanguage: 'zh' }), 'x{0}y');
    assert.strictEqual(
      evaluate({ template: '{n, plural, other{#}}', language: 'zh', sourceLanguage: 'zh' }),
      '{n, plural, other{#}}',
    );
  });

  it('没有参数时求值请求里 params 缺席', () => {
    const seen = [];
    resolve(catalog, 'zh', 'baseOnly', undefined, { evaluate: (request) => { seen.push(request); return request.template; } });
    assert.strictEqual(Object.hasOwn(seen[0], 'params'), false);
  });
});

describe('求值端口可替换：同一 key、同一个词条，换后端出不同值', () => {
  it('换一个后端 → 同一 key 出不同值', () => {
    const upper = (request) => request.template.toUpperCase();
    const replaced = resolve(catalog, 'en', 'greeting', { name: 'A' }, { evaluate: upper });
    assert.strictEqual(replaced, 'EN:{NAME}');
    assert.notStrictEqual(replaced, resolve(catalog, 'en', 'greeting', { name: 'A' }));
  });

  it('端口拿得到模板、读者语言、实取语言、参数四样', () => {
    const seen = [];
    const spy = (request) => { seen.push(request); return request.template; };
    assert.strictEqual(resolve(catalog, 'en', 'greeting', { name: 'A' }, { evaluate: spy }), 'EN:{name}');
    assert.deepStrictEqual({ ...seen[0] }, { template: 'EN:{name}', language: 'en', sourceLanguage: 'en', params: { name: 'A' } });
  });

  it('回退命中时端口看得到两种语言不同（读者语言 vs 实取语言）', () => {
    const seen = [];
    const spy = (request) => { seen.push(request); return request.template; };
    assert.strictEqual(resolve(catalog, 'en', 'count', { n: 1 }, { evaluate: spy }), 'ZH:{n}');
    assert.strictEqual(seen[0].language, 'en'); // 请求语言（读者语言）
    assert.strictEqual(seen[0].sourceLanguage, 'zh'); // 实际取到这条词条的语言
  });
});

describe('数字与日期：直接用运行时自带的 Intl', () => {
  it('formatNumber：zh／en 出不同形态（同一数字、同一选项）', () => {
    const options = { style: 'unit', unit: 'kilometer' };
    const zh = formatNumber('zh', 1234.5, options);
    const en = formatNumber('en', 1234.5, options);
    assert.notStrictEqual(zh, en);
    // 数字部分相同、只有语言那一段不同（证明差异来自语言，不是数字本身）
    assert.ok(zh.startsWith('1,234.5'));
    assert.ok(en.startsWith('1,234.5'));
  });

  it('formatNumber：语言标识大小写不敏感，选项透传', () => {
    const options = { style: 'unit', unit: 'kilometer' };
    assert.strictEqual(formatNumber('EN', 1234.5, options), formatNumber('en', 1234.5, options));
    assert.strictEqual(formatNumber('en', 0.5, { style: 'percent' }), '50%');
  });

  it('formatDate：zh／en 出不同形态（年月日序不同）', () => {
    const at = new Date('2026-10-08T12:00:00Z');
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    const zh = formatDate('zh', at, options);
    const en = formatDate('en', at, options);
    assert.notStrictEqual(zh, en);
    assert.ok(zh.includes('2026') && en.includes('2026'));
    assert.ok(zh.startsWith('2026')); // zh 年份在前
    assert.ok(!en.startsWith('2026')); // en 年份在后
  });

  it('formatDate 收时间戳与 Date 同形', () => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
    const at = new Date('2026-10-08T12:00:00Z');
    assert.strictEqual(formatDate('en', at.getTime(), options), formatDate('en', at, options));
  });
});

describe('拼错 key：编译期红（@ts-expect-error 真红）', () => {
  const testDFile = join(PKG, 'test-d', 'message-id.test-d.ts');

  it('test-d 里挂着 @ts-expect-error，且被 tsc 工程收进来', () => {
    const source = readFileSync(testDFile, 'utf8');
    const lines = source.split('\n');
    // 指令必须是**独立一行**的注释形：正文里提到 '@ts-expect-error' 的那几句注释不算指令
    const directive = /^\s*\/\/\s*@ts-expect-error\b/;
    const at = lines.findIndex((line) => directive.test(line));
    assert.ok(at > 0, 'test-d 里必须有独立一行的 @ts-expect-error 指令');
    assert.match(lines[at + 1], /^\s*resolve\(/, '@ts-expect-error 必须挂在 resolve( 调用的上一行');
    const solution = JSON.parse(readFileSync(join(PKG, 'tsconfig.json'), 'utf8'));
    assert.ok(
      solution.references.some((reference) => reference.path.includes('test-d')),
      'solution 工程必须收 test-d（否则 tsc -b 不检查它）',
    );
  });

  it('去掉 @ts-expect-error 的副本必红（变异读数，证明指令不是空转）', (context) => {
    const tsc = join(PKG, '..', '..', 'node_modules', 'typescript', 'bin', 'tsc');
    if (!existsSync(tsc)) {
      context.skip('本机没有 typescript（先 pnpm install 再跑这条）');
      return;
    }
    const scratch = join(PKG, '.scratch');
    mkdirSync(scratch, { recursive: true });
    const mutant = join(scratch, 'message-id-mutant.ts');
    const source = readFileSync(testDFile, 'utf8').replace(/^\s*\/\/\s*@ts-expect-error[^\n]*\n/gm, '');
    assert.ok(!/^\s*\/\/\s*@ts-expect-error\b/m.test(source), '变异体里不许还剩指令行');
    writeFileSync(mutant, source);
    const run = spawnSync(
      process.execPath,
      [tsc, '--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', mutant],
      { encoding: 'utf8' },
    );
    assert.notStrictEqual(run.status, 0, '去掉 @ts-expect-error 后 tsc 必须报错（否则类型面没在拦）');
    assert.match(run.stdout + run.stderr, /TS2345/, '红的必须是「拼错的 key 不是 MessageId 成员」这一类');
  });
});

describe('包形状', () => {
  it('零运行时依赖（照 base-render 先例：只允许 dev／peer 里出现类型依赖）', () => {
    const manifest = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
    assert.deepStrictEqual(manifest.dependencies ?? {}, {});
    assert.deepStrictEqual(Object.keys(manifest.exports), ['.']);
  });
});
