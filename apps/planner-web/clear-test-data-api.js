(async () => {
  console.log('🧹 테스트 데이터 삭제 API 호출 중...\n');

  try {
    const response = await fetch('http://localhost:3000/api/admin/clear-test-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('📊 API 응답:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.success) {
      console.log('✅✅✅ 테스트 데이터 삭제 성공!\n');
      console.log('📋 삭제 결과:');
      console.log(`   - Fingerprints 삭제: ${data.deleted.fingerprints}개`);
      console.log(`   - Trial 라이선스 초기화: ${data.deleted.licenses_reset}개`);
      console.log(`   - 남은 Fingerprints: ${data.remaining.fingerprints}개\n`);

      if (data.test_users && data.test_users.length > 0) {
        console.log('👥 테스트 사용자 목록:');
        data.test_users.forEach(email => console.log(`   - ${email}`));
        console.log('');
      }

      console.log('🎉 이제 회원가입 테스트를 다시 진행할 수 있습니다!\n');
    } else {
      console.log('❌ 테스트 데이터 삭제 실패:', data.error);
      console.log('');
    }

  } catch (error) {
    console.error('❌ API 호출 실패:', error.message);
    console.log('\n💡 Dev 서버가 실행 중인지 확인하세요: http://localhost:3000\n');
  }
})();
