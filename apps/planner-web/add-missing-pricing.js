const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMissingPricing() {
  console.log('📝 Adding missing pricing data...\n');

  // 1. 주2회 3개월 25분 - 관리수강
  console.log('📊 Adding 주2회 3개월 25분 관리수강...');
  const managed_ju2_3month_25min = {
    planner_id: null,
    frequency: '주2회',
    duration: '25분',
    payment_period: '3개월',
    total_lessons: 24,
    base_price: 422000,
    managed_cash_price: 673900,
    managed_card_price: Math.round(673900 * 1.1), // 741,290
    per_lesson_price: Math.round(673900 / 24), // 28,079
    per_month_price: Math.round(673900 / 3), // 224,633
    is_active: true
  };

  let { error } = await supabase
    .from('pricing_templates')
    .upsert(managed_ju2_3month_25min, {
      onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
    });

  if (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  } else {
    console.log(`  ✅ 관리 현금: 673,900원, 카드: ${managed_ju2_3month_25min.managed_card_price.toLocaleString()}원`);
  }

  // 2. 주2회 3개월 25분 - 일반수강
  console.log('\n📊 Adding 주2회 3개월 25분 일반수강...');
  const regular_ju2_3month_25min = {
    planner_id: null,
    frequency: '주2회',
    duration: '25분',
    payment_period: '3개월',
    total_lessons: 24,
    base_price: 422000,
    regular_cash_price: 486000,
    regular_card_price: Math.round(486000 * 1.1), // 534,600
    per_lesson_price: Math.round(486000 / 24), // 20,250
    per_month_price: Math.round(486000 / 3), // 162,000
    is_active: true
  };

  ({ error } = await supabase
    .from('pricing_templates')
    .upsert(regular_ju2_3month_25min, {
      onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
    }));

  if (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  } else {
    console.log(`  ✅ 일반 현금: 486,000원, 카드: ${regular_ju2_3month_25min.regular_card_price.toLocaleString()}원`);
  }

  // 3. 주2회 3개월 50분 - 관리수강 (25분 × 2)
  console.log('\n📊 Adding 주2회 3개월 50분 관리수강 (25분 × 2)...');
  const managed_ju2_3month_50min = {
    planner_id: null,
    frequency: '주2회',
    duration: '50분',
    payment_period: '3개월',
    total_lessons: 24,
    base_price: 844000,
    managed_cash_price: 1157900,
    managed_card_price: Math.round(1157900 * 1.1), // 1,273,690
    per_lesson_price: Math.round(1157900 / 24), // 48,246
    per_month_price: Math.round(1157900 / 3), // 385,967
    is_active: true
  };

  ({ error } = await supabase
    .from('pricing_templates')
    .upsert(managed_ju2_3month_50min, {
      onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
    }));

  if (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  } else {
    console.log(`  ✅ 관리 현금: 1,157,900원, 카드: ${managed_ju2_3month_50min.managed_card_price.toLocaleString()}원`);
  }

  // 4. 주2회 3개월 50분 - 일반수강 (25분 × 2)
  console.log('\n📊 Adding 주2회 3개월 50분 일반수강 (25분 × 2)...');
  const regular_ju2_3month_50min = {
    planner_id: null,
    frequency: '주2회',
    duration: '50분',
    payment_period: '3개월',
    total_lessons: 24,
    base_price: 844000,
    regular_cash_price: 969000,
    regular_card_price: Math.round(969000 * 1.1), // 1,065,900
    per_lesson_price: Math.round(969000 / 24), // 40,375
    per_month_price: Math.round(969000 / 3), // 323,000
    is_active: true
  };

  ({ error } = await supabase
    .from('pricing_templates')
    .upsert(regular_ju2_3month_50min, {
      onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
    }));

  if (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  } else {
    console.log(`  ✅ 일반 현금: 969,000원, 카드: ${regular_ju2_3month_50min.regular_card_price.toLocaleString()}원`);
  }

  // 5. 프리미엄 과정 - 주6회 (주5+토1) 50분 1개월 24회 - 관리수강만
  console.log('\n📊 Adding 프리미엄 과정 주6회 50분 1개월 (관리수강만)...');
  const premium = {
    planner_id: null,
    frequency: '주6회',
    duration: '50분',
    payment_period: '1개월',
    total_lessons: 24,
    base_price: 932000,
    managed_cash_price: 1200000,
    managed_card_price: Math.round(1200000 * 1.1), // 1,320,000
    per_lesson_price: Math.round(1200000 / 24), // 50,000
    per_month_price: 1200000,
    is_active: true
  };

  ({ error } = await supabase
    .from('pricing_templates')
    .upsert(premium, {
      onConflict: 'planner_id,frequency,duration,payment_period,total_lessons'
    }));

  if (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  } else {
    console.log(`  ✅ 프리미엄 과정 관리 현금: 1,200,000원, 카드: ${premium.managed_card_price.toLocaleString()}원`);
    console.log(`     (주5회 + 토요 1회 = 주6회, 관리수강만)`);
  }

  // Verify
  console.log('\n🔍 Verifying added data...\n');
  const { data, error: verifyError } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .or('frequency.eq.주2회.and.payment_period.eq.3개월,frequency.eq.주6회.and.payment_period.eq.1개월')
    .order('frequency', { ascending: true })
    .order('duration', { ascending: true });

  if (verifyError) {
    console.error('❌ Verification error:', verifyError);
  } else {
    console.log(`✅ Found ${data.length} records:\n`);
    data.forEach(item => {
      const type = item.managed_cash_price && item.regular_cash_price ? '관리+일반' :
                   item.managed_cash_price ? '관리' : '일반';
      console.log(`${type} ${item.frequency} ${item.duration} ${item.payment_period} (${item.total_lessons}회)`);
      if (item.managed_cash_price) {
        console.log(`  관리 현금: ${item.managed_cash_price.toLocaleString()}원`);
      }
      if (item.regular_cash_price) {
        console.log(`  일반 현금: ${item.regular_cash_price.toLocaleString()}원`);
      }
      console.log('');
    });
  }

  console.log('✨ Missing pricing addition complete!\n');
}

addMissingPricing().catch(console.error);
