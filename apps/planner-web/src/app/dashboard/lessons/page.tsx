import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import LessonsContent from "./LessonsContent";

export const metadata: Metadata = {
  title: "수업 관리 - NVOIM Planner",
  description: "수업 일정과 내용을 관리합니다.",
};

export default function LessonsPage() {
  return (
    <DashboardLayout title="수업 관리">
      <LessonsContent />
    </DashboardLayout>
  );
}