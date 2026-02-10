const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateRegularPricing() {
  console.log('📝 Updating regular pricing data with correct values...\n');

  // 일반수강 가격 데이터 (이미지 기반 정확한 값)
  const regularPricing = [
    // 25분/주3회
    { frequency: '주3회', duration: '25분', payment_period: '3개월', total_lessons: 36, base_price: 609000, regular_cash_price: 684000, regular_card_price: 752400, per_lesson_price: 19000, per_month_price: 228000 },
    { frequency: '주3회', duration: '25분', payment_period: '6개월', total_lessons: 72, base_price: 1218000, regular_cash_price: 1308000, regular_card_price: 1438800, per_lesson_price: 18167, per_month_price: 218000 },
    { frequency: '주3회', duration: '25분', payment_period: '12개월', total_lessons: 144, base_price: 2436000, regular_cash_price: 2496000, regular_card_price: 2745600, per_lesson_price: 17334, per_month_price: 208000 },

    // 50분/주3회 (25분 × 2)
    { frequency: '주3회', duration: '50분', payment_period: '3개월', total_lessons: 36, base_price: 1218000, regular_cash_price: 1365000, regular_card_price: 1501500, per_lesson_price: 37917, per_month_price: 455000 },
    { frequency: '주3회', duration: '50분', payment_period: '6개월', total_lessons: 72, base_price: 2436000, regular_cash_price: 2670000, regular_card_price: 2937000, per_lesson_price: 37083, per_month_price: 445000 },
    { frequency: '주3회', duration: '50분', payment_period: '12개월', total_lessons: 144, base_price: 4872000, regular_cash_price: 5220000, regular_card_price: 5742000, per_lesson_price: 36250, per_month_price: 435000 },

    // 25분/주5회
    { frequency: '주5회', duration: '25분', payment_period: '3개월', total_lessons: 60, base_price: 1008000, regular_cash_price: 1155000, regular_card_price: 1270500, per_lesson_price: 19250, per_month_price: 385000 },
    { frequency: '주5회', duration: '25분', payment_period: '6개월', total_lessons: 120, base_price: 2016000, regular_cash_price: 2250000, regular_card_price: 2475000, per_lesson_price: 18750, per_month_price: 375000 },
    { frequency: '주5회', duration: '25분', payment_period: '12개월', total_lessons: 240, base_price: 4032000, regular_cash_price: 4380000, regular_card_price: 4818000, per_lesson_price: 18250, per_month_price: 365000 },

    // 50분/주5회 (25분 × 2)
    { frequency: '주5회', duration: '50분', payment_period: '3개월', total_lessons: 60, base_price: 2016000, regular_cash_price: 2310000, regular_card_price: 2541000, per_lesson_price: 38500, per_month_price: 770000 },
    { frequency: '주5회', duration: '50분', payment_period: '6개월', total_lessons: 120, base_price: 4032000, regular_cash_price: 4560000, regular_card_price: 5016000, per_lesson_price: 38000, per_month_price: 760000 },
    { frequency: '주5회', duration: '50분', payment_period: '12개월', total_lessons: 240, base_price: 8064000, regular_cash_price: 9000000, regular_card_price: 9900000, per_lesson_price: 37500, per_month_price: 750000 }
  ];

  console.log('📊 Updating regular pricing data...');
  for (const price of regularPricing) {
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
      console.log(`  ⚠️  ${price.frequency} ${price.duration} ${price.payment_period}: ${error.message}`);
    } else {
      console.log(`  ✅ ${price.frequency} ${price.duration} ${price.payment_period} (${price.total_lessons}회)`);
      console.log(`     현금: ${price.regular_cash_price.toLocaleString()}원, 카드: ${price.regular_card_price.toLocaleString()}원`);
    }
  }

  // Verify
  console.log('\n🔍 Verifying updated data...\n');
  const { data, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .not('regular_cash_price', 'is', null)
    .order('frequency', { ascending: true })
    .order('duration', { ascending: true })
    .order('payment_period', { ascending: true });

  if (error) {
    console.error('❌ Verification error:', error);
  } else {
    console.log(`✅ Found ${data.length} regular pricing records:\n`);
    data.forEach(item => {
      console.log(`${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
      console.log(`  현금: ${item.regular_cash_price.toLocaleString()}원`);
      console.log(`  카드: ${item.regular_card_price.toLocaleString()}원`);
      console.log(`  회당단가: ${item.per_lesson_price.toLocaleString()}원`);
      console.log(`  월단가: ${item.per_month_price.toLocaleString()}원\n`);
    });
  }

  console.log('✨ Regular pricing update complete!\n');
}

updateRegularPricing().catch(console.error);
