"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isToday, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";

interface CalendarEvent {
  id: string;
  type: 'lesson' | 'subscription_expiring';
  date: string;
  start_time?: string;
  student_name: string;
  student_id: string;
  subscription_name?: string;
  status?: string;
  days_until_expiry?: number;
}

export default function DashboardCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase.rpc('get_dashboard_calendar_events', {
      p_planner_id: user.id,
      p_start_date: format(start, 'yyyy-MM-dd'),
      p_end_date: format(end, 'yyyy-MM-dd')
    });

    if (!error && data?.success) {
      setEvents(data.events);
    }
    setLoading(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}

        {/* Date Cells */}
        {days.map((day, i) => {
          const dayEvents = getEventsForDate(day);
          const lessonsCount = dayEvents.filter(e => e.type === 'lesson').length;
          const hasExpiring = dayEvents.some(e => e.type === 'subscription_expiring');

          return (
            <div
              key={i}
              className={`min-h-[80px] p-2 border rounded-lg ${
                isToday(day)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                i % 7 === 0 ? 'text-red-600' : i % 7 === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {lessonsCount > 0 && (
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{lessonsCount}개 수업</span>
                  </div>
                )}
                {hasExpiring && (
                  <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>수강권 종료</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span>수업 일정</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span>수강권 종료 예정</span>
        </div>
      </div>
    </div>
  );
}
