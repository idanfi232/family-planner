import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Ban } from 'lucide-react';
import { DAYS_OF_WEEK, EVENT_CATEGORIES, normalizeCategory } from '../types/models';

const getCategoryName = (catId) => {
  const normalized = normalizeCategory(catId);
  return EVENT_CATEGORIES.find((c) => c.id === normalized)?.name || normalized || 'אירוע';
};

export default function QuickScheduleModal({
  isOpen,
  onClose,
  members,
  weekDays,
  selectedMemberName,
  templates = [],
  allEvents = [],
}) {
  const [activeMember, setActiveMember] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (selectedMemberName && selectedMemberName !== 'all') {
      setActiveMember(selectedMemberName);
    } else if (members.length > 0) {
      setActiveMember(members[0].name);
    } else {
      setActiveMember('');
    }
  }, [isOpen, selectedMemberName, members]);

  if (!isOpen) return null;

  const daysWithEvents = (weekDays || []).map((day) => {
    const activeItems = (day.tasks || [])
      .filter((item) => item.status !== 'cancelled' && item.assignee === activeMember)
      .map((item) => ({ ...item, _isCancelled: false }));

    const explicitCancelled = (allEvents || [])
      .filter(
        (ev) =>
          ev.date === day.dateStr &&
          ev.status === 'cancelled' &&
          ev.assignee === activeMember
      )
      .map((ev) => ({ ...ev, _isCancelled: true }));

    const cancelledTemplateIds = new Set(
      explicitCancelled.map((ev) => ev.template_id).filter(Boolean)
    );

    const activeTemplateIdsOnDay = new Set(
      activeItems.map((ev) => ev.template_id).filter(Boolean)
    );

    const implicitCancelledTemplates = (templates || [])
      .filter((tpl) => {
        if (tpl.type !== 'routine') return false;
        if (tpl.day_of_week !== day.id) return false;
        if (tpl.assignee !== activeMember) return false;
        if (cancelledTemplateIds.has(tpl.id) || activeTemplateIdsOnDay.has(tpl.id)) return false;

        const hasInstanceInWeek = (allEvents || []).some(
          (ev) => ev.date === day.dateStr && ev.template_id === tpl.id
        );
        return !hasInstanceInWeek;
      })
      .map((tpl) => ({
        ...tpl,
        id: `cancelled_tpl_${tpl.id}_${day.dateStr}`,
        date: day.dateStr,
        _isCancelled: true,
      }));

    const combinedItems = [
      ...activeItems,
      ...explicitCancelled,
      ...implicitCancelledTemplates,
    ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    return {
      ...day,
      items: combinedItems,
    };
  });

  const totalCount = daysWithEvents.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-800">מבט מהיר שבועי</h3>
            {activeMember && (
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                {activeMember} ({totalCount})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b bg-slate-50 px-6 py-3 flex flex-wrap items-center gap-1.5">
          {members.map((member) => {
            const isSelected = activeMember === member.name;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setActiveMember(member.name)}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>{member.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeMember ? (
            <div className="py-10 text-center text-sm text-slate-500">בחר משתתף לצפייה בלו״ז השבועי שלו.</div>
          ) : (
            daysWithEvents.map((day) => (
              <div
                key={day.dateStr}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                  <div className="font-bold text-sm text-slate-800">
                    יום {day.name}
                    <span className="mr-2 text-xs font-normal text-slate-500">
                      ({day.dateStr?.split('-').reverse().slice(0, 2).join('/')})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {day.items.length} פריטים
                  </span>
                </div>

                {day.items.length === 0 ? (
                  <div className="text-xs text-slate-400 py-1">אין אירועים מתוכננים ליום זה.</div>
                ) : (
                  <div className="space-y-2">
                    {day.items.map((item) => {
                      const isCancelled = Boolean(item._isCancelled);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-start justify-between gap-3 rounded-xl border p-2.5 ${
                            isCancelled
                              ? 'border-rose-200 bg-rose-50/70 opacity-80'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-bold ${
                                  isCancelled ? 'line-through text-rose-800' : 'text-slate-800'
                                }`}
                              >
                                {item.title}
                              </span>

                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isCancelled
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {getCategoryName(item.category)}
                              </span>

                              {isCancelled && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                                  <Ban className="h-3 w-3" /> בוטל
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              {item.time && (
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    isCancelled ? 'line-through text-rose-700' : ''
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {item.end_time ? `${item.time} - ${item.end_time}` : item.time}
                                </span>
                              )}
                              {item.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  {item.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}