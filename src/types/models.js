// קטגוריות לבחירת סוג האירוע
export const EVENT_CATEGORIES = [
  { id: 'ride', name: 'הסעה', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { id: 'class', name: 'חוג', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'wedding', name: 'חתונה', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'event', name: 'אירוע', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'meetup', name: 'מפגש', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'birthday', name: 'יומולדת', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'other', name: 'אחר', color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

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
  notes: ''
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
    created_at: Date.now()
  };
};