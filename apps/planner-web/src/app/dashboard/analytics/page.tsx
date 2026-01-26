import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import AnalyticsContent from "./AnalyticsContent";

export const metadata: Metadata = {
  title: "진도 분석 - NVOIM Planner",
  description: "학생들의 학습 진도와 성과를 분석합니다.",
};

export default function AnalyticsPage() {
  return (
    <DashboardLayout title="진도 분석">
      <AnalyticsContent />
    </DashboardLayout>
  );
}