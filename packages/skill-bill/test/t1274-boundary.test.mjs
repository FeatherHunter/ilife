// #1274 · 守边界：快照时效、版本注入与路径脱敏（三处边界的判据锁）。
// 本票只守边界：条目 10 的候选注入归 #1270、条目 24 的「设置当前配置」场景归 #1276；
// 这里锁的是它们共用的边界契约：about_meta（版本＋快照时刻）、HELP 载荷无本机路径、路径脱敏函数。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildHelpFileData, renderHelpFileHtml, buildAboutMeta,
  HELP_FILE_VERSION, HELP_SKILL_PACKAGE_VERSION, HELP_TEMPLATE_VERSION, HELP_SNAPSHOT_REUSE_HOURS,
} from '../dist/render/index.js';
import { desensitizeLocalPath } from '../dist/fetch/paths.js';

const NOW = new Date(2026, 8, 11, 14, 30, 15); // 本地时间 2026-09-11 14:30:15
const DATA_OPEN = '<script id="help-data" type="application/json">';

/** 从渲染产物里取回 payload（壳内 JSON，逐键核对用）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_OPEN);
  assert.ok(at > 0, 'HTML 缺 help-data 锚点');
  const end = html.indexOf('</script>', at);
  return JSON.parse(html.slice(at + DATA_OPEN.length, end));
}

describe('#1274 条目 15 版本注入：技能包版本进关于页主行，模板代际退居小字', () => {
  it('技能包版本镜像与 package.json 一致（改版本时同步改 helpFile 常量）', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(HELP_SKILL_PACKAGE_VERSION, pkg.version);
    assert.equal(buildAboutMeta(NOW).skill_package_version, pkg.version);
  });

  it('数据世代版本仍是 2.0（用户认可），模板代际仍是 v4', () => {
    const data = buildHelpFileData(NOW);
    assert.equal(HELP_FILE_VERSION, '2.0');
    assert.equal(data.version, '2.0');
    assert.equal(HELP_TEMPLATE_VERSION, 'v4');
    assert.equal(data.about_meta.template_version, 'v4');
  });

  it('关于页显示值全在 about_meta 里（模板运行时只负责照印，见 base 侧接线锁）', () => {
    const data = buildHelpFileData(NOW);
    assert.deepEqual(data.about_meta, {
      skill_package_version: HELP_SKILL_PACKAGE_VERSION,
      template_version: 'v4',
      snapshot_at: '2026-09-11 14:30',
      reuse_hours: 24,
      snapshot_note: '一天前的标签都在',
    });
    const html = renderHelpFileHtml(data);
    assert.deepEqual(payloadOf(html).about_meta, data.about_meta);
  });

  it('旧载荷（无 about_meta）照样渲染（模板回落旧文案，见 base 侧接线锁）', () => {
    const data = buildHelpFileData(NOW);
    const legacy = { ...data };
    delete legacy.about_meta;
    const html = renderHelpFileHtml(legacy);
    assert.ok(!('about_meta' in payloadOf(html)), '旧载荷不凭空多键');
  });
});

describe('#1274 条目 10 快照时效：快照时刻与 subtitle 同源，载荷无本机路径', () => {
  it('snapshot_at 与 subtitle 的更新于同一分钟（同一 now）', () => {
    const data = buildHelpFileData(NOW);
    assert.equal(data.about_meta.snapshot_at, '2026-09-11 14:30');
    assert.ok(data.subtitle.includes('更新于 2026-09-11 14:30'));
    assert.equal(data.about_meta.reuse_hours, HELP_SNAPSHOT_REUSE_HOURS);
    assert.equal(HELP_SNAPSHOT_REUSE_HOURS, 24);
    assert.equal(data.about_meta.snapshot_note, '一天前的标签都在');
  });

  it('HELP 载荷不含本机绝对路径（反斜杠盘符／home 用户目录）', () => {
    const html = renderHelpFileHtml(buildHelpFileData(NOW));
    const json = JSON.stringify(payloadOf(html));
    assert.ok(!/[A-Za-z]:\\/.test(json), '载荷不得含 Windows 本机绝对路径');
    assert.ok(!/\/home\//.test(json), '载荷不得含 home 用户目录');
    assert.ok(!/\/Users\//.test(json), '载荷不得含 macOS 用户目录');
  });
});

describe('#1274 条目 24 路径脱敏：只遮用户名一段', () => {
  it('Windows 正反斜杠与大小写盘符', () => {
    assert.equal(desensitizeLocalPath('C:\\Users\\小明\\data\\a.db'), 'C:\\Users\\****\\data\\a.db');
    assert.equal(desensitizeLocalPath('c:/Users/Someone/.ilife/bill.yaml'), 'c:/Users/****/.ilife/bill.yaml');
    assert.equal(desensitizeLocalPath('D:\\2Study\\x.db'), 'D:\\2Study\\x.db');
  });

  it('POSIX 家目录与非用户路径', () => {
    assert.equal(desensitizeLocalPath('/home/lily/.ilife/bill.yaml'), '/home/****/.ilife/bill.yaml');
    assert.equal(desensitizeLocalPath('/Users/lily/data/a.db'), '/Users/****/data/a.db');
    assert.equal(desensitizeLocalPath('/var/data/a.db'), '/var/data/a.db');
    assert.equal(desensitizeLocalPath(''), '');
  });
});
