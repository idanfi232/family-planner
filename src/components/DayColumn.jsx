import React from 'react';
import { Clock, MapPin, Plus, Navigation, Sparkles } from 'lucide-react';
import { EVENT_CATEGORIES } from '../types/models';

export default function DayColumn({ 
  dayName, 
  dateStr, 
  tasks, 
  members,
  onAddTask, 
  onEditTask,
  hideHeader = false
}) {
  const sortedTasks = [...tasks].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const getCategoryInfo = (catId) => {
    return EVENT_CATEGORIES.find(c => c.id === catId) || { name: 'אירוע', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  };

  const shortDate = dateStr ? dateStr.split('-').slice(1).reverse().join('/') : '';

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
      
      {/* כותרת העמודה - תוצג רק אם hideHeader הוא false (כלומר בתצוגת שבוע) */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">יום {dayName}</h2>
            {shortDate && <span className="text-xs font-medium text-slate-400">{shortDate}</span>}
          </div>
          <button
            onClick={onAddTask}
            title="הוסף אירוע ליום זה"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 space-y-2.5 p-3 min-h-[220px] overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            אין אירועים מתוכננים
          </div>
        ) : (
          sortedTasks.map((task) => {
            const category = getCategoryInfo(task.category);

            return (
              <div
                key={task.id}
                onClick={() => onEditTask(task)}
                className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${category.color}`}>
                      {category.name}
                    </span>

                    {task.time && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {task.end_time ? `${task.time} - ${task.end_time}` : task.time}
                      </span>
                    )}
                    
                    {task.type === 'one-off' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800" title="אירוע חד-פעמי">
                        <Sparkles className="h-3 w-3" /> מיוחד
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold leading-snug text-slate-800">
                  {task.title}
                </h3>

                {task.location && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{task.location}</span>
                    </span>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(task.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="נווט עם Waze"
                      className="mr-1 inline-flex items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-600 hover:bg-sky-100"
                    >
                      <Navigation className="h-3 w-3" /> נווט
                    </a>
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
                  {task.assignee && (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {task.assignee}
                    </span>
                  )}

                  {task.affected_members && task.affected_members.length > 0 && (
                    <div className="flex items-center gap-1">
                      {task.affected_members.name.map(name => (
                        <span 
                          key={name} 
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}