const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function showAllPricing() {
  console.log('\n' + '='.repeat(100));
  console.log('📊 전체 가격 데이터 확인');
  console.log('='.repeat(100) + '\n');

  const { data, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .is('planner_id', null)
    .order('duration', { ascending: true })
    .order('frequency', { ascending: true })
    .order('payment_period', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Group by duration, frequency, payment_period
  const grouped = {};
  data.forEach(item => {
    const key = `${item.duration}_${item.frequency}_${item.payment_period}`;
    if (!grouped[key]) {
      grouped[key] = {
        duration: item.duration,
        frequency: item.frequency,
        payment_period: item.payment_period,
        total_lessons: item.total_lessons,
        base_price: item.base_price,
        managed: null,
        regular: null
      };
    }

    if (item.managed_cash_price) {
      grouped[key].managed = {
        cash: item.managed_cash_price,
        card: item.managed_card_price,
        per_lesson: item.per_lesson_price,
        per_month: item.per_month_price
      };
    }

    if (item.regular_cash_price) {
      grouped[key].regular = {
        cash: item.regular_cash_price,
        card: item.regular_card_price,
        per_lesson: item.per_lesson_price,
        per_month: item.per_month_price
      };
    }
  });

  // Sort and display
  const periods = ['1개월', '3개월', '6개월', '12개월'];
  const durations = ['25분', '50분'];

  periods.forEach(period => {
    console.log('\n' + '━'.repeat(100));
    console.log(`📅 ${period} 수강권`);
    console.log('━'.repeat(100));

    durations.forEach(duration => {
      const items = Object.values(grouped).filter(x =>
        x.payment_period === period && x.duration === duration
      ).sort((a, b) => {
        const freqOrder = { '주2회': 1, '주3회': 2, '주5회': 3 };
        return freqOrder[a.frequency] - freqOrder[b.frequency];
      });

      if (items.length > 0) {
        console.log(`\n🎯 ${duration} 수업`);
        console.log('-'.repeat(100));
      }

      items.forEach(item => {
        console.log(`\n   ${item.frequency} (${item.total_lessons}회)`);
        console.log(`   ┌─ 회원가(원단가): ${item.base_price.toLocaleString()}원`);

        if (item.regular) {
          console.log(`   ├─ 일반수강 현금가: ${item.regular.cash.toLocaleString()}원`);
          console.log(`   │  └─ 카드가: ${item.regular.card.toLocaleString()}원 (현금가 + 10%)`);
          if (item.regular.per_lesson) {
            console.log(`   │  └─ 회당단가: ${item.regular.per_lesson.toLocaleString()}원, 월단가: ${item.regular.per_month.toLocaleString()}원`);
          }
        } else {
          console.log(`   ├─ 일반수강: ❌ 없음`);
        }

        if (item.managed) {
          console.log(`   └─ 관리수강 현금가: ${item.managed.cash.toLocaleString()}원`);
          console.log(`      └─ 카드가: ${item.managed.card.toLocaleString()}원 (현금가 + 10%)`);
          if (item.managed.per_lesson) {
            console.log(`      └─ 회당단가: ${item.managed.per_lesson.toLocaleString()}원, 월단가: ${item.managed.per_month.toLocaleString()}원`);
          }
        } else {
          console.log(`   └─ 관리수강: ❌ 없음`);
        }
      });
    });
  });

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('📈 요약');
  console.log('='.repeat(100));

  const managedCount = data.filter(x => x.managed_cash_price).length;
  const regularCount = data.filter(x => x.regular_cash_price).length;

  console.log(`\n✅ 총 ${data.length}개 가격 레코드`);
  console.log(`   - 관리수강: ${managedCount}개`);
  console.log(`   - 일반수강: ${regularCount}개`);

  console.log('\n💡 가격 관계:');
  console.log('   - 회원가(원단가): 앤보임 회사 → 플래너 도매가');
  console.log('   - 일반수강: 회원가 + 마진 (1개월은 관리수강 - 2만원)');
  console.log('   - 관리수강: 회원가 + 마진 + 관리비');
  console.log('   - 카드가: 현금가 × 1.1 (10% 추가)\n');
}

showAllPricing().catch(console.error);
