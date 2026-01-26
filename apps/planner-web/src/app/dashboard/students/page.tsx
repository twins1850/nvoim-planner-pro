import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import StudentsContent from "./StudentsContent";

export const metadata: Metadata = {
  title: "학생 관리 - NVOIM Planner",
  description: "학생들을 관리하고 학습 진도를 추적합니다.",
};

export default function StudentsPage() {
  return (
    <DashboardLayout title="학생 관리">
      <StudentsContent />
    </DashboardLayout>
  );
}