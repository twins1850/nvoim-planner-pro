const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function testHomeworkNotification() {
  console.log('=== 숙제 알림 시스템 테스트 ===\n');

  // 테스트 데이터
  const plannerId = 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18'; // 플래너 ID
  const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3'; // 학생 ID

  console.log('1. 현재 알림 개수 확인...');
  const { count: beforeCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('   알림 개수:', beforeCount);

  console.log('\n2. 테스트 숙제 추가 (숙제 기능 개발 후 자동으로 작동)...');
  console.log('   플래너:', plannerId);
  console.log('   학생:', studentId);

  // 숙제 테이블 존재 여부 확인
  console.log('\n3. homework_assignments 테이블 확인...');
  const { data: tables, error: tableError } = await supabase
    .from('homework_assignments')
    .select('id')
    .limit(1);

  if (tableError) {
    console.log('   ⚠️  homework_assignments 테이블이 아직 생성되지 않았습니다.');
    console.log('   에러:', tableError.message);
    console.log('\n   📝 숙제 기능이 개발되면:');
    console.log('   1. homework_assignments 테이블이 생성됩니다');
    console.log('   2. 플래너가 숙제를 추가하면 자동으로 알림이 생성됩니다');
    console.log('   3. 학생 앱 홈 화면에 "새 숙제" 알림이 표시됩니다');
    console.log('\n   🎯 트리거는 이미 준비되어 있습니다!');
    console.log('   마이그레이션 파일: 20260207_create_homework_notification_trigger.sql');
    return;
  }

  // 테이블이 존재하면 실제 테스트 진행
  console.log('   ✅ homework_assignments 테이블 존재');

  // 숙제 추가
  const { data: homework, error: hwError } = await supabase
    .from('homework_assignments')
    .insert({
      planner_id: plannerId,
      student_id: studentId,
      title: '테스트 숙제: 1-10까지 복습하기',
      description: '오늘 배운 내용을 복습해주세요.',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후
    })
    .select()
    .single();

  if (hwError) {
    console.log('   ❌ 숙제 추가 실패:', hwError.message);
    return;
  }

  console.log('   ✅ 숙제 추가 완료:', homework.id);

  // 트리거 작동 대기
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 알림 확인
  const { count: afterCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('\n4. 새 알림 개수:', afterCount);

  if (afterCount > beforeCount) {
    console.log('   🎉 성공! 숙제 알림이 생성되었습니다!');

    // 최신 알림 조회
    const { data: latest } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('\n5. 최신 알림 상세:');
    console.log('   ID:', latest.id);
    console.log('   타입:', latest.type);
    console.log('   제목:', latest.title);
    console.log('   내용:', latest.message);
    console.log('   수신자:', latest.user_id);
    console.log('   데이터:', JSON.stringify(latest.data, null, 2));
    console.log('   생성 시각:', latest.created_at);

    console.log('\n🎯 학생 앱 홈 화면에서 확인하세요!');

    // 테스트 데이터 정리
    console.log('\n6. 테스트 데이터 정리 중...');
    await supabase.from('homework_assignments').delete().eq('id', homework.id);
    await supabase.from('notifications').delete().eq('id', latest.id);
    console.log('   ✅ 정리 완료');

  } else {
    console.log('   ❌ 알림이 생성되지 않았습니다');
    console.log('   트리거 확인이 필요합니다');
  }
}

testHomeworkNotification().catch(console.error);
