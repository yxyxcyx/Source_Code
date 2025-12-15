// Script to fix incorrect pricing calculations in the database
// This fixes the bug where gpt-4o-mini-2024-07-18 was using gpt-4o pricing

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { calculateCost } = require('../config/pricing');

const dbPath = path.join(__dirname, '../../data/offline_express.db');

console.log('🔧 Starting pricing fix...');
console.log('Database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected');
});

// Get all records that need fixing
db.all(`
  SELECT id, model, prompt_tokens, completion_tokens, prompt_cost, completion_cost, total_cost
  FROM TOKEN_USAGE
  ORDER BY timestamp DESC
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error fetching records:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`\n📊 Found ${rows.length} total records`);
  
  let fixedCount = 0;
  let errorCount = 0;
  let totalOldCost = 0;
  let totalNewCost = 0;

  // Process each record
  const updates = rows.map(row => {
    return new Promise((resolve, reject) => {
      // Recalculate cost with correct pricing
      const correctCosts = calculateCost(row.prompt_tokens, row.completion_tokens, row.model);
      
      // Check if cost is different (allowing for small floating point differences)
      const costDiff = Math.abs(row.total_cost - correctCosts.totalCost);
      
      if (costDiff > 0.000001) {
        // Cost is incorrect, needs fixing
        totalOldCost += row.total_cost;
        totalNewCost += correctCosts.totalCost;
        
        console.log(`\n🔄 Fixing record ${row.id}:`);
        console.log(`   Model: ${row.model}`);
        console.log(`   Tokens: ${row.prompt_tokens} prompt, ${row.completion_tokens} completion`);
        console.log(`   Old cost: $${row.total_cost.toFixed(6)} (WRONG)`);
        console.log(`   New cost: $${correctCosts.totalCost.toFixed(6)} (CORRECT)`);
        console.log(`   Difference: $${(row.total_cost - correctCosts.totalCost).toFixed(6)}`);
        
        db.run(`
          UPDATE TOKEN_USAGE
          SET prompt_cost = ?,
              completion_cost = ?,
              total_cost = ?
          WHERE id = ?
        `, [correctCosts.promptCost, correctCosts.completionCost, correctCosts.totalCost, row.id], (err) => {
          if (err) {
            console.error(`   ❌ Error updating record ${row.id}:`, err.message);
            errorCount++;
            reject(err);
          } else {
            console.log(`   ✅ Fixed`);
            fixedCount++;
            resolve();
          }
        });
      } else {
        // Cost is already correct
        resolve();
      }
    });
  });

  // Wait for all updates to complete
  Promise.allSettled(updates).then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📈 PRICING FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total records checked: ${rows.length}`);
    console.log(`Records fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\n💰 COST CORRECTION:`);
    console.log(`Old total (incorrect): $${totalOldCost.toFixed(6)}`);
    console.log(`New total (correct): $${totalNewCost.toFixed(6)}`);
    console.log(`Savings: $${(totalOldCost - totalNewCost).toFixed(6)}`);
    console.log(`Overcharge percentage: ${((totalOldCost / totalNewCost - 1) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (fixedCount > 0) {
      console.log('\n✅ Pricing fix completed successfully!');
      console.log('💡 Please refresh the dashboard to see corrected costs.');
    } else {
      console.log('\n✅ All costs are already correct. No fixes needed.');
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      process.exit(errorCount > 0 ? 1 : 0);
    });
  });
});
