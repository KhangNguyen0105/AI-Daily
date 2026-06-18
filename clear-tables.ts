import { db } from './src/db/index';
import { extractions, promotions, practicalCosts, rawData, pipelineRuns } from './src/db/schema';

async function main() {
  console.log('Truncating tables to clear duplicates...');
  await db.delete(practicalCosts);
  await db.delete(extractions);
  await db.delete(promotions);
  console.log('Done.');
  process.exit(0);
}

main().catch(console.error);
