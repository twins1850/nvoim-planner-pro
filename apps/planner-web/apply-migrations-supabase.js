// Apply migrations using Supabase client methods
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function insertPostponementRules() {
  console.log('\n📝 Inserting postponement rules...');

  const rules = [
    { total_lessons: 1, max_postponements: 0 },
    { total_lessons: 4, max_postponements: 1 },
    { total_lessons: 8, max_postponements: 1 },
    { total_lessons: 12, max_postponements: 2 },
    { total_lessons: 20, max_postponements: 3 },
    { total_lessons: 24, max_postponements: 3 },
    { total_lessons: 36, max_postponements: 6 },
    { total_lessons: 60, max_postponements: 10 },
    { total_lessons: 72, max_postponements: 12 }
  ];

  for (const rule of rules) {
    const { error } = await supabase
      .from('postponement_rules')
      .upsert(rule, { onConflict: 'total_lessons' });

    if (error && !error.message.includes('duplicate')) {
      console.log(`  ⚠️  ${rule.total_lessons}회: ${error.message}`);
    } else {
      console.log(`  ✅ ${rule.total_lessons}회 → ${rule.max_postponements}회`);
    }
  }
}

async function insertPricingData() {
  console.log('\n📝 Inserting pricing data...');

  // 20분 수업 원단가
  const pricing20min = [
    { frequency: '주1회', duration: '20분', payment_period: '1개월', total_lessons: 4, base_price: 64000 },
    { frequency: '주2회', duration: '20분', payment_period: '1개월', total_lessons: 8, base_price: 120000 },
    { frequency: '주3회', duration: '20분', payment_period: '1개월', total_lessons: 12, base_price: 179000 },
    { frequency: '주5회', duration: '20분', payment_period: '1개월', total_lessons: 20, base_price: 298000 },
    { frequency: '주2회', duration: '20분', payment_period: '3개월', total_lessons: 24, base_price: 345000 },
    { frequency: '주3회', duration: '20분', payment_period: '3개월', total_lessons: 36, base_price: 510000 },
    { frequency: '주5회', duration: '20분', payment_period: '3개월', total_lessons: 60, base_price: 847000 }
  ];

  // 25분 수업 원단가
  const pricing25min = [
    { frequency: '주1회', duration: '25분', payment_period: '1개월', total_lessons: 4, base_price: 76000 },
    { frequency: '주2회', duration: '25분', payment_period: '1개월', total_lessons: 8, base_price: 145000 },
    { frequency: '주3회', duration: '25분', payment_period: '1개월', total_lessons: 12, base_price: 213000 },
    { frequency: '주5회', duration: '25분', payment_period: '1개월', total_lessons: 20, base_price: 354000 },
    { frequency: '주6회', duration: '25분', payment_period: '1개월', total_lessons: 24, base_price: 422000 },
    { frequency: '주2회', duration: '25분', payment_period: '3개월', total_lessons: 24, base_price: 422000 },
    { frequency: '주3회', duration: '25분', payment_period: '3개월', total_lessons: 36, base_price: 609000 },
    { frequency: '주5회', duration: '25분', payment_period: '3개월', total_lessons: 60, base_price: 1008000 },
    { frequency: '주6회', duration: '25분', payment_period: '3개월', total_lessons: 72, base_price: 1266000 }
  ];

  // 50분 수업 원단가 (25분 × 2)
  const pricing50min = [
    { frequency: '주1회', duration: '50분', payment_period: '1개월', total_lessons: 4, base_price: 152000 },
    { frequency: '주2회', duration: '50분', payment_period: '1개월', total_lessons: 8, base_price: 290000 },
    { frequency: '주3회', duration: '50분', payment_period: '1개월', total_lessons: 12, base_price: 426000 },
    { frequency: '주5회', duration: '50분', payment_period: '1개월', total_lessons: 20, base_price: 708000 },
    { frequency: '주2회', duration: '50분', payment_period: '3개월', total_lessons: 24, base_price: 844000 },
    { frequency: '주3회', duration: '50분', payment_period: '3개월', total_lessons: 36, base_price: 1218000 },
    { frequency: '주5회', duration: '50분', payment_period: '3개월', total_lessons: 60, base_price: 2016000 }
  ];

  // 프리미엄 과정
  const pricingPremium = [
    { frequency: '주6회', duration: '50분', payment_period: '1개월', total_lessons: 24, base_price: 932000 },
    { frequency: '주6회', duration: '50분', payment_period: '3개월', total_lessons: 72, base_price: 2796000 }
  ];

  const allPricing = [...pricing20min, ...pricing25min, ...pricing50min, ...pricingPremium];

  console.log(`  Inserting ${allPricing.length} base price records...`);

  for (const price of allPricing) {
    const record = {
      planner_id: null,
      ...price,
      is_active: true
    };

    const { error } = await supabase
      .from('pricing_templates')
      .upsert(record, {
        onConflict: 'planner_id,frequency,duration,payment_period,total_lessons',
        ignoreDuplicates: false
      });

    if (error) {
      console.log(`  ⚠️  ${price.frequency} ${price.duration} ${price.payment_period}: ${error.message}`);
    }
  }

  console.log(`  ✅ Pricing data inserted`);
}

async function main() {
  console.log('🚀 Applying migrations via Supabase client...\n');
  console.log('='.repeat(60));

  await insertPostponementRules();
  await insertPricingData();

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Data insertion completed!\n');
  console.log('Running verification...\n');

  // Run verification
  const { exec } = require('child_process');
  exec('node test-pricing-migrations.js', (error, stdout) => {
    console.log(stdout);
  });
}

main().catch(console.error);
