const https = require('https');

const CRON_SECRET = 'txsrv0v6p3u26gq9stcoiex2uy4mfl0v';

console.log('🔔 Trial Notification Cron Job 테스트 중...\n');
console.log('📍 URL: https://nvoim-planner-pro.vercel.app/api/cron/trial-notifications');
console.log('🔐 Authorization: Bearer ' + CRON_SECRET.substring(0, 10) + '...\n');

const options = {
  hostname: 'nvoim-planner-pro.vercel.app',
  port: 443,
  path: '/api/cron/trial-notifications',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}\n`);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response:');
    console.log('─'.repeat(60));

    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));

      console.log('─'.repeat(60));
      console.log('');

      if (jsonData.success) {
        console.log('✅✅✅ Cron Job 성공!');
        console.log('');
        console.log('📊 통계:');
        console.log('   - 확인한 라이선스: ' + jsonData.stats.checked);
        console.log('   - 발송한 이메일: ' + jsonData.stats.sent);
        console.log('   - 건너뛴 항목: ' + jsonData.stats.skipped);
        console.log('   - 에러: ' + jsonData.stats.errors);
        console.log('');

        if (jsonData.stats.sent > 0) {
          console.log('📧 발송된 알림:');
          jsonData.details.forEach((detail, index) => {
            console.log(`   ${index + 1}. ${detail.email} - ${detail.type} (${detail.status})`);
          });
          console.log('');
        } else {
          console.log('💡 현재 알림을 보낼 trial 라이선스가 없습니다.');
          console.log('   (7일, 3일, 1일 전 또는 만료일에 해당하는 라이선스 없음)');
          console.log('');
        }

        console.log('🎉 Trial 알림 시스템이 정상적으로 작동합니다!');
      } else {
        console.log('❌ Cron Job 실패');
        console.log('   에러:', jsonData.error || '알 수 없는 에러');
      }

    } catch (e) {
      console.log(data);
      console.log('');
      console.log('⚠️  JSON 파싱 실패. HTML 응답인 경우 에러 페이지일 수 있습니다.');
    }

    console.log('');
  });
});

req.on('error', (e) => {
  console.error('❌ 요청 에러:', e.message);
});

req.end();
