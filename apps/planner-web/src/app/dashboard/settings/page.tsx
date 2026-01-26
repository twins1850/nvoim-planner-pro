import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";

export const metadata: Metadata = {
  title: "설정 - NVOIM Planner",
  description: "계정 설정과 시스템 설정을 관리합니다.",
};

export default function SettingsPage() {
  return (
    <DashboardLayout title="설정">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">계정 설정</h2>
            <p className="text-gray-600 mb-6">
              계정 정보와 프로필을 관리할 수 있습니다.
            </p>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">프로필 정보</h3>
                <p className="text-sm text-gray-600">이름, 이메일, 프로필 사진 등을 수정할 수 있습니다.</p>
                <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                  편집
                </button>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">알림 설정</h3>
                <p className="text-sm text-gray-600">메시지, 숙제 제출 등에 대한 알림을 설정할 수 있습니다.</p>
                <button className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors">
                  관리
                </button>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">보안</h3>
                <p className="text-sm text-gray-600">비밀번호 변경 및 2단계 인증을 설정할 수 있습니다.</p>
                <button className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors">
                  보안 설정
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}