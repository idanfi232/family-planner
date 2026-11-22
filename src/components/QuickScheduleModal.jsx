import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Sparkles, Clock, Calendar } from 'lucide-react';
import { EVENT_CATEGORIES, normalizeCategory } from '../types/models';

export default function QuickScheduleModal({ isOpen, onClose, members, weekDays, selectedMemberName }) {
  const [activeMember, setActiveMember] = useState(selectedMemberName || '');

  useEffect(() => {
    if (selectedMemberName && selectedMemberName !== 'all') {
      setActiveMember(selectedMemberName);
    } else if (members.length > 0) {
      setActiveMember((prev) => (members.some((m) => m.name === prev) ? prev : members[0].name));
    } else {
      setActiveMember('');
    }
  }, [selectedMemberName, members, isOpen]);

  const getCategoryName = (catId) => {
    const normalized = normalizeCategory(catId);
    return EVENT_CATEGORIES.find((c) => c.id === normalized)?.name || 'אירוע';
  };

  const weeklyByDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayTasks = (day.tasks || []).filter((item) => {
        if (!activeMember) return true;
        return item.assignee === activeMember;
      });

      const lessons = [];
      dayTasks.forEach((item) => {
        if (normalizeCategory(item.category) === 'school_schedule' && Array.isArray(item.schedule_lessons)) {
          item.schedule_lessons.forEach((lesson) => {
            lessons.push({
              ...lesson,
              scheduleTitle: item.title,
            });
          });
        }
      });

      lessons.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

      const classes = dayTasks
        .filter((item) => normalizeCategory(item.category) === 'class')
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      const otherEvents = dayTasks
        .filter((item) => {
          const cat = normalizeCategory(item.category);
          return cat !== 'school_schedule' && cat !== 'class';
        })
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      return {
        ...day,
        lessons,
        classes,
        otherEvents,
      };
    });
  }, [weekDays, activeMember]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">מבט מהיר — מערכת שעות, חוגים ואירועים</h3>
            <p className="text-xs text-slate-500">תצוגה שבועית מלאה לפי משתתף/ילד (אחראי)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-600 shrink-0">בחר משתתף:</span>
            {members.length === 0 ? (
              <span className="text-xs text-slate-400">אין משתתפים מוגדרים</span>
            ) : (
              members.map((member) => {
                const isSelected = activeMember === member.name;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setActiveMember(member.name)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {member.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyByDay.map((day) => {
              const hasContent =
                day.lessons.length > 0 || day.classes.length > 0 || day.otherEvents.length > 0;

              return (
                <div
                  key={day.dateStr}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-sm font-bold text-slate-800">יום {day.name}</span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {day.dateStr ? day.dateStr.split('-').slice(1).reverse().join('/') : ''}
                    </span>
                  </div>

                  {!hasContent ? (
                    <div className="py-4 text-center text-xs text-slate-400">אין שיעורים, חוגים או אירועים</div>
                  ) : (
                    <>
                      {day.lessons.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-teal-800">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>מערכת שעות ({day.lessons.length})</span>
                          </div>
                          <ul className="space-y-1.5">
                            {day.lessons.map((lesson, i) => (
                              <li
                                key={lesson.id || `${day.dateStr}_l_${i}`}
                                className="rounded-xl border border-teal-200/80 bg-white px-2.5 py-2 text-xs shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-1 font-bold text-slate-800">
                                  <span className="truncate">{lesson.subject || 'שיעור'}</span>
                                  {(lesson.start_time || lesson.end_time) && (
                                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 shrink-0">
                                      <Clock className="h-3 w-3" />
                                      {lesson.start_time}
                                      {lesson.end_time ? `-${lesson.end_time}` : ''}
                                    </span>
                                  )}
                                </div>
                                {lesson.teacher && (
                                  <div className="mt-0.5 text-[11px] text-slate-500">מורה: {lesson.teacher}</div>
                                )}
                                {lesson.notes && (
                                  <div className="mt-0.5 text-[11px] text-amber-800 bg-amber-50 rounded-md px-1.5 py-0.5">
                                    {lesson.notes}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {day.classes.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-800">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>חוגים ({day.classes.length})</span>
                          </div>
                          <ul className="space-y-1.5">
                            {day.classes.map((cls) => (
                              <li
                                key={cls.id}
                                className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-2.5 py-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-1 font-bold text-indigo-950">
                                  <span className="truncate">{cls.title}</span>
                                  {(cls.time || cls.end_time) && (
                                    <span className="text-[11px] font-semibold text-indigo-700 shrink-0">
                                      {cls.time}
                                      {cls.end_time ? `-${cls.end_time}` : ''}
                                    </span>
                                  )}
                                </div>
                                {cls.location && (
                                  <div className="mt-0.5 text-[11px] text-indigo-800/80">{cls.location}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {day.otherEvents.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-amber-600" />
                            <span>אירועים נוספים ({day.otherEvents.length})</span>
                          </div>
                          <ul className="space-y-1.5">
                            {day.otherEvents.map((ev) => (
                              <li
                                key={ev.id}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-1 font-bold text-slate-800">
                                  <span className="truncate">{ev.title}</span>
                                  {(ev.time || ev.end_time) && (
                                    <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                                      {ev.time}
                                      {ev.end_time ? `-${ev.end_time}` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                    {getCategoryName(ev.category)}
                                  </span>
                                  {ev.location && <span className="truncate">{ev.location}</span>}
                                </div>
                                {ev.notes && (
                                  <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 rounded-md px-1.5 py-0.5">
                                    {ev.notes}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t bg-slate-50 px-6 py-3.5 flex justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-900"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}