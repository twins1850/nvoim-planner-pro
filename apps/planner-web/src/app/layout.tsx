import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
// import { SpeedInsights } from "@vercel/speed-insights/next";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "엔보임 플래너 프로 - 선생님을 위한 스마트 학습 관리",
    template: "%s | 엔보임 플래너 프로"
  },
  description: "학생 관리부터 숙제 피드백까지, AI가 도와주는 올인원 교육 플랫폼. 선생님을 위한 스마트 학습 관리 솔루션.",
  keywords: ["플래너", "학생 관리", "AI 피드백", "숙제 관리", "교육 플랫폼", "학습 관리"],
  authors: [{ name: "엔보임" }],
  openGraph: {
    title: "엔보임 플래너 프로",
    description: "선생님을 위한 스마트 학습 관리 플랫폼",
    type: "website",
    locale: "ko_KR",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <Header />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
