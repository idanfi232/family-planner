import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, MapPin, User, Users, Tag, RefreshCw, BookOpen, Plus, Trash2, Calendar, Copy, ArrowRightLeft } from 'lucide-react';
import { DAYS_OF_WEEK, EVENT_CATEGORIES, normalizeCategory, createEmptyLesson } from '../types/models';

const getDayOfWeekFromDateStr = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).getDay();
};

const addOneHourToTime = (timeStr) => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const nextHour = (h + 1) % 24;
  return `${String(nextHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function TaskModal({ isOpen, onClose, onSave, onDelete, initialTask, members }) {
  const [task, setTask] = useState(() => ({
    ...initialTask,
    category: normalizeCategory(initialTask?.category),
    schedule_lessons: Array.isArray(initialTask?.schedule_lessons) ? initialTask.schedule_lessons : [],
  }));
  const [updateAllFuture, setUpdateAllFuture] = useState(false);
  const [dateAction, setDateAction] = useState('move'); // 'move' | 'duplicate'

  const endTimeInputRef = useRef(null);

  const isCustomAssignee =
    initialTask?.assignee &&
    !members.some((m) => m.name === initialTask.assignee || m.id === initialTask.assignee);
  const [customAssigneeText, setCustomAssigneeText] = useState(isCustomAssignee ? initialTask.assignee : '');
  const [assigneeMode, setAssigneeMode] = useState(isCustomAssignee ? 'other' : initialTask?.assignee || '');

  useEffect(() => {
    const validMembers = members.map((m) => m.name);
    const cleanedAffected = (initialTask?.affected_members || []).filter((name) => validMembers.includes(name));

    setTask({
      ...initialTask,
      category: normalizeCategory(initialTask?.category),
      affected_members: cleanedAffected,
      schedule_lessons: Array.isArray(initialTask?.schedule_lessons) ? initialTask.schedule_lessons : [],
    });
    setUpdateAllFuture(false);
    setDateAction('move');

    const custom =
      initialTask?.assignee &&
      !members.some((m) => m.name === initialTask.assignee || m.id === initialTask.assignee);
    setAssigneeMode(custom ? 'other' : initialTask?.assignee || '');
    setCustomAssigneeText(custom ? initialTask.assignee : '');
  }, [initialTask, members]);

  if (!isOpen) return null;

  const isExistingEvent = Boolean(initialTask?.id && initialTask?.title);
  const originalDate = initialTask?.date || '';
  const hasDateChanged = isExistingEvent && Boolean(task.date) && task.date !== originalDate;

  const isSchoolSchedule = normalizeCategory(task.category) === 'school_schedule';
  const lessons = Array.isArray(task.schedule_lessons) ? task.schedule_lessons : [];

  const handleDateChange = (newDateStr) => {
    const computedDay = getDayOfWeekFromDateStr(newDateStr);
    setTask((prev) => ({
      ...prev,
      date: newDateStr,
      day_of_week: computedDay !== null ? computedDay : prev.day_of_week,
    }));
  };

  const handleDayOfWeekChange = (newDayIndex) => {
    setTask((prev) => ({
      ...prev,
      day_of_week: newDayIndex,
    }));
  };

  const handleStartTimeChange = (newStartTime) => {
    setTask((prev) => {
      const nextEndTime = !prev.end_time && newStartTime ? addOneHourToTime(newStartTime) : prev.end_time;
      return {
        ...prev,
        time: newStartTime,
        end_time: nextEndTime,
      };
    });

    if (newStartTime && endTimeInputRef.current) {
      requestAnimationFrame(() => {
        endTimeInputRef.current?.focus();
      });
    }
  };

  const handleAddLesson = () => {
    setTask((prev) => ({
      ...prev,
      schedule_lessons: [...(prev.schedule_lessons || []), createEmptyLesson()],
    }));
  };

  const handleLessonChange = (lessonId, field, value) => {
    setTask((prev) => ({
      ...prev,
      schedule_lessons: (prev.schedule_lessons || []).map((lesson) =>
        lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
      ),
    }));
  };

  const handleRemoveLesson = (lessonId) => {
    setTask((prev) => ({
      ...prev,
      schedule_lessons: (prev.schedule_lessons || []).filter((lesson) => lesson.id !== lessonId),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalAssignee = assigneeMode === 'other' ? customAssigneeText : assigneeMode;
    const editScope = updateAllFuture ? 'template' : 'instance';
    const normalizedCategory = normalizeCategory(task.category);
    const cleanedLessons =
      normalizedCategory === 'school_schedule'
        ? (task.schedule_lessons || []).filter(
            (l) => l.subject?.trim() || l.start_time || l.end_time || l.teacher?.trim() || l.notes?.trim()
          )
        : [];

    onSave(
      {
        ...task,
        category: normalizedCategory,
        assignee: finalAssignee,
        schedule_lessons: cleanedLessons,
        _dateAction: hasDateChanged ? dateAction : 'move',
        _previousDate: originalDate,
      },
      editScope
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-xl font-bold text-slate-800">
            {isExistingEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">כותרת האירוע</label>
            <input
              type="text"
              required
              placeholder="למשל: מערכת שעות טל, אימון כדורגל..."
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Tag className="h-4 text-slate-400" /> קטגוריית אירוע
              </label>
              <select
                value={normalizeCategory(task.category)}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setTask((prev) => ({
                    ...prev,
                    category: nextCat,
                    schedule_lessons:
                      nextCat === 'school_schedule' && (!prev.schedule_lessons || prev.schedule_lessons.length === 0)
                        ? [createEmptyLesson()]
                        : prev.schedule_lessons || [],
                  }));
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">סוג אירוע</label>
              <select
                value={task.type}
                onChange={(e) => setTask({ ...task, type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="routine">שגרה קבועה בשבוע</option>
                <option value="one-off">אירוע חד-פעמי / מיוחד</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Calendar className="h-4 text-slate-400" /> תאריך
              </label>
              <input
                type="date"
                value={task.date || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {task.type === 'routine' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">יום בשבוע (לשגרה)</label>
                <select
                  value={task.day_of_week}
                  onChange={(e) => handleDayOfWeekChange(parseInt(e.target.value, 10))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {hasDateChanged && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 space-y-2">
              <div className="text-xs font-bold text-blue-950">
                שינית את התאריך מ-{originalDate.split('-').reverse().join('/')} ל-{task.date.split('-').reverse().join('/')}. מה תרצה לעשות?
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDateAction('move')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    dateAction === 'move'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                      : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-100/60'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>רק להעביר לתאריך החדש</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDateAction('duplicate')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    dateAction === 'duplicate'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100/60'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>לשכפל גם לתאריך החדש</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Clock className="h-4 text-slate-400" /> שעת התחלה
              </label>
              <input
                type="time"
                value={task.time || ''}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Clock className="h-4 text-slate-400" /> שעת סיום
              </label>
              <input
                ref={endTimeInputRef}
                type="time"
                value={task.end_time || ''}
                onChange={(e) => setTask({ ...task, end_time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MapPin className="h-4 text-slate-400" /> מיקום / כתובת
            </label>
            <input
              type="text"
              placeholder="למשל: בית ספר, ספורטק..."
              value={task.location || ''}
              onChange={(e) => setTask({ ...task, location: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <User className="h-4 text-slate-400" /> מי מבצע / אחראי?
              </label>
              <select
                value={assigneeMode}
                onChange={(e) => setAssigneeMode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">בחר מבצע...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
                <option value="other">מישהו אחר...</option>
              </select>

              {assigneeMode === 'other' && (
                <input
                  type="text"
                  required
                  placeholder="הקלד שם מבצע..."
                  value={customAssigneeText}
                  onChange={(e) => setCustomAssigneeText(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Users className="h-4 text-slate-400" /> מושפעים / משתתפים
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border rounded-xl">
                {members.map((member) => {
                  const isSelected = task.affected_members?.includes(member.name);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        const current = task.affected_members || [];
                        const updated = isSelected
                          ? current.filter((name) => name !== member.name)
                          : [...current, member.name];
                        setTask({ ...task, affected_members: updated });
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {isSchoolSchedule && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-teal-700" />
                  <h4 className="text-sm font-bold text-teal-950">שיעורים במערכת ({lessons.length})</h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddLesson}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                >
                  <Plus className="h-3.5 w-3.5" /> הוסף שיעור
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="rounded-xl border border-dashed border-teal-300 bg-white/80 py-4 text-center text-xs text-teal-800">
                  אין שיעורים עדיין. לחץ על &ldquo;הוסף שיעור&rdquo; להוספת שיעור.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="rounded-xl border border-teal-200 bg-white p-3 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-teal-800">שיעור #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLesson(lesson.id)}
                          title="הסר שיעור"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-600">שם השיעור</label>
                          <input
                            type="text"
                            placeholder="למשל: מתמטיקה"
                            value={lesson.subject || ''}
                            onChange={(e) => handleLessonChange(lesson.id, 'subject', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">שעת התחלה</label>
                          <input
                            type="time"
                            value={lesson.start_time || ''}
                            onChange={(e) => handleLessonChange(lesson.id, 'start_time', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">שעת סיום</label>
                          <input
                            type="time"
                            value={lesson.end_time || ''}
                            onChange={(e) => handleLessonChange(lesson.id, 'end_time', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">שם המורה</label>
                          <input
                            type="text"
                            placeholder="שם המורה..."
                            value={lesson.teacher || ''}
                            onChange={(e) => handleLessonChange(lesson.id, 'teacher', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">הערות לשיעור</label>
                          <input
                            type="text"
                            placeholder="ציוד, מבחן, תזכורת..."
                            value={lesson.notes || ''}
                            onChange={(e) => handleLessonChange(lesson.id, 'notes', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">הערות נוספות</label>
            <textarea
              rows="2"
              placeholder="הערות חשובות..."
              value={task.notes || ''}
              onChange={(e) => setTask({ ...task, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </form>

        <div className="border-t bg-slate-50 px-6 py-4 rounded-b-2xl space-y-3">
          {task.template_id && dateAction === 'move' && (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <RefreshCw className="h-4 w-4 text-amber-700 shrink-0" />
                <span>החל שינוי זה גם על כל הפעמים הבאות בשגרה</span>
              </div>
              <input
                type="checkbox"
                checked={updateAllFuture}
                onChange={(e) => setUpdateAllFuture(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            {task.id && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  const editScope = updateAllFuture ? 'template' : 'instance';
                  onDelete(task, editScope);
                  onClose();
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                מחק אירוע
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 bg-white border border-slate-200"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
              >
                {hasDateChanged && dateAction === 'duplicate' ? 'שכפל אירוע' : 'שמור אירוע'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}