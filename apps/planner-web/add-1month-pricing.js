const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function add1MonthPricing() {
  console.log('📝 Adding 1-month subscription pricing...\n');

  // 관리수강 1개월 가격 (이미지 기반)
  const managed1Month = [
    // 25분
    { frequency: '주2회', duration: '25분', payment_period: '1개월', total_lessons: 8, base_price: 145000, managed_cash_price: 265000, managed_card_price: 291500, per_lesson_price: 33125, per_month_price: 265000 },
    { frequency: '주3회', duration: '25분', payment_period: '1개월', total_lessons: 12, base_price: 213000, managed_cash_price: 342000, managed_card_price: 376200, per_lesson_price: 28500, per_month_price: 342000 },
    { frequency: '주5회', duration: '25분', payment_period: '1개월', total_lessons: 20, base_price: 354000, managed_cash_price: 507000, managed_card_price: 557000, per_lesson_price: 25350, per_month_price: 507000 },
    // 50분
    { frequency: '주2회', duration: '50분', payment_period: '1개월', total_lessons: 8, base_price: 290000, managed_cash_price: 430000, managed_card_price: 473000, per_lesson_price: 53750, per_month_price: 430000 },
    { frequency: '주3회', duration: '50분', payment_period: '1개월', total_lessons: 12, base_price: 426000, managed_cash_price: 584000, managed_card_price: 642400, per_lesson_price: 48670, per_month_price: 584000 },
    { frequency: '주5회', duration: '50분', payment_period: '1개월', total_lessons: 20, base_price: 708000, managed_cash_price: 914000, managed_card_price: 1005400, per_lesson_price: 45700, per_month_price: 914000 }
  ];

  console.log('📊 Inserting managed 1-month pricing...');
  for (const price of managed1Month) {
    const { error } = await supabase
      .from('pricing_templates')
      .upsert({
        planner_id: null,
        ...price,
        is_active: true
      }, {
        onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
      });

    if (error) {
      console.log(`  ⚠️  ${price.frequency} ${price.duration}: ${error.message}`);
    } else {
      console.log(`  ✅ ${price.frequency} ${price.duration} (${price.total_lessons}회)`);
      console.log(`     관리 현금: ${price.managed_cash_price.toLocaleString()}원, 카드: ${price.managed_card_price.toLocaleString()}원`);
    }
  }

  // 일반수강 1개월 = 관리수강 - 2만원
  const regular1Month = [
    // 25분
    { frequency: '주2회', duration: '25분', payment_period: '1개월', total_lessons: 8, base_price: 145000, regular_cash_price: 245000, regular_card_price: 269500, per_lesson_price: 30625, per_month_price: 245000 },
    { frequency: '주3회', duration: '25분', payment_period: '1개월', total_lessons: 12, base_price: 213000, regular_cash_price: 322000, regular_card_price: 354200, per_lesson_price: 26833, per_month_price: 322000 },
    { frequency: '주5회', duration: '25분', payment_period: '1개월', total_lessons: 20, base_price: 354000, regular_cash_price: 487000, regular_card_price: 535700, per_lesson_price: 24350, per_month_price: 487000 },
    // 50분
    { frequency: '주2회', duration: '50분', payment_period: '1개월', total_lessons: 8, base_price: 290000, regular_cash_price: 410000, regular_card_price: 451000, per_lesson_price: 51250, per_month_price: 410000 },
    { frequency: '주3회', duration: '50분', payment_period: '1개월', total_lessons: 12, base_price: 426000, regular_cash_price: 564000, regular_card_price: 620400, per_lesson_price: 47000, per_month_price: 564000 },
    { frequency: '주5회', duration: '50분', payment_period: '1개월', total_lessons: 20, base_price: 708000, regular_cash_price: 894000, regular_card_price: 983400, per_lesson_price: 44700, per_month_price: 894000 }
  ];

  console.log('\n📊 Inserting regular 1-month pricing (관리 - 2만원)...');
  for (const price of regular1Month) {
    const { error } = await supabase
      .from('pricing_templates')
      .upsert({
        planner_id: null,
        ...price,
        is_active: true
      }, {
        onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
      });

    if (error) {
      console.log(`  ⚠️  ${price.frequency} ${price.duration}: ${error.message}`);
    } else {
      console.log(`  ✅ ${price.frequency} ${price.duration} (${price.total_lessons}회)`);
      console.log(`     일반 현금: ${price.regular_cash_price.toLocaleString()}원, 카드: ${price.regular_card_price.toLocaleString()}원`);
    }
  }

  // Verify all pricing data
  console.log('\n🔍 Final verification - all pricing data...\n');
  const { data, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .order('payment_period', { ascending: true })
    .order('frequency', { ascending: true })
    .order('duration', { ascending: true });

  if (error) {
    console.error('❌ Verification error:', error);
  } else {
    const byPeriod = {};
    data.forEach(item => {
      if (!byPeriod[item.payment_period]) byPeriod[item.payment_period] = [];
      byPeriod[item.payment_period].push(item);
    });

    Object.keys(byPeriod).sort().forEach(period => {
      const items = byPeriod[period];
      console.log(`\n📅 ${period} (${items.length}개):`);
      items.forEach(item => {
        const type = item.managed_cash_price ? '관리' : '일반';
        const cashPrice = item.managed_cash_price || item.regular_cash_price;
        console.log(`  ${type} ${item.frequency} ${item.duration} (${item.total_lessons}회): ${cashPrice.toLocaleString()}원`);
      });
    });

    console.log(`\n✅ Total: ${data.length} pricing records`);
  }

  console.log('\n✨ 1-month pricing addition complete!\n');
}

add1MonthPricing().catch(console.error);
