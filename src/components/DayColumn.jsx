import React, { useState, useEffect } from 'react';
import { Plus, Clock, User, Users, CheckCircle2, Circle, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { EVENT_CATEGORIES } from '../types/models';

const getColorNameFromClass = (colorClass = '') => {
  const match = colorClass.match(/bg-([a-z]+)-/);
  return match ? match[1] : 'sky';
};

const BORDER_BY_COLOR = {
  sky: 'border-r-4 border-r-sky-500',
  indigo: 'border-r-4 border-r-indigo-500',
  pink: 'border-r-4 border-r-pink-500',
  amber: 'border-r-4 border-r-amber-500',
  emerald: 'border-r-4 border-r-emerald-500',
  purple: 'border-r-4 border-r-purple-500',
  slate: 'border-r-4 border-r-slate-500',
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export default function DayColumn({
  dayName,
  dateStr,
  tasks,
  onAddTask,
  onEditTask,
  onToggleComplete,
  hideHeader = false,
  isToday = false,
}) {
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, [isToday]);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const formatDateShort = (str) => {
    if (!str) return '';
    const [, m, d] = str.split('-');
    return `${d}/${m}`;
  };

  let pastTasks = [];
  let upcomingTasks = sortedTasks;

  if (isToday) {
    pastTasks = [];
    upcomingTasks = [];

    sortedTasks.forEach((task) => {
      const startMin = timeToMinutes(task.time);
      const endMin = timeToMinutes(task.end_time);
      const effectiveEndMin = endMin !== null ? endMin : startMin;

      if (effectiveEndMin !== null && effectiveEndMin < nowMinutes) {
        pastTasks.push(task);
      } else {
        upcomingTasks.push(task);
      }
    });
  }

  const renderTaskCard = (task, isNextUp = false) => {
    const cat = EVENT_CATEGORIES.find(c => c.id === (task.category || 'event')) || EVENT_CATEGORIES[0];
    const borderClass = BORDER_BY_COLOR[getColorNameFromClass(cat.color)] || BORDER_BY_COLOR.sky;
    const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);
    const isCompleted = Boolean(task.is_completed);

    return (
      <div
        key={task.id}
        onClick={() => onEditTask(task)}
        className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all hover:shadow-md ${
          isCompleted
            ? 'border-emerald-200 bg-emerald-50/60 opacity-75'
            : isNextUp
            ? 'border-blue-400 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-xs'
            : `border-slate-200 bg-white ${borderClass}`
        }`}
      >
        {isNextUp && !isCompleted && (
          <div className="mb-1.5 inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
            הבא / פעיל עכשיו
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleComplete) onToggleComplete(task);
              }}
              title={isCompleted ? 'סמן כלא בוצע' : 'סמן כבוצע'}
              className={`mt-0.5 shrink-0 transition-colors ${
                isCompleted ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </button>

            <h4
              className={`text-sm font-bold leading-snug break-words ${
                isCompleted ? 'line-through text-slate-500' : 'text-slate-800'
              }`}
            >
              {task.title}
            </h4>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {hasNotes && (
              <span
                title={`הערה: ${task.notes}`}
                className="inline-flex items-center justify-center rounded-md bg-amber-100 p-1 text-amber-700"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cat.color}`}>
              {cat.name}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 pr-6">
          {task.time && (
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded-md">
              <Clock className="h-3 w-3 text-slate-500" />
              {task.end_time ? `${task.time} - ${task.end_time}` : task.time}
            </span>
          )}

          {task.assignee && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
              <User className="h-3 w-3" />
              {task.assignee}
            </span>
          )}

          {task.affected_members && task.affected_members.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Users className="h-3 w-3" />
              {task.affected_members.join(', ')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {!hideHeader && (
        <div className={`flex items-center justify-between border-b px-3.5 py-2.5 ${isToday ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/80 border-slate-100'}`}>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-800">יום {dayName}</h3>
              {isToday && (
                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">היום</span>
              )}
            </div>
            <span className="text-xs text-slate-400">{formatDateShort(dateStr)}</span>
          </div>
          <button
            onClick={onAddTask}
            title="הוסף אירוע ליום זה"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 space-y-2.5 p-2.5 min-h-[140px]">
        {isToday && pastTasks.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              <span>אירועים שהסתיימו ({pastTasks.length})</span>
              {showPastEvents ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showPastEvents && (
              <div className="space-y-2 border-t border-slate-200 p-2 bg-slate-50">
                {pastTasks.map(task => renderTaskCard(task, false))}
              </div>
            )}
          </div>
        )}

        {upcomingTasks.length === 0 && pastTasks.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center p-3">
            <span className="text-xs text-slate-400">אין אירועים מתוכננים</span>
          </div>
        ) : upcomingTasks.length === 0 ? (
          <div className="flex h-20 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center p-3">
            <span className="text-xs text-slate-400">כל אירועי היום הסתיימו</span>
          </div>
        ) : (
          upcomingTasks.map((task, idx) => renderTaskCard(task, isToday && idx === 0))
        )}
      </div>
    </div>
  );
}