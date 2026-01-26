import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import CalendarContent from "./CalendarContent";

export const metadata: Metadata = {
  title: "일정 관리 - NVOIM Planner",
  description: "수업 일정과 중요한 일정을 관리합니다.",
};

export default function CalendarPage() {
  return (
    <DashboardLayout title="일정 관리">
      <CalendarContent />
    </DashboardLayout>
  );
}