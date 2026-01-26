"use client";

import { use } from 'react';
import StudentDetailContent from './StudentDetailContent';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return <StudentDetailContent studentId={resolvedParams.id} />;
}