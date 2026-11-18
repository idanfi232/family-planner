import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Users, Tag, RefreshCw } from 'lucide-react';
import { DAYS_OF_WEEK, EVENT_CATEGORIES } from '../types/models';

export default function TaskModal({ isOpen, onClose, onSave, onDelete, initialTask, members }) {
  const [task, setTask] = useState(initialTask);
  const [updateAllFuture, setUpdateAllFuture] = useState(false);
  
  const isCustomAssignee = initialTask?.assignee && !members.some(m => m.name === initialTask.assignee || m.id === initialTask.assignee);
  const [customAssigneeText, setCustomAssigneeText] = useState(isCustomAssignee ? initialTask.assignee : '');
  const [assigneeMode, setAssigneeMode] = useState(isCustomAssignee ? 'other' : (initialTask?.assignee || ''));

  useEffect(() => {
    // סינון החוצה של שמות ישנים באנגלית או מזהים שאינם קיימים ברשימת המשתתפים הנוכחית
    const validMembers = members.map(m => m.name);
    const cleanedAffected = (initialTask?.affected_members || []).filter(name => validMembers.includes(name));

    setTask({ ...initialTask, affected_members: cleanedAffected });
    setUpdateAllFuture(false);
    
    const custom = initialTask?.assignee && !members.some(m => m.name === initialTask.assignee || m.id === initialTask.assignee);
    setAssigneeMode(custom ? 'other' : (initialTask?.assignee || ''));
    setCustomAssigneeText(custom ? initialTask.assignee : '');
  }, [initialTask, members]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalAssignee = assigneeMode === 'other' ? customAssigneeText : assigneeMode;
    const editScope = updateAllFuture ? 'template' : 'instance';
    onSave({ ...task, assignee: finalAssignee }, editScope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl transition-all">
        
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-xl font-bold text-slate-800">
            {task.id && task.title ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
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
              placeholder="למשל: אימון כדורגל, ארוחת ערב..."
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
                value={task.category || 'event'}
                onChange={(e) => setTask({ ...task, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
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

          {task.type === 'routine' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700">יום בשבוע</label>
              <select 
                value={task.day_of_week}
                onChange={(e) => setTask({ ...task, day_of_week: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.id} value={day.id}>{day.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700">תאריך מדויק</label>
              <input 
                type="date"
                value={task.date || ''}
                onChange={(e) => setTask({ ...task, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
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
                onChange={(e) => setTask({ ...task, time: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Clock className="h-4 text-slate-400" /> שעת סיום
              </label>
              <input 
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
              placeholder="למשל: ספורטק, בית ספר..."
              value={task.location || ''}
              onChange={(e) => setTask({ ...task, location: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <User className="h-4 text-slate-400" /> מי מבצע?
              </label>
              <select 
                value={assigneeMode}
                onChange={(e) => setAssigneeMode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">בחר מבצע...</option>
                {members.map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
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
                {members.map(member => {
                  const isSelected = task.affected_members?.includes(member.name);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        const current = task.affected_members || [];
                        const updated = isSelected 
                          ? current.filter(name => name !== member.name)
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

        {/* חלק תחתון קבוע עם אופציית שגרה (טקסט קודם, תיבה קרוב לשמירה) וכפתורי שמירה */}
        <div className="border-t bg-slate-50 px-6 py-4 rounded-b-2xl space-y-3">
          {task.template_id && (
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
            ) : <div />}

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
                שמור אירוע
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}