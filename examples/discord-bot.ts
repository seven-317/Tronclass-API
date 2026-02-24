import 'dotenv/config';
import { 
  TronClass, 
  Schools, 
  TronClassService, 
  DiscordFormatter, 
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
  
  console.log('--- Generating Discord Dashboard ---');
  const dashboardData = await service.getDashboard();
  const dashboardEmbed = DiscordFormatter.formatDashboard(dashboardData);
  console.log(JSON.stringify(dashboardEmbed, null, 2));

  console.log('\n--- Generating Discord Deadlines (Next 14 days) ---');
  const deadlines = await service.getUpcomingDeadlines(14);
  const deadlinesEmbed = DiscordFormatter.formatDeadlines(deadlines);
  console.log(JSON.stringify(deadlinesEmbed, null, 2));
}

main().catch(console.error);
