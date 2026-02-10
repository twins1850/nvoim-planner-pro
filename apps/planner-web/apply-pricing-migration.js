const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertPricingData() {
  console.log('📝 Inserting managed/regular pricing data...\n');

  // 관리수강 가격 데이터
  const managedPricing = [
    // 25분/주3회
    { frequency: '주3회', duration: '25분', payment_period: '3개월', total_lessons: 36, base_price: 609000, managed_cash_price: 844400, managed_card_price: 929000, per_lesson_price: 23456, per_month_price: 281467 },
    { frequency: '주3회', duration: '25분', payment_period: '6개월', total_lessons: 72, base_price: 1218000, managed_cash_price: 1568800, managed_card_price: 1725680, per_lesson_price: 21789, per_month_price: 261467 },
    { frequency: '주3회', duration: '25분', payment_period: '12개월', total_lessons: 144, base_price: 2436000, managed_cash_price: 3027600, managed_card_price: 3330360, per_lesson_price: 21025, per_month_price: 252300 },
    // 50분/주3회
    { frequency: '주3회', duration: '50분', payment_period: '3개월', total_lessons: 36, base_price: 1218000, managed_cash_price: 1526400, managed_card_price: 1679040, per_lesson_price: 42400, per_month_price: 508800 },
    { frequency: '주3회', duration: '50분', payment_period: '6개월', total_lessons: 72, base_price: 2436000, managed_cash_price: 2808800, managed_card_price: 3089680, per_lesson_price: 39011, per_month_price: 468133 },
    { frequency: '주3회', duration: '50분', payment_period: '12개월', total_lessons: 144, base_price: 4872000, managed_cash_price: 5507600, managed_card_price: 6058360, per_lesson_price: 38247, per_month_price: 458967 },
    // 25분/주5회
    { frequency: '주5회', duration: '25분', payment_period: '3개월', total_lessons: 60, base_price: 1008000, managed_cash_price: 1252300, managed_card_price: 1377530, per_lesson_price: 20872, per_month_price: 417433 },
    { frequency: '주5회', duration: '25분', payment_period: '6개월', total_lessons: 120, base_price: 2016000, managed_cash_price: 2384600, managed_card_price: 2623060, per_lesson_price: 19871, per_month_price: 397433 },
    { frequency: '주5회', duration: '25분', payment_period: '12개월', total_lessons: 240, base_price: 4032000, managed_cash_price: 4659200, managed_card_price: 5125120, per_lesson_price: 19413, per_month_price: 388266 },
    // 50분/주5회
    { frequency: '주5회', duration: '50분', payment_period: '3개월', total_lessons: 60, base_price: 2016000, managed_cash_price: 2407300, managed_card_price: 2648030, per_lesson_price: 40122, per_month_price: 802433 },
    { frequency: '주5회', duration: '50분', payment_period: '6개월', total_lessons: 120, base_price: 4032000, managed_cash_price: 4694600, managed_card_price: 5164060, per_lesson_price: 39122, per_month_price: 782433 },
    { frequency: '주5회', duration: '50분', payment_period: '12개월', total_lessons: 240, base_price: 8064000, managed_cash_price: 9279200, managed_card_price: 10207120, per_lesson_price: 38663, per_month_price: 773267 }
  ];

  console.log('📊 Inserting managed pricing data...');
  for (const price of managedPricing) {
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
    }
  }

  // 일반수강 가격 데이터
  const regularPricing = [
    { frequency: '주3회', duration: '25분', payment_period: '3개월', total_lessons: 36, base_price: 609000, regular_cash_price: 670000, regular_card_price: 737000 },
    { frequency: '주3회', duration: '25분', payment_period: '6개월', total_lessons: 72, base_price: 1218000, regular_cash_price: 1320000, regular_card_price: 1452000 },
    { frequency: '주3회', duration: '25분', payment_period: '12개월', total_lessons: 144, base_price: 2436000, regular_cash_price: 2640000, regular_card_price: 2904000 }
  ];

  console.log('\n📊 Inserting regular pricing data...');
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
    }
  }

  // Verify
  console.log('\n🔍 Verifying inserted data...\n');
  const { data, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .or('managed_cash_price.not.is.null,regular_cash_price.not.is.null')
    .order('frequency', { ascending: true })
    .order('duration', { ascending: true })
    .order('payment_period', { ascending: true });

  if (error) {
    console.error('❌ Verification error:', error);
  } else {
    console.log(`✅ Found ${data.length} pricing records with managed/regular prices:\n`);
    data.forEach(item => {
      console.log(`${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
      if (item.managed_cash_price) {
        console.log(`  관리 현금가: ${item.managed_cash_price.toLocaleString()}원`);
      }
      if (item.regular_cash_price) {
        console.log(`  일반 현금가: ${item.regular_cash_price.toLocaleString()}원`);
      }
    });
  }

  console.log('\n✨ Migration complete!\n');
}

insertPricingData().catch(console.error);
