// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// gsh.js is a classic browser script (UMD); the repo is "type": "module", so load it as CommonJS by hand.
const src = readFileSync(new URL('../public/grudgeos/lib/gsh.js', import.meta.url), 'utf8');
const mod = { exports: {} };
new Function('module', src)(mod);
const { Shell, MemoryStore, parse, parseArgs } = mod.exports;

async function sh() {
  return new Shell({ store: new MemoryStore(), user: 'tester' }).init();
}

test('seeds a home folder and README', async () => {
  const s = await sh();
  assert.equal((await s.run('pwd')).out, '/home/tester');
  const ls = (await s.run('ls')).out;
  for (const d of ['Desktop/', 'Documents/', 'Projects/', 'README.txt']) assert.ok(ls.includes(d), d);
});

test('bash: write, append, read, pipe, grep', async () => {
  const s = await sh();
  await s.run('echo hello world > a.txt');
  await s.run('echo second line >> a.txt');
  assert.equal((await s.run('cat a.txt')).out, 'hello world\nsecond line');
  assert.equal((await s.run('cat a.txt | grep second')).out, 'second line');
  assert.equal((await s.run('cat a.txt | wc')).out, '2 4 24');
  assert.equal((await s.run('head -n 1 a.txt')).out, 'hello world');
  assert.equal((await s.run('tail -1 a.txt')).out, 'second line');
});

test('PowerShell verbs and aliases', async () => {
  const s = await sh();
  await s.run('New-Item -Path Projects/demo -ItemType Directory');
  await s.run('Set-Location Projects/demo');
  assert.equal((await s.run('Get-Location')).out, '/home/tester/Projects/demo');
  await s.run('Set-Content -Path notes.md -Value "first"');
  await s.run('Add-Content notes.md -Value second');
  assert.equal((await s.run('Get-Content notes.md')).out, 'first\nsecond');
  await s.run('Copy-Item notes.md copy.md');
  await s.run('Move-Item copy.md moved.md');
  assert.equal((await s.run('gci')).out, 'moved.md  notes.md');
  await s.run('Remove-Item moved.md');
  assert.equal((await s.run('dir')).out, 'notes.md');
  assert.equal((await s.run('Write-Output hi | Measure-Object')).out, '1 1 2');
});

test('cd .., ~, errors and exit codes', async () => {
  const s = await sh();
  await s.run('cd Documents');
  await s.run('cd ..');
  assert.equal((await s.run('pwd')).out, '/home/tester');
  const bad = await s.run('cd nowhere');
  assert.notEqual(bad.code, 0);
  assert.match(bad.out, /no such directory/);
  const nf = await s.run('frobnicate');
  assert.equal(nf.code, 127);
  await s.run('cd /tmp');
  await s.run('cd ~');
  assert.equal((await s.run('pwd')).out, '/home/tester');
});

test('&& stops on failure, ; keeps going', async () => {
  const s = await sh();
  const r1 = await s.run('cd nope && echo should-not-print');
  assert.ok(!r1.out.includes('should-not-print'));
  const r2 = await s.run('cd nope ; echo printed');
  assert.ok(r2.out.includes('printed'));
});

test('rm needs -r for folders; refuses /', async () => {
  const s = await sh();
  await s.run('mkdir -p x/y/z');
  assert.notEqual((await s.run('rm x')).code, 0);
  assert.equal((await s.run('rm -r x')).code, 0);
  assert.equal((await s.run('Remove-Item -Recurse /')).code, 1);
});

test('variables: export, $VAR, $env:VAR', async () => {
  const s = await sh();
  await s.run('export GAME=warlords');
  assert.equal((await s.run('echo $GAME')).out, 'warlords');
  await s.run('$env:REALM = "east"');
  assert.equal((await s.run('Write-Output $env:REALM')).out, 'east');
});

test('persists through the store', async () => {
  const store = new MemoryStore();
  const a = await new Shell({ store, user: 'p' }).init();
  await a.run('echo kept > keep.txt');
  const b = await new Shell({ store, user: 'p' }).init();
  assert.equal((await b.run('cat keep.txt')).out, 'kept');
});

test('size limits', async () => {
  const s = await sh();
  const big = 'x'.repeat(1024 * 1024 + 1);
  s.env.BIG = big;
  const r = await s.run('echo $BIG > big.txt');
  assert.notEqual(r.code, 0);
  assert.match(r.out, /too large/);
});

test('parser: quotes, pipes, redirects', () => {
  const chains = parse('echo "a | b" | grep a > out.txt && ls');
  assert.equal(chains.length, 2);
  assert.deepEqual(chains[0].pipeline[0].argv, ['echo', 'a | b']);
  assert.deepEqual(chains[0].pipeline[1].redirect, { path: 'out.txt', append: false });
  assert.equal(chains[1].join, '&&');
  const a = parseArgs(['-rf', '-Recurse', '-Path', 'p', 'q', '-5']);
  assert.ok(a.flags.has('r') && a.flags.has('f') && a.flags.has('recurse'));
  assert.equal(a.named.path, 'p');
  assert.equal(a.named.n, '5');
  assert.deepEqual(a.pos, ['q']);
});

test('open uses the desktop hook and nothing else', async () => {
  const opened = [];
  const s = await new Shell({ store: new MemoryStore(), hooks: { openApp: (id) => { opened.push(id); return true; } } }).init();
  assert.equal((await s.run('open treaty')).out, 'opening treaty');
  assert.equal((await s.run('Start-Process grudchat')).code, 0);
  assert.deepEqual(opened, ['treaty', 'grudchat']);
});
