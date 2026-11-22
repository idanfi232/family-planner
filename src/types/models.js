// קטגוריות לבחירת סוג האירוע
export const EVENT_CATEGORIES = [
  { id: 'ride', name: 'הסעה', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { id: 'class', name: 'חוג', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'event', name: 'אירוע', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'meetup', name: 'מפגש', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'errand', name: 'סידורים', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { id: 'task', name: 'משימה', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { id: 'doctor', name: 'רופא', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'school_schedule', name: 'מערכת שעות', color: 'bg-teal-100 text-teal-700 border-teal-300' },
];

// נרמול קטגוריות ישנות כך שיוצגו בצורה תקינה (למשל חתונה/יומולדת תחת אירוע)
export const normalizeCategory = (categoryId) => {
  if (!categoryId) return 'event';
  if (categoryId === 'wedding' || categoryId === 'birthday') return 'event';
  const exists = EVENT_CATEGORIES.some((cat) => cat.id === categoryId);
  return exists ? categoryId : 'event';
};

// ימים בשבוע
export const DAYS_OF_WEEK = [
  { id: 0, name: 'ראשון' },
  { id: 1, name: 'שני' },
  { id: 2, name: 'שלישי' },
  { id: 3, name: 'רביעי' },
  { id: 4, name: 'חמישי' },
  { id: 5, name: 'שישי' },
  { id: 6, name: 'שבת' },
];

export const createEmptyLesson = () => ({
  id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  subject: '',
  start_time: '',
  end_time: '',
  teacher: '',
  notes: '',
});

// מבנה ריק לאירוע חדש בלו"ז
export const createEmptyTask = (dayOfWeek = 0) => ({
  id: Date.now().toString(),
  title: '',
  category: 'event', // ברירת מחדל
  day_of_week: dayOfWeek,
  date: '',
  time: '',
  end_time: '',
  location: '',
  assignee: '',
  affected_members: [],
  type: 'routine',
  status: 'active',
  is_modified: false,
  template_id: null,
  notes: '',
  schedule_lessons: [],
});

// מבנה ריק למשימה חדשה
export const createEmptyTodo = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return {
    id: `todo_${Date.now()}`,
    title: '',
    description: '',
    assignee: '',
    start_date: todayStr,
    end_date: '',
    status: 'pending',
    created_at: Date.now(),
  };
};