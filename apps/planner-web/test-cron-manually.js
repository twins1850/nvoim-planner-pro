const https = require('https');

(async () => {
  console.log('🔔 Trial 알림 Cron Job 수동 실행...\n');

  const options = {
    hostname: 'www.nplannerpro.com',
    path: '/api/cron/trial-notifications',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer txsrv0v6p3u26gq9stcoiex2uy4mfl0v', // CRON_SECRET
    },
  };

  console.log('Step 1: API 호출 중...');
  console.log(`URL: https://${options.hostname}${options.path}`);
  console.log('');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('');

      try {
        const result = JSON.parse(data);
        console.log('📊 결과:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        if (result.sent > 0) {
          console.log(`✅ ${result.sent}개 이메일 발송 성공!`);
        } else {
          console.log('ℹ️  발송할 알림이 없습니다.');
        }

        if (result.errors > 0) {
          console.log(`⚠️  ${result.errors}개 에러 발생`);
        }
      } catch (e) {
        console.log('응답 데이터:', data);
      }

      console.log('\n✅ 완료!\n');
    });
  });

  req.on('error', (error) => {
    console.error('❌ 에러:', error.message);
  });

  req.end();
})();
