import 'dotenv/config';
import { TronClass, Schools, solveCaptcha } from '../src/index.js';

/**
 * This example demonstrates how to use the Attendance API
 * to list active rollcalls and potentially submit a PIN code.
 */
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

  console.log(`Found ${rollcalls.length} active rollcalls:`);
  for (const r of rollcalls) {
    console.log(`- [${r.rollcall_id}] ${r.course_title} (by ${r.created_by_name}, status: ${r.status})`);
    
    // Example of how you would submit a PIN if it's a number rollcall
    if (r.is_number) {
      console.log(`  -> Ready for PIN code. (Use tc.attendance.submitNumberRollcall(${r.rollcall_id}, "1234"))`);
      
      // Uncomment to actually submit a PIN:
      // const result = await tc.attendance.submitNumberRollcall(r.rollcall_id, "1234");
      // console.log(`  -> Status: ${result.status}`);
    }
  }
}

main().catch(console.error);
