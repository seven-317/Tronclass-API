import 'dotenv/config';
import { 
  TronClass, 
  Schools, 
  TronClassService, 
  LineFormatter, 
  solveCaptcha 
} from '../src/index.js';

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

  const service = new TronClassService(tc);
  
  console.log('--- Generating LINE Dashboard Flex Message ---');
  const dashboardData = await service.getDashboard();
  const dashboardFlex = LineFormatter.formatDashboard(dashboardData);
  console.log(JSON.stringify(dashboardFlex, null, 2));

  console.log('\n--- Generating LINE Deadlines Flex Message (Next 14 days) ---');
  const deadlines = await service.getUpcomingDeadlines(14);
  const deadlinesFlex = LineFormatter.formatDeadlines(deadlines);
  console.log(JSON.stringify(deadlinesFlex, null, 2));
}

main().catch(console.error);
