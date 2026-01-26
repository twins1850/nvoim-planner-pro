import { Metadata } from 'next'
import ScheduledHomeworkContent from './ScheduledHomeworkContent'

export const metadata: Metadata = {
  title: '예약 숙제 관리 | NVOIM Planner',
  description: '예약된 숙제를 관리하고 스케줄을 확인하세요.',
}

export default function ScheduledHomeworkPage() {
  return <ScheduledHomeworkContent />
}