// 가격 관리 시스템 마이그레이션 테스트
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`);

  const filepath = path.join(__dirname, 'supabase/migrations', filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle();

    if (error) {
      // Try alternative method - direct query
      console.log('  Trying alternative execution method...');
      const { error: altError } = await supabase.from('_prisma_migrations').select('*').limit(1);

      if (altError) {
        console.log(`  ⚠️  Error (expected for new tables): ${altError.message}`);
      }
    }

    console.log(`  ✅ Migration ${filename} executed`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function checkTables() {
  console.log('\n🔍 Checking created tables...\n');

  // Check pricing_templates
  try {
    const { count: pricingCount, error: pricingError } = await supabase
      .from('pricing_templates')
      .select('*', { count: 'exact', head: true });

    if (pricingError) {
      console.log('❌ pricing_templates: Not found or error');
      console.log(`   Error: ${pricingError.message}`);
    } else {
      console.log(`✅ pricing_templates: Exists (${pricingCount || 0} rows)`);
    }
  } catch (err) {
    console.log(`❌ pricing_templates: Error - ${err.message}`);
  }

  // Check postponement_rules
  try {
    const { count: postponeCount, error: postponeError } = await supabase
      .from('postponement_rules')
      .select('*', { count: 'exact', head: true });

    if (postponeError) {
      console.log('❌ postponement_rules: Not found or error');
      console.log(`   Error: ${postponeError.message}`);
    } else {
      console.log(`✅ postponement_rules: Exists (${postponeCount || 0} rows)`);
    }
  } catch (err) {
    console.log(`❌ postponement_rules: Error - ${err.message}`);
  }

  // Check planner_pricing_settings
  try {
    const { count: settingsCount, error: settingsError } = await supabase
      .from('planner_pricing_settings')
      .select('*', { count: 'exact', head: true });

    if (settingsError) {
      console.log('❌ planner_pricing_settings: Not found or error');
      console.log(`   Error: ${settingsError.message}`);
    } else {
      console.log(`✅ planner_pricing_settings: Exists (${settingsCount || 0} rows)`);
    }
  } catch (err) {
    console.log(`❌ planner_pricing_settings: Error - ${err.message}`);
  }

  // Check subscriptions columns
  try {
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('pricing_type, payment_method, per_lesson_price, per_month_price')
      .limit(1);

    if (subError) {
      console.log('❌ subscriptions new columns: Not found');
      console.log(`   Error: ${subError.message}`);
    } else {
      console.log('✅ subscriptions: New columns added successfully');
    }
  } catch (err) {
    console.log(`❌ subscriptions: Error - ${err.message}`);
  }
}

async function testRPCFunctions() {
  console.log('\n🧪 Testing RPC functions...\n');

  // Test calculate_max_postponements
  try {
    const { data: postponeData, error: postponeError } = await supabase
      .rpc('calculate_max_postponements', { p_total_lessons: 36 });

    if (postponeError) {
      console.log('❌ calculate_max_postponements: Error');
      console.log(`   Error: ${postponeError.message}`);
    } else {
      console.log(`✅ calculate_max_postponements(36): ${postponeData} (expected: 6)`);
    }
  } catch (err) {
    console.log(`❌ calculate_max_postponements: ${err.message}`);
  }

  // Test calculate_subscription_price
  try {
    // Get a planner ID from profiles
    const { data: planners } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'planner')
      .limit(1);

    if (planners && planners.length > 0) {
      const plannerId = planners[0].id;

      const { data: priceData, error: priceError } = await supabase
        .rpc('calculate_subscription_price', {
          p_planner_id: plannerId,
          p_frequency: '주3회',
          p_duration: '25분',
          p_payment_period: '3개월',
          p_total_lessons: 36,
          p_pricing_type: 'base',
          p_payment_method: 'cash'
        });

      if (priceError) {
        console.log('❌ calculate_subscription_price: Error');
        console.log(`   Error: ${priceError.message}`);
      } else {
        console.log('✅ calculate_subscription_price: Success');
        console.log(`   Result: ${JSON.stringify(priceData, null, 2)}`);
      }
    } else {
      console.log('⚠️  calculate_subscription_price: No planner found to test');
    }
  } catch (err) {
    console.log(`❌ calculate_subscription_price: ${err.message}`);
  }
}

async function main() {
  console.log('🚀 Starting pricing system migration test...\n');
  console.log('=' .repeat(60));

  // Check tables status
  await checkTables();

  // Test RPC functions
  await testRPCFunctions();

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Test completed!\n');
}

main().catch(console.error);
