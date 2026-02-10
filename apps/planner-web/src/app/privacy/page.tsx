export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">

        {/* Header */}
        <div className="border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-600">최종 수정일: 2026년 1월 30일</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-700">

          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제1조 (개인정보의 처리 목적)</h2>
            <p className="leading-relaxed mb-3">
              엔보임 플래너 프로(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등
              필요한 조치를 이행할 예정입니다.
            </p>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. <strong>서비스 제공</strong>: 라이선스 발급, 학급 관리 소프트웨어 이용, 고객 지원 등
              </p>
              <p className="leading-relaxed">
                2. <strong>회원 관리</strong>: 회원 식별, 불량 회원의 부정 이용 방지, 비인가 사용 방지 등
              </p>
              <p className="leading-relaxed">
                3. <strong>결제 및 정산</strong>: 라이선스 구매 및 결제, 환불 처리 등
              </p>
              <p className="leading-relaxed">
                4. <strong>마케팅 및 광고</strong>: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 정보 제공 등
              </p>
            </div>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제2조 (처리하는 개인정보의 항목)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">1. 필수 항목</h3>
                <p className="leading-relaxed">
                  • 회원가입 시: 이름, 이메일 주소, 비밀번호<br />
                  • 라이선스 구매 시: 이름, 이메일 주소, 전화번호<br />
                  • 서비스 이용 시: 디바이스 정보 (하드웨어 식별자)
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">2. 자동 수집 항목</h3>
                <p className="leading-relaxed">
                  • 접속 IP 정보, 쿠키, 서비스 이용 기록, 접속 로그
                </p>
              </div>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제3조 (개인정보의 처리 및 보유 기간)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에
                동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <p className="leading-relaxed">
                2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
              </p>
              <div className="ml-6 space-y-2">
                <p className="leading-relaxed">
                  • <strong>회원 정보</strong>: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우 해당 수사·조사 종료 시까지)
                </p>
                <p className="leading-relaxed">
                  • <strong>주문 및 결제 정보</strong>: 전자상거래 등에서의 소비자 보호에 관한 법률에 따라 5년간 보관
                </p>
                <p className="leading-relaxed">
                  • <strong>접속 로그</strong>: 통신비밀보호법에 따라 3개월간 보관
                </p>
              </div>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제4조 (개인정보의 제3자 제공)</h2>
            <p className="leading-relaxed">
              회사는 원칙적으로 이용자의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며,
              이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
              다만, 다음의 경우에는 예외로 합니다:
            </p>
            <div className="mt-3 space-y-2 ml-6">
              <p className="leading-relaxed">
                1. 이용자가 사전에 동의한 경우
              </p>
              <p className="leading-relaxed">
                2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라
                수사기관의 요구가 있는 경우
              </p>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제5조 (개인정보의 파기)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
                지체없이 해당 개인정보를 파기합니다.
              </p>
              <p className="leading-relaxed">
                2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
              </p>
              <div className="ml-6 space-y-2">
                <p className="leading-relaxed">
                  • <strong>파기절차</strong>: 파기 사유가 발생한 개인정보를 선정하고,
                  개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                </p>
                <p className="leading-relaxed">
                  • <strong>파기방법</strong>: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 파기하며,
                  종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
              </p>
              <div className="ml-6 space-y-2">
                <p className="leading-relaxed">
                  • 개인정보 열람 요구
                </p>
                <p className="leading-relaxed">
                  • 오류 등이 있을 경우 정정 요구
                </p>
                <p className="leading-relaxed">
                  • 삭제 요구
                </p>
                <p className="leading-relaxed">
                  • 처리정지 요구
                </p>
              </div>
              <p className="leading-relaxed mt-3">
                2. 권리 행사는 회사에 대해 서면, 전자우편 등을 통하여 하실 수 있으며,
                회사는 이에 대해 지체없이 조치하겠습니다.
              </p>
              <p className="leading-relaxed">
                3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는
                회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
              </p>
            </div>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제7조 (개인정보의 안전성 확보 조치)</h2>
            <p className="leading-relaxed mb-3">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
            </p>
            <div className="space-y-2 ml-6">
              <p className="leading-relaxed">
                1. 개인정보 취급 직원의 최소화 및 교육
              </p>
              <p className="leading-relaxed">
                2. 개인정보에 대한 접근 제한
              </p>
              <p className="leading-relaxed">
                3. 개인정보의 암호화
              </p>
              <p className="leading-relaxed">
                4. 해킹 등에 대비한 기술적 대책
              </p>
              <p className="leading-relaxed">
                5. 접속기록의 보관 및 위변조 방지
              </p>
            </div>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제8조 (개인정보 자동 수집 장치의 설치·운영 및 거부)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고
                수시로 불러오는 '쿠키(cookie)'를 사용합니다.
              </p>
              <p className="leading-relaxed">
                2. 쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는
                소량의 정보이며 이용자의 컴퓨터 하드디스크에 저장됩니다.
              </p>
              <p className="leading-relaxed">
                3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다.
                웹브라우저 옵션 설정을 통해 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나,
                모든 쿠키의 저장을 거부할 수 있습니다.
              </p>
            </div>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제9조 (개인정보 보호책임자)</h2>
            <p className="leading-relaxed mb-4">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여
              아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-700 mb-3">
                <strong>개인정보 보호책임자</strong>
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>이메일:</strong> support@nvoim.com
              </p>
              <p className="text-sm text-gray-700">
                <strong>카카오톡:</strong> @nvoim_planner
              </p>
            </div>
            <p className="leading-relaxed mt-4">
              정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의,
              불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
              회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해드릴 것입니다.
            </p>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제10조 (개인정보 처리방침 변경)</h2>
            <p className="leading-relaxed">
              본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가,
              삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">
            © 2026 엔보임 플래너 프로. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
