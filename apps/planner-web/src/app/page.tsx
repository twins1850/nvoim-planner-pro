import Link from 'next/link';
import PricingSection from '@/components/landing/PricingSection';

/**
 * NVOIM Planner Pro Landing Page
 *
 * Main landing page for the educational planner application.
 * Includes hero section, features, pricing, and CTA.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                엔보임 플래너 프로
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-700 hover:text-purple-600 transition-colors">
                기능
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-purple-600 transition-colors">
                가격
              </a>
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-purple-600 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                무료 체험 시작
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            ✨ AI 기반 학생 관리 솔루션
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            선생님을 위한
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              스마트 학습 관리
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            학생 관리부터 숙제 피드백까지, AI가 도와주는 올인원 교육 플랫폼
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              🎉 7일 무료 체험 시작하기 →
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-white text-gray-700 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 hover:border-purple-300"
            >
              로그인
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-purple-600">100+</div>
              <div className="text-gray-600 mt-2">활성 선생님</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">2,000+</div>
              <div className="text-gray-600 mt-2">관리 학생</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-600">5,000+</div>
              <div className="text-gray-600 mt-2">AI 피드백</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              강력한 기능들
            </h2>
            <p className="text-xl text-gray-600">
              교육 현장에서 필요한 모든 기능을 하나로
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">학생 관리</h3>
              <p className="text-gray-600">
                학생 정보, 학습 진도, 성적 변화를 한눈에 관리하세요
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">숙제 관리</h3>
              <p className="text-gray-600">
                숙제 배정, 진행 상황 추적, 자동 알림까지 간편하게
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-8 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI 피드백</h3>
              <p className="text-gray-600">
                학생별 맞춤 학습 피드백을 AI가 자동으로 생성
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">실시간 소통</h3>
              <p className="text-gray-600">
                학생과 실시간 메시지로 빠르게 소통하세요
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">대시보드</h4>
                <p className="text-gray-600 text-sm">학습 현황을 한눈에 파악하는 직관적인 대시보드</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                📱
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">모바일 앱</h4>
                <p className="text-gray-600 text-sm">언제 어디서나 학생 관리가 가능한 모바일 앱</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">보안</h4>
                <p className="text-gray-600 text-sm">학생 정보를 안전하게 보호하는 강력한 보안</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              자주 묻는 질문
            </h2>
            <p className="text-xl text-gray-600">
              궁금한 점이 있으신가요?
            </p>
          </div>

          <div className="space-y-6">
            {/* FAQ 1 */}
            <details className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>계좌이체로 결제하나요?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">
                네, 계좌이체로 결제합니다. 온라인 결제 수수료가 없어 더 저렴하게 이용하실 수 있습니다.
                입금 확인 후 자동으로 라이선스가 발급되며, 통상 5분 이내에 처리됩니다.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>라이선스는 몇 개의 디바이스에서 사용할 수 있나요?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">
                하나의 라이선스로 최대 2개의 디바이스에서 사용할 수 있습니다.
                PC와 모바일, 또는 집과 학원 PC 등 필요에 따라 유연하게 활용하세요.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>학생 수를 나중에 늘릴 수 있나요?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">
                현재는 라이선스 구매 시 정한 학생 수로만 사용 가능합니다.
                학생 수를 늘리고 싶으시면 새로운 라이선스를 구매하시거나 고객 지원으로 문의해주세요.
              </p>
            </details>

            {/* FAQ 4 */}
            <details className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>환불이 가능한가요?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">
                라이선스 활성화 전에는 전액 환불이 가능합니다.
                활성화 후에는 사용 기간에 따라 부분 환불이 가능하니 자세한 사항은 고객 지원으로 문의해주세요.
              </p>
            </details>

            {/* FAQ 5 */}
            <details className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>기술 지원은 어떻게 받나요?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600">
                이메일(support@nvoim.com)과 카카오톡(@nvoim_planner)으로 기술 지원을 받으실 수 있습니다.
                평일 09:00-18:00에 운영하며, 빠른 시일 내에 답변드리겠습니다.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            지금 바로 무료로 체험하세요
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            7일 무료 체험으로 더 나은 학습 관리 경험을 시작하세요
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-white text-purple-600 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            무료 체험 시작하기 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">엔보임 플래너 프로</h3>
              <p className="text-sm text-gray-400">
                선생님을 위한 스마트 학습 관리 플랫폼
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">기능</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">가격</a></li>
                <li><Link href="/license-activate" className="hover:text-white transition-colors">라이선스 활성화</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@nvoim.com" className="hover:text-white transition-colors">이메일 문의</a></li>
                <li><a href="http://pf.kakao.com/_nvoim_planner" target="_blank" className="hover:text-white transition-colors">카카오톡</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">이용약관</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2026 엔보임 플래너 프로. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
