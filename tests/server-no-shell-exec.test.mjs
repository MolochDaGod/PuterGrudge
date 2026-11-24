// Run: node --test tests/*.test.mjs
// Static guard: the API server must not run shell commands from requests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../server/', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|js|mjs|cjs)$/.test(name)) out.push(full);
  }
  return out;
}

// Drop comment lines so explanations of removed code don't trip the guards.
const code = (src) => src.split('\n').map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l)).join('\n');
const files = walk(root).map((f) => ({ f, src: code(readFileSync(f, 'utf8')) }));

test('no child_process in the API server', () => {
  const hits = files.filter(({ src }) => /child_process/.test(src)).map(({ f }) => f.replace(root, 'server/'));
  assert.deepEqual(hits, [], `child_process imported in: ${hits.join(', ')}`);
});

test('no exec/execSync/spawn calls anywhere in the server', () => {
  // A bare call (not RegExp#exec, which is always obj.exec(...)).
  const bad = /(^|[^.\w])(exec|execSync|execAsync|spawn|spawnSync|execFile|execFileSync|fork)\s*\(|shell\s*:\s*true/;
  const hits = [];
  for (const { f, src } of files) {
    src.split('\n').forEach((line, i) => {
      if (bad.test(line)) hits.push(`${f.replace(root, 'server/')}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('/api/terminal/exec only answers 410 Gone', () => {
  const routes = readFileSync(join(root, 'routes.ts'), 'utf8');
  const idx = routes.indexOf("'/api/terminal/exec'");
  assert.ok(idx > 0, 'stub route present');
  const block = routes.slice(idx + "'/api/terminal/exec'".length, routes.indexOf('});', idx));
  assert.match(block, /status\(410\)/);
  assert.doesNotMatch(block, /\bexec\w*\s*\(|spawn|req\.body/);
  assert.equal(routes.split("'/api/terminal/exec'").length - 1, 1, 'only one terminal route');
});
