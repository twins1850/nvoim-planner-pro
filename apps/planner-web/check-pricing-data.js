const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPricingData() {
  console.log('📊 현재 pricing_templates 데이터 확인...\n');

  const { data, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .order('duration', { ascending: true })
    .order('frequency', { ascending: true })
    .order('payment_period', { ascending: true });

  if (error) {
    console.error('❌ 에러:', error);
    return;
  }

  console.log(`✅ 총 ${data.length}개 가격 데이터 발견\n`);

  // 25분 수업만 필터링
  const data25min = data.filter(d => d.duration === '25분');

  console.log('=== 25분 수업 가격 ===\n');
  data25min.forEach(item => {
    console.log(`${item.frequency} ${item.payment_period} (${item.total_lessons}회):`);
    console.log(`  원단가: ${item.base_price}원`);
    if (item.managed_cash_price) {
      console.log(`  관리 현금가: ${item.managed_cash_price}원`);
      console.log(`  관리 카드가: ${item.managed_card_price}원`);
    }
    if (item.regular_cash_price) {
      console.log(`  일반 현금가: ${item.regular_cash_price}원`);
      console.log(`  일반 카드가: ${item.regular_card_price}원`);
    }
    console.log('');
  });
}

checkPricingData().catch(console.error);
