export const DAYS_OF_WEEK = [
  { id: 0, name: 'ראשון', shortName: 'א׳' },
  { id: 1, name: 'שני', shortName: 'ב׳' },
  { id: 2, name: 'שלישי', shortName: 'ג׳' },
  { id: 3, name: 'רביעי', shortName: 'ד׳' },
  { id: 4, name: 'חמישי', shortName: 'ה׳' },
  { id: 5, name: 'שישי', shortName: 'ו׳' },
  { id: 6, name: 'שבת', shortName: 'ש׳' },
];

export const EVENT_CATEGORIES = [
  { id: 'event', name: 'אירוע / כללי', color: 'blue' },
  { id: 'pickup', name: 'הסעה / איסוף', color: 'indigo' },
  { id: 'club', name: 'חוג / פעילות', color: 'purple' },
  { id: 'workout', name: 'אימון', color: 'emerald' },
  { id: 'doctor', name: 'רופא / בריאות', color: 'rose' },
  { id: 'shopping', name: 'קניות / סידורים', color: 'amber' },
  { id: 'family', name: 'זמן משפחה', color: 'teal' },
];

export const createEmptyTask = (dayOfWeek = 0) => ({
  id: '',
  template_id: null,
  type: 'one-off',
  category: 'event',
  title: '',
  day_of_week: dayOfWeek,
  date: '',
  time: '',
  end_time: '',
  assignee: '',
  affected_members: [],
  notes: '',
  is_completed: false,
  is_modified: false,
  status: 'active',
});