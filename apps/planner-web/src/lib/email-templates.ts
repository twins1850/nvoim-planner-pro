/**
 * Trial 만료 알림 이메일 템플릿
 */

export interface TrialEmailData {
  userName: string;
  daysRemaining: number;
  expiresAt: string; // ISO string
  dashboardUrl: string;
  upgradeUrl: string;
}

/**
 * 7일 남음 알림
 */
export function getTrialReminder7Days(data: TrialEmailData): { subject: string; html: string; text: string } {
  const subject = `[NVOIM Planner] 무료 체험이 7일 남았습니다 🎯`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .highlight { background: #f3f4f6; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎯 체험 기간 안내</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>

      <p>NVOIM Planner 무료 체험을 이용해 주셔서 감사합니다.</p>

      <div class="highlight">
        <h3 style="margin-top: 0;">⏰ 체험 기간이 <strong>7일</strong> 남았습니다</h3>
        <p style="margin-bottom: 0;">만료일: ${new Date(data.expiresAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })}</p>
      </div>

      <h3>💡 계속 사용하시려면?</h3>
      <p>체험 기간이 끝나기 전에 유료 플랜으로 전환하시면 모든 기능을 계속 사용하실 수 있습니다.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.upgradeUrl}" class="button" style="background: #10b981; color: white;">
          ✨ 지금 업그레이드하기
        </a>
        <a href="${data.dashboardUrl}" class="button" style="background: #6b7280; color: white;">
          📊 대시보드로 이동
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">더 많은 학생과 수업을 관리하고 싶으시다면, 지금이 가장 좋은 시기입니다!</p>
    </div>
    <div class="footer">
      <p>문의사항이 있으시면 언제든지 연락 주세요.</p>
      <p style="font-size: 12px; color: #999;">이 이메일은 NVOIM Planner 체험 사용자에게 자동으로 발송됩니다.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
안녕하세요, ${data.userName}님!

NVOIM Planner 무료 체험을 이용해 주셔서 감사합니다.

⏰ 체험 기간이 7일 남았습니다
만료일: ${new Date(data.expiresAt).toLocaleDateString('ko-KR')}

계속 사용하시려면 체험 기간이 끝나기 전에 유료 플랜으로 전환해 주세요.

업그레이드: ${data.upgradeUrl}
대시보드: ${data.dashboardUrl}

문의사항이 있으시면 언제든지 연락 주세요.
`;

  return { subject, html, text };
}

/**
 * 3일 남음 알림
 */
export function getTrialReminder3Days(data: TrialEmailData): { subject: string; html: string; text: string } {
  const subject = `[NVOIM Planner] ⚠️ 무료 체험이 3일 남았습니다`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .highlight { background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ 체험 만료 임박</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>

      <div class="highlight">
        <h3 style="margin-top: 0; color: #dc2626;">⏰ 체험 기간이 <strong>3일</strong>만 남았습니다!</h3>
        <p>만료일: ${new Date(data.expiresAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })}</p>
        <p style="margin-bottom: 0; color: #b91c1c;">만료 후에는 모든 데이터에 접근할 수 없습니다.</p>
      </div>

      <h3>🚨 지금 바로 업그레이드하세요</h3>
      <p>학생 관리, 숙제 추적, 수업 일정을 계속 사용하시려면 유료 플랜으로 전환이 필요합니다.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.upgradeUrl}" class="button" style="color: white;">
          ⚡ 지금 즉시 업그레이드
        </a>
      </div>

      <p style="background: #fee2e2; padding: 15px; border-radius: 6px; color: #991b1b;">
        <strong>중요:</strong> 만료 후에는 입력하신 모든 학생 정보와 수업 기록에 접근할 수 없습니다. 데이터 손실을 방지하려면 지금 업그레이드하세요.
      </p>
    </div>
    <div class="footer">
      <p>문의: support@nvoim-planner.com</p>
      <p style="font-size: 12px; color: #999;">이 이메일은 NVOIM Planner 체험 사용자에게 자동으로 발송됩니다.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
안녕하세요, ${data.userName}님!

⚠️ 체험 기간이 3일만 남았습니다!
만료일: ${new Date(data.expiresAt).toLocaleDateString('ko-KR')}

만료 후에는 모든 데이터에 접근할 수 없습니다.

지금 바로 업그레이드: ${data.upgradeUrl}

중요: 만료 후에는 입력하신 모든 학생 정보와 수업 기록에 접근할 수 없습니다.

문의: support@nvoim-planner.com
`;

  return { subject, html, text };
}

/**
 * 1일 남음 알림 (최종 경고)
 */
export function getTrialReminder1Day(data: TrialEmailData): { subject: string; html: string; text: string } {
  const subject = `[NVOIM Planner] 🚨 내일 체험이 만료됩니다!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .highlight { background: #fecaca; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; text-align: center; }
    .button { display: inline-block; padding: 16px 32px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 최종 알림</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>

      <div class="highlight">
        <h2 style="margin-top: 0; color: #dc2626; font-size: 24px;">⏰ 내일 체험이 만료됩니다!</h2>
        <p style="font-size: 18px; margin-bottom: 0;">
          만료 시간: ${new Date(data.expiresAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      <h3>⚡ 마지막 기회입니다</h3>
      <p>이것이 체험 만료 전 마지막 알림입니다. 지금 업그레이드하지 않으면:</p>

      <ul style="color: #dc2626; font-weight: 500;">
        <li>모든 학생 정보에 접근할 수 없습니다</li>
        <li>작성한 숙제 기록이 사라집니다</li>
        <li>수업 일정을 볼 수 없습니다</li>
        <li>메시지 기능을 사용할 수 없습니다</li>
      </ul>

      <div style="text-align: center; margin: 30px 0; background: #fef2f2; padding: 30px; border-radius: 8px;">
        <p style="font-size: 18px; margin-bottom: 20px; color: #991b1b;">
          <strong>지금 바로 업그레이드하고<br>소중한 데이터를 보호하세요!</strong>
        </p>
        <a href="${data.upgradeUrl}" class="button" style="color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
          ⚡ 즉시 업그레이드하기
        </a>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        업그레이드 문의: support@nvoim-planner.com
      </p>
    </div>
    <div class="footer">
      <p style="font-size: 12px; color: #999;">NVOIM Planner | 최종 체험 만료 알림</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
안녕하세요, ${data.userName}님!

🚨 내일 체험이 만료됩니다!
만료 시간: ${new Date(data.expiresAt).toLocaleString('ko-KR')}

이것이 체험 만료 전 마지막 알림입니다.

지금 업그레이드하지 않으면:
- 모든 학생 정보에 접근할 수 없습니다
- 작성한 숙제 기록이 사라집니다
- 수업 일정을 볼 수 없습니다
- 메시지 기능을 사용할 수 없습니다

지금 바로 업그레이드: ${data.upgradeUrl}

문의: support@nvoim-planner.com
`;

  return { subject, html, text };
}

/**
 * 만료일 알림
 */
export function getTrialExpired(data: TrialEmailData): { subject: string; html: string; text: string } {
  const subject = `[NVOIM Planner] 체험 기간이 종료되었습니다`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .highlight { background: #f3f4f6; padding: 20px; border-left: 4px solid #6b7280; margin: 20px 0; text-align: center; }
    .button { display: inline-block; padding: 16px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">체험 기간 종료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>

      <p>NVOIM Planner 7일 무료 체험을 이용해 주셔서 감사합니다.</p>

      <div class="highlight">
        <p style="font-size: 18px; margin: 10px 0;">체험 기간이 종료되었습니다</p>
        <p style="color: #6b7280; margin: 0;">종료 시간: ${new Date(data.expiresAt).toLocaleString('ko-KR')}</p>
      </div>

      <h3>💚 계속 사용하시겠습니까?</h3>
      <p>지금 업그레이드하시면 모든 데이터와 기능을 다시 사용하실 수 있습니다.</p>

      <div style="text-align: center; margin: 30px 0; background: #ecfdf5; padding: 30px; border-radius: 8px;">
        <p style="font-size: 18px; margin-bottom: 20px; color: #047857;">
          <strong>지금 업그레이드하고<br>학습 관리를 계속하세요!</strong>
        </p>
        <a href="${data.upgradeUrl}" class="button" style="color: white;">
          ✨ 지금 업그레이드하기
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        궁금한 점이 있으시면 언제든지 문의해 주세요.<br>
        더 나은 서비스로 찾아뵙겠습니다.
      </p>
    </div>
    <div class="footer">
      <p>감사합니다!</p>
      <p style="font-size: 12px; color: #999;">NVOIM Planner Team</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
안녕하세요, ${data.userName}님!

NVOIM Planner 7일 무료 체험을 이용해 주셔서 감사합니다.

체험 기간이 종료되었습니다.
종료 시간: ${new Date(data.expiresAt).toLocaleString('ko-KR')}

계속 사용하시겠습니까?
지금 업그레이드하시면 모든 데이터와 기능을 다시 사용하실 수 있습니다.

업그레이드: ${data.upgradeUrl}

감사합니다!
NVOIM Planner Team
`;

  return { subject, html, text };
}
