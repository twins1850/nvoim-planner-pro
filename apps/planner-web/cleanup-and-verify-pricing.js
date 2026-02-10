const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupAndVerify() {
  console.log('🧹 Cleaning up old incorrect regular pricing data...\n');

  // Delete old incorrect records (those with made-up prices)
  const incorrectPrices = [
    { frequency: '주3회', duration: '25분', payment_period: '3개월', total_lessons: 36, regular_cash_price: 670000 },
    { frequency: '주3회', duration: '25분', payment_period: '6개월', total_lessons: 72, regular_cash_price: 1320000 },
    { frequency: '주3회', duration: '25분', payment_period: '12개월', total_lessons: 144, regular_cash_price: 2640000 }
  ];

  for (const price of incorrectPrices) {
    const { error } = await supabase
      .from('pricing_templates')
      .delete()
      .is('planner_id', null)
      .eq('frequency', price.frequency)
      .eq('duration', price.duration)
      .eq('payment_period', price.payment_period)
      .eq('total_lessons', price.total_lessons)
      .eq('regular_cash_price', price.regular_cash_price);

    if (error) {
      console.log(`  ⚠️  Failed to delete ${price.frequency} ${price.duration} ${price.payment_period}: ${error.message}`);
    } else {
      console.log(`  ✅ Deleted old ${price.frequency} ${price.duration} ${price.payment_period}`);
    }
  }

  // Verify final data
  console.log('\n🔍 Final verification of all pricing data...\n');

  const { data: allData, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .or('managed_cash_price.not.is.null,regular_cash_price.not.is.null')
    .order('frequency', { ascending: true })
    .order('duration', { ascending: true })
    .order('payment_period', { ascending: true });

  if (error) {
    console.error('❌ Verification error:', error);
    return;
  }

  console.log(`✅ Found ${allData.length} total pricing records\n`);

  // Group by type
  const managed = allData.filter(x => x.managed_cash_price && !x.regular_cash_price);
  const regular = allData.filter(x => x.regular_cash_price && !x.managed_cash_price);
  const both = allData.filter(x => x.managed_cash_price && x.regular_cash_price);

  console.log('📊 관리수강 가격 (' + managed.length + '개):');
  managed.forEach(item => {
    console.log(`  ${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
    console.log(`    현금: ${item.managed_cash_price.toLocaleString()}원, 카드: ${item.managed_card_price.toLocaleString()}원\n`);
  });

  console.log('📊 일반수강 가격 (' + regular.length + '개):');
  regular.forEach(item => {
    console.log(`  ${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
    console.log(`    현금: ${item.regular_cash_price.toLocaleString()}원, 카드: ${item.regular_card_price.toLocaleString()}원`);
    if (item.per_lesson_price) {
      console.log(`    회당: ${item.per_lesson_price.toLocaleString()}원, 월: ${item.per_month_price.toLocaleString()}원\n`);
    } else {
      console.log('');
    }
  });

  if (both.length > 0) {
    console.log('⚠️  Both managed and regular prices (' + both.length + '개):');
    both.forEach(item => {
      console.log(`  ${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
      console.log(`    관리 현금: ${item.managed_cash_price.toLocaleString()}원`);
      console.log(`    일반 현금: ${item.regular_cash_price.toLocaleString()}원\n`);
    });
  }

  console.log('✨ Cleanup and verification complete!\n');
}

cleanupAndVerify().catch(console.error);
