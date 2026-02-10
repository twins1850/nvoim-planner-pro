export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">

        {/* Header */}
        <div className="border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
          <p className="text-sm text-gray-600">최종 수정일: 2026년 1월 30일</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-700">

          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제1조 (목적)</h2>
            <p className="leading-relaxed">
              본 약관은 엔보임 플래너 프로(이하 "서비스")가 제공하는 학급 관리 소프트웨어의 이용과 관련하여
              회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제2조 (정의)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. "서비스"란 엔보임 플래너 프로가 제공하는 학급 관리 및 학생 정보 관리 소프트웨어를 의미합니다.
              </p>
              <p className="leading-relaxed">
                2. "이용자"란 본 약관에 따라 서비스를 이용하는 교사 및 교육 관계자를 의미합니다.
              </p>
              <p className="leading-relaxed">
                3. "라이선스"란 서비스 이용 권한을 부여하는 고유 키를 의미합니다.
              </p>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제3조 (약관의 효력 및 변경)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.
              </p>
              <p className="leading-relaxed">
                2. 회사는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.
              </p>
              <p className="leading-relaxed">
                3. 약관이 변경되는 경우 변경 사항을 서비스 공지사항을 통해 공지합니다.
              </p>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제4조 (서비스 이용)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 서비스 이용은 유료 라이선스 구매를 통해 가능합니다.
              </p>
              <p className="leading-relaxed">
                2. 라이선스는 구매 시 명시된 학생 수와 사용 기간 내에서만 유효합니다.
              </p>
              <p className="leading-relaxed">
                3. 라이선스는 최초 활성화한 디바이스에 고정되며, 다른 디바이스로 이전할 수 없습니다.
              </p>
              <p className="leading-relaxed">
                4. 라이선스 공유 및 무단 배포는 엄격히 금지됩니다.
              </p>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제5조 (체험 라이선스)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 회사는 이용자에게 7일간 무료 체험 라이선스를 제공할 수 있습니다.
              </p>
              <p className="leading-relaxed">
                2. 체험 라이선스는 최대 5명의 학생 정보 관리로 제한됩니다.
              </p>
              <p className="leading-relaxed">
                3. 체험 라이선스는 1회에 한하여 제공되며, 중복 사용은 불가합니다.
              </p>
              <p className="leading-relaxed">
                4. 체험 기간 종료 후 서비스를 계속 이용하시려면 유료 라이선스를 구매해야 합니다.
              </p>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제6조 (환불 정책)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 라이선스 활성화 전에는 전액 환불이 가능합니다.
              </p>
              <p className="leading-relaxed">
                2. 라이선스 활성화 후에는 원칙적으로 환불이 불가합니다.
              </p>
              <p className="leading-relaxed">
                3. 다만, 서비스 하자로 인한 경우 합리적인 범위 내에서 환불이 가능합니다.
              </p>
            </div>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제7조 (개인정보 보호)</h2>
            <p className="leading-relaxed">
              회사는 이용자의 개인정보를 보호하기 위하여 관련 법령을 준수하며,
              자세한 사항은 별도의 개인정보처리방침에 따릅니다.
            </p>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제8조 (면책)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우
                서비스 제공에 대한 책임이 면제됩니다.
              </p>
              <p className="leading-relaxed">
                2. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
              </p>
              <p className="leading-relaxed">
                3. 회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못한 것에 대하여 책임을 지지 않습니다.
              </p>
            </div>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제9조 (분쟁 해결)</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                1. 본 약관과 관련된 분쟁은 대한민국 법률을 준거법으로 합니다.
              </p>
              <p className="leading-relaxed">
                2. 서비스 이용으로 발생한 분쟁에 대한 소송은 회사의 본사 소재지를 관할하는 법원을
                전속 관할 법원으로 합니다.
              </p>
            </div>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">제10조 (문의)</h2>
            <p className="leading-relaxed mb-4">
              서비스 이용과 관련하여 문의사항이 있으시면 아래 연락처로 문의해주시기 바랍니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-700 mb-2">
                <strong>이메일:</strong> support@nvoim.com
              </p>
              <p className="text-sm text-gray-700">
                <strong>카카오톡:</strong> @nvoim_planner
              </p>
            </div>
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
