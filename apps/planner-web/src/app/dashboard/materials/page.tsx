import { Metadata } from "next";
import DashboardLayout from "../../../components/DashboardLayout";
import MaterialsContent from "./MaterialsContent";

export const metadata: Metadata = {
  title: "학습 자료 - NVOIM Planner",
  description: "학습 자료를 업로드하고 관리합니다.",
};

export default function MaterialsPage() {
  return (
    <DashboardLayout title="학습 자료">
      <MaterialsContent />
    </DashboardLayout>
  );
}