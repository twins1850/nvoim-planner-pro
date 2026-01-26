import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import MessagesContent from "./MessagesContent";

export const metadata: Metadata = {
  title: "메시지 - NVOIM Planner",
  description: "학생들과의 실시간 메시지를 관리합니다.",
};

export default function MessagesPage() {
  return (
    <DashboardLayout title="메시지">
      <MessagesContent />
    </DashboardLayout>
  );
}