/**
 * mutation-test.mjs — targeted mutation testing on the Phase 2 core rules
 * (run: npm run mutation-test).
 *
 * Protocol (per the Phase 2 directive):
 *   for every intentional mutation:
 *     1. confirm the relevant test FAILS against the mutated source (killed),
 *     2. restore the original implementation byte-for-byte,
 *     3. verify no mutation remains (checksum + final full test run is the
 *        caller's responsibility; this script asserts the restoration).
 *
 * Every mutation targets ONE important rule and is verified against the ONE
 * test file that owns that rule. Exit code 0 = all mutations killed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Each mutation must appear exactly once in its file (guaranteed by the find text). */
const MUTATIONS = [
  {
    id: 'M01',
    rule: 'EventBus: a throwing handler must not abort later handlers',
    file: 'src/core/EventBus.ts',
    find: 'for (const h of Array.from(set)) this.safeCall(h, payload, event);',
    replace: 'for (const h of Array.from(set)) h(payload);',
    test: 'tests/eventbus.test.ts',
  },
  {
    id: 'M02',
    rule: 'EventBus: once() removes itself after the first emit',
    file: 'src/core/EventBus.ts',
    find: `const wrapper: EventHandler = (payload) => {
      this.off(event, handler);
      this.safeCall(handler, payload, event);
    };`,
    replace: `const wrapper: EventHandler = (payload) => {
      this.safeCall(handler, payload, event);
    };`,
    test: 'tests/eventbus.test.ts',
  },
  {
    id: 'M03',
    rule: 'EventBus: synchronous re-emit of an in-flight event is detected (no stack death)',
    file: 'src/core/EventBus.ts',
    find: 'if (this.emitting.has(event)) throw new ReentrantEmitError(event);',
    replace: 'if (false) throw new ReentrantEmitError(event);',
    test: 'tests/eventbus.test.ts',
  },
  {
    id: 'M04',
    rule: 'GameState: spending more than owned is rejected',
    file: 'src/core/GameState.ts',
    find: 'if (amount > this._money) return false;',
    replace: '; // MUTANT: affordability check removed',
    test: 'tests/gamestate.test.ts',
  },
  {
    id: 'M05',
    rule: 'GameState: money stays an integer (fractional amounts rejected)',
    file: 'src/core/GameState.ts',
    find: `addMoney(amount: number): boolean {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {`,
    replace: `addMoney(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) {`,
    test: 'tests/gamestate.test.ts',
  },
  {
    id: 'M06',
    rule: 'TimeSystem: negative deltas never move the clock',
    file: 'src/core/TimeSystem.ts',
    find: 'if (!Number.isFinite(realSeconds) || realSeconds < 0) return;',
    replace: 'if (!Number.isFinite(realSeconds)) return;',
    test: 'tests/time.test.ts',
  },
  {
    id: 'M07',
    rule: 'TimeSystem: day wrap uses exact floor (O(1) large-delta rule)',
    file: 'src/core/TimeSystem.ts',
    find: 'const days = Math.floor(total / MINUTES_PER_DAY);',
    replace: 'const days = Math.ceil(total / MINUTES_PER_DAY);',
    test: 'tests/time.test.ts',
  },
  {
    id: 'M08',
    rule: 'SystemCoordinator: disposal runs in REVERSE init order',
    file: 'src/core/SystemCoordinator.ts',
    find: 'for (const entry of this.sorted().reverse()) {',
    replace: 'for (const entry of this.sorted()) {',
    test: 'tests/systemcoordinator.test.ts',
  },
  {
    id: 'M09',
    rule: 'SystemCoordinator: one broken system must not kill the update pass',
    file: 'src/core/SystemCoordinator.ts',
    find: `      } catch (err) {
        this.exceptionSink(err, entry.id, 'update');
      }`,
    replace: `      } catch (err) {
        throw err;
      }`,
    test: 'tests/systemcoordinator.test.ts',
  },
  {
    id: 'M10',
    rule: 'AppLifecycle: illegal transitions must throw (terminal phases are one-shot)',
    file: 'src/core/AppLifecycle.ts',
    find: 'if (!this.canTransition(to)) {',
    replace: 'if (false) {',
    test: 'tests/lifecycle.test.ts',
  },
  {
    id: 'M11',
    rule: 'InteractionSystem: the range boundary is inclusive (d2 <= r*r)',
    file: 'src/systems/InteractionSystem.ts',
    find: 'if (d2 <= r * r && d2 < bestD2) {',
    replace: 'if (d2 < r * r && d2 < bestD2) {',
    test: 'tests/interaction.test.ts',
  },
  {
    id: 'M12',
    rule: 'validateGameConfig: runSpeed must stay >= walkSpeed',
    file: 'src/config/validateConfig.ts',
    find: 'if (!Number.isFinite(c.runSpeed) || c.runSpeed < c.walkSpeed) {',
    replace: 'if (false) {',
    test: 'tests/validateconfig.test.ts',
  },
];

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

let killed = 0;
let survived = [];
const results = [];

for (const m of MUTATIONS) {
  const path = join(ROOT, m.file);
  const original = readFileSync(path, 'utf8');
  const originalHash = sha(original);

  const occurrences = original.split(m.find).length - 1;
  if (occurrences !== 1) {
    console.error(`[${m.id}] FATAL: find text occurs ${occurrences}x (must be exactly 1) in ${m.file}`);
    process.exit(2);
  }

  // 1. apply the mutation
  writeFileSync(path, original.replace(m.find, m.replace), 'utf8');

  // 2. run the owning test file — the mutation must be killed
  const run = spawnSync('npx', ['vitest', 'run', m.test, '--reporter=basic', '--silent'],
    { cwd: ROOT, encoding: 'utf8', shell: true, timeout: 120000 });
  const testFailed = run.status !== 0;
  if (testFailed) killed += 1; else survived.push(m.id);

  // 3. restore and prove byte-for-byte restoration
  writeFileSync(path, original, 'utf8');
  const restoredHash = sha(readFileSync(path, 'utf8'));
  const restored = restoredHash === originalHash;

  results.push({ ...m, testFailed, restored });
  console.log(
    `[${m.id}] ${testFailed ? 'KILLED' : 'SURVIVED'} | restored=${restored ? 'ok' : 'MISMATCH'} | ${m.rule}`,
  );
}

console.log(`\n${killed}/${MUTATIONS.length} mutations killed.`);
const unrestored = results.filter((r) => !r.restored);
if (unrestored.length > 0) {
  console.error('FATAL: some files were not restored correctly:', unrestored.map((r) => r.id).join(', '));
  process.exit(3);
}
if (survived.length > 0) {
  console.error('Surviving mutants (tests must be strengthened):', survived.join(', '));
  process.exit(1);
}
console.log('All targeted mutations were killed and all files restored byte-for-byte.');
