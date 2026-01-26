"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Coffee,
  Phone,
  Video,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'lesson' | 'meeting' | 'break' | 'call' | 'other';
  start_time: string;
  end_time: string;
  date: string;
  location?: string;
  student_id?: string;
  student_name?: string;
  description?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  color: string;
}

interface Student {
  id: string;
  name: string;
}

const eventTypes = [
  { type: 'lesson', label: '수업', icon: BookOpen, color: 'bg-blue-500' },
  { type: 'meeting', label: '미팅', icon: Users, color: 'bg-green-500' },
  { type: 'break', label: '휴식', icon: Coffee, color: 'bg-yellow-500' },
  { type: 'call', label: '전화상담', icon: Phone, color: 'bg-purple-500' },
  { type: 'other', label: '기타', icon: CalendarIcon, color: 'bg-gray-500' }
];

const months = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월"
];

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarContent() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'lesson' as CalendarEvent['type'],
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    student_id: '',
    description: '',
    status: 'scheduled' as CalendarEvent['status']
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 학생 목록 가져오기
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name')
        .eq('teacher_id', user.id);

      setStudents(studentsData || []);

      // 더미 일정 데이터 (실제로는 calendar_events 테이블에서 가져올 예정)
      const dummyEvents: CalendarEvent[] = [
        {
          id: '1',
          title: '김영희 학생 수업',
          type: 'lesson',
          start_time: '10:00',
          end_time: '11:00',
          date: '2026-01-08',
          location: '화상수업',
          student_id: '1',
          student_name: '김영희',
          description: '영어 회화 수업 - Chapter 5',
          status: 'scheduled',
          color: 'bg-blue-500'
        },
        {
          id: '2',
          title: '박민수 학생 수업',
          type: 'lesson',
          start_time: '14:00',
          end_time: '15:00',
          date: '2026-01-08',
          location: '화상수업',
          student_id: '2',
          student_name: '박민수',
          description: '영어 회화 수업 - Chapter 3',
          status: 'scheduled',
          color: 'bg-blue-500'
        },
        {
          id: '3',
          title: '학부모 상담',
          type: 'call',
          start_time: '16:00',
          end_time: '16:30',
          date: '2026-01-08',
          location: '전화',
          description: '김영희 학생 학습 상담',
          status: 'scheduled',
          color: 'bg-purple-500'
        },
        {
          id: '4',
          title: '교사 회의',
          type: 'meeting',
          start_time: '19:00',
          end_time: '20:00',
          date: '2026-01-09',
          location: '온라인',
          description: '월간 교사 회의',
          status: 'scheduled',
          color: 'bg-green-500'
        },
        {
          id: '5',
          title: '점심 휴식',
          type: 'break',
          start_time: '12:00',
          end_time: '13:00',
          date: '2026-01-09',
          location: '',
          description: '',
          status: 'scheduled',
          color: 'bg-yellow-500'
        }
      ];

      setEvents(dummyEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // 이전 달의 마지막 날들
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    // 현재 달의 날들
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDay = new Date(year, month, i);
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        isToday: today.toDateString() === currentDay.toDateString(),
        isSelected: selectedDate?.toDateString() === currentDay.toDateString()
      });
    }

    // 다음 달의 첫 날들
    const totalCells = 42; // 6주 × 7일
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setEventForm({
      title: '',
      type: 'lesson',
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : todayStr,
      start_time: '10:00',
      end_time: '11:00',
      location: '',
      student_id: '',
      description: '',
      status: 'scheduled'
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventForm({
      title: event.title,
      type: event.type,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || '',
      student_id: event.student_id || '',
      description: event.description || '',
      status: event.status
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    try {
      const eventTypeConfig = eventTypes.find(t => t.type === eventForm.type);
      const studentName = eventForm.student_id 
        ? students.find(s => s.id === eventForm.student_id)?.name 
        : undefined;

      const newEvent: CalendarEvent = {
        id: editingEvent?.id || Math.random().toString(),
        title: eventForm.title,
        type: eventForm.type,
        date: eventForm.date,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time,
        location: eventForm.location,
        student_id: eventForm.student_id || undefined,
        student_name: studentName,
        description: eventForm.description,
        status: eventForm.status,
        color: eventTypeConfig?.color || 'bg-gray-500'
      };

      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? newEvent : e));
      } else {
        setEvents(prev => [...prev, newEvent]);
      }

      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getEventTypeIcon = (type: string) => {
    const eventType = eventTypes.find(t => t.type === type);
    const Icon = eventType?.icon || CalendarIcon;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">일정 관리</h1>
          <p className="text-gray-600 mt-2">수업 일정과 중요한 일정을 관리하세요</p>
        </div>
        <button 
          onClick={handleAddEvent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          일정 추가
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold min-w-32 text-center">
                {currentDate.getFullYear()}년 {months[currentDate.getMonth()]}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-2">
              {['month', 'week', 'day'].map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType as any)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    view === viewType 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {viewType === 'month' ? '월' : viewType === 'week' ? '주' : '일'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 유형</option>
                {eventTypes.map(type => (
                  <option key={type.type} value={type.type}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="일정 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week Headers */}
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center font-medium text-gray-500 text-sm">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day.date);
            return (
              <div
                key={index}
                onClick={() => handleDateClick(day.date)}
                className={`min-h-[80px] p-2 border cursor-pointer transition-colors ${
                  day.isCurrentMonth 
                    ? 'bg-white hover:bg-blue-50 border-gray-200' 
                    : 'bg-gray-50 border-gray-100'
                } ${
                  day.isToday 
                    ? 'ring-2 ring-blue-500' 
                    : ''
                } ${
                  day.isSelected 
                    ? 'bg-blue-100 border-blue-300' 
                    : ''
                }`}
              >
                <div className={`text-sm mb-1 ${
                  day.isCurrentMonth 
                    ? day.isToday 
                      ? 'font-bold text-blue-600' 
                      : 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                
                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded text-white truncate ${event.color}`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 2}개 더
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">오늘의 일정</h3>
        <div className="space-y-3">
          {filteredEvents
            .filter(event => event.date === new Date().toISOString().split('T')[0])
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className={`p-2 rounded-lg ${event.color}`}>
                  {getEventTypeIcon(event.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.start_time} - {event.end_time}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                    {event.student_name && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.student_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'scheduled' 
                      ? 'bg-blue-100 text-blue-800'
                      : event.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {event.status === 'scheduled' ? '예정' : event.status === 'completed' ? '완료' : '취소'}
                  </span>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          
          {filteredEvents.filter(event => event.date === new Date().toISOString().split('T')[0]).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>오늘 예정된 일정이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="일정 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value as CalendarEvent['type'] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {eventTypes.map(type => (
                    <option key={type.type} value={type.type}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm(prev => ({ ...prev, status: e.target.value as CalendarEvent['status'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">예정</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {eventForm.type === 'lesson' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학생</label>
                  <select
                    value={eventForm.student_id}
                    onChange={(e) => setEventForm(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">학생 선택</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>{student.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="장소를 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="추가 메모를 입력하세요"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEvent ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}