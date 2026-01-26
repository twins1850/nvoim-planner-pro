import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import AIFeedbackContent from "./AIFeedbackContent";

export const metadata: Metadata = {
  title: "AI 피드백 관리 - NVOIM Planner",
  description: "학생들의 AI 피드백을 관리하고 분석합니다.",
};

export default function AIFeedbackPage() {
  return (
    <DashboardLayout title="AI 피드백 관리">
      <AIFeedbackContent />
    </DashboardLayout>
  );
}