import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckSquare, ChevronRight, ChevronLeft, CopyPlus, Filter, Plus, Cloud, Users, Tag } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { DAYS_OF_WEEK, EVENT_CATEGORIES, createEmptyTask } from './types/models';
import { generateWeekSchedule } from './utils/smartMerge';
import DayColumn from './components/DayColumn';
import TaskModal from './components/TaskModal';
import TaskTrackerTab from './components/TaskTrackerTab';
import MembersSettingsModal from './components/MembersSettingsModal';

const getSundayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getSundayOfWeek(new Date()));
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState('week');
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const todayDayOfWeek = new Date().getDay();
    return todayDayOfWeek;
  });

  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    const unsubTemplates = onSnapshot(collection(db, 'templates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTemplates();
      unsubEvents();
      unsubMembers();
    };
  }, []);

  const changeWeek = (offsetWeeks) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offsetWeeks * 7);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  const handlePopulateWeek = async () => {
    try {
      const mergedList = generateWeekSchedule(currentWeekStart, templates, events);
      const existingIds = new Set(events.map(e => e.id));
      const newlyCreated = mergedList.filter(e => !existingIds.has(e.id));

      if (newlyCreated.length === 0) return;

      const batch = writeBatch(db);
      newlyCreated.forEach(item => {
        batch.set(doc(db, 'events', item.id), item);
      });
      await batch.commit();
    } catch (err) {
      console.error("Error populating week:", err);
    }
  };

  const handleOpenAddModal = (dayIndex, dateStr) => {
    const newTask = createEmptyTask(dayIndex);
    newTask.date = dateStr;
    setEditingTask(newTask);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask({ ...task });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (savedTask, editScope) => {
    try {
      const isNew = !events.some(e => e.id === savedTask.id);

      if (isNew) {
        if (savedTask.type === 'routine') {
          const newTemplateId = `tpl_${Date.now()}`;
          const newTemplate = { ...savedTask, id: newTemplateId };
          const newInstanceId = `instance_${Date.now()}`;
          const newInstance = { ...savedTask, id: newInstanceId, template_id: newTemplateId, status: 'active' };

          const batch = writeBatch(db);
          batch.set(doc(db, 'templates', newTemplateId), newTemplate);
          batch.set(doc(db, 'events', newInstanceId), newInstance);
          await batch.commit();
        } else {
          const oneOffId = `oneoff_${Date.now()}`;
          await setDoc(doc(db, 'events', oneOffId), { ...savedTask, id: oneOffId, template_id: null, status: 'active' });
        }
      } else {
        if (savedTask.template_id && editScope === 'template') {
          const batch = writeBatch(db);
          batch.set(doc(db, 'templates', savedTask.template_id), { ...savedTask, id: savedTask.template_id }, { merge: true });

          events.forEach(e => {
            if (e.id === savedTask.id) {
              batch.set(doc(db, 'events', e.id), { ...savedTask, is_modified: false });
            } else if (e.template_id === savedTask.template_id && e.date >= savedTask.date && !e.is_modified) {
              batch.set(doc(db, 'events', e.id), { ...e, ...savedTask, id: e.id, date: e.date });
            }
          });
          await batch.commit();
        } else {
          await setDoc(doc(db, 'events', savedTask.id), { ...savedTask, is_modified: true });
        }
      }
    } catch (err) {
      console.error("Error saving event:", err);
    }
  };

  const handleDeleteTask = async (taskToDelete, editScope) => {
    try {
      if (taskToDelete.template_id && editScope === 'template') {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'templates', taskToDelete.template_id));
        events.forEach(e => {
          if (e.template_id === taskToDelete.template_id && e.date >= taskToDelete.date) {
            batch.delete(doc(db, 'events', e.id));
          }
        });
        await batch.commit();
      } else {
        await deleteDoc(doc(db, 'events', taskToDelete.id));
      }
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const handleAddMember = async (name) => {
    const id = `member_${Date.now()}`;
    await setDoc(doc(db, 'members', id), { id, name });
  };

  const handleDeleteMember = async (id) => {
    await deleteDoc(doc(db, 'members', id));
  };

  const weekDays = DAYS_OF_WEEK.map((day, index) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + index);
    const dateStr = d.toISOString().split('T')[0];

    const dayTasks = events.filter(e => {
      if (e.date !== dateStr) return false;
      
      if (selectedMemberFilter !== 'all') {
        const matchesAssignee = e.assignee === selectedMemberFilter;
        const matchesAffected = e.affected_members && e.affected_members.includes(selectedMemberFilter);
        if (!matchesAssignee && !matchesAffected) return false;
      }

      if (selectedCategoryFilter !== 'all') {
        if ((e.category || 'event') !== selectedCategoryFilter) return false;
      }

      return true;
    });

    return { ...day, dateStr, tasks: dayTasks };
  });

  const weekEndStr = weekDays[6]?.dateStr;
  const formatShort = (str) => str ? str.split('-').slice(1).reverse().join('/') : '';

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">המערכת המשפחתית</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    <Cloud className="h-3 w-3" /> מסונכרן
                  </span>
                </div>
                <p className="text-xs text-slate-500">לו"ז ומשימות משותפות</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-4 w-4" /> לו״ז אירועים
              </button>
              <button
                onClick={() => setActiveTab('todos')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="h-4 w-4" /> ניהול משימות
              </button>
            </div>

            {activeTab === 'schedule' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMembersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>משתתפים ({members.length})</span>
                </button>

                <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                  >
                    שבוע
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${viewMode === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                  >
                    יום
                  </button>
                </div>

                <button
                  onClick={handlePopulateWeek}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <CopyPlus className="h-4 w-4" />
                  <span>טען שגרה</span>
                </button>

                <button
                  onClick={() => handleOpenAddModal(viewMode === 'day' ? selectedDayIndex : 0, currentWeekStart)}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>אירוע חדש</span>
                </button>
              </div>
            )}

          </div>

          {activeTab === 'schedule' && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => changeWeek(-1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-white">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentWeekStart(getSundayOfWeek(new Date()))} className="px-3 py-1 text-xs font-bold text-slate-700">
                  {formatShort(currentWeekStart)} - {formatShort(weekEndStr)}
                </button>
                <button onClick={() => changeWeek(1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* סרגלי סינון (קטגוריית אירוע כ-Dropdown ומסנן משתתף) */}
              <div className="flex flex-wrap items-center gap-3">
                {/* קטגוריית אירוע כ-Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> קטגוריית אירוע:
                  </span>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">הכל (הצג הכל)</option>
                    {EVENT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* סינון לפי משתתף */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 border-r pr-3">
                  <span className="text-xs font-medium text-slate-400">משתתף:</span>
                  <button
                    onClick={() => setSelectedMemberFilter('all')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${selectedMemberFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    כולם
                  </button>
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMemberFilter(member.name)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${selectedMemberFilter === member.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {activeTab === 'schedule' ? (
          isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">טוען נתונים מהענן...</div>
          ) : viewMode === 'week' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {weekDays.map(day => (
                <DayColumn
                  key={day.dateStr}
                  dayName={day.name}
                  dateStr={day.dateStr}
                  tasks={day.tasks}
                  members={members}
                  onAddTask={() => handleOpenAddModal(day.id, day.dateStr)}
                  onEditTask={handleOpenEditModal}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setSelectedDayIndex(prev => (prev > 0 ? prev - 1 : 6))}
                  className="rounded-xl p-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <ChevronRight className="h-5 w-5" /> יום קודם
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-800">יום {weekDays[selectedDayIndex].name}</h2>
                  <span className="text-xs text-slate-400">{formatShort(weekDays[selectedDayIndex].dateStr)}</span>
                </div>
                <button
                  onClick={() => setSelectedDayIndex(prev => (prev < 6 ? prev + 1 : 0))}
                  className="rounded-xl p-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  יום הבא <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <DayColumn
                dayName={weekDays[selectedDayIndex].name}
                dateStr={weekDays[selectedDayIndex].dateStr}
                tasks={weekDays[selectedDayIndex].tasks}
                members={members}
                onAddTask={() => handleOpenAddModal(weekDays[selectedDayIndex].id, weekDays[selectedDayIndex].dateStr)}
                onEditTask={handleOpenEditModal}
              />
            </div>
          )
        ) : (
          <TaskTrackerTab members={members} />
        )}
      </main>

      {isModalOpen && editingTask && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={editingTask}
          members={members}
        />
      )}

      <MembersSettingsModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={members}
        onAddMember={handleAddMember}
        onDeleteMember={handleDeleteMember}
      />
    </div>
  );
}