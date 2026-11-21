import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Calendar, User, FileText, Trash2, X } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createEmptyTodo } from '../types/models';

export default function TaskTrackerTab({ members }) {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTodo, setCurrentTodo] = useState(createEmptyTodo());
  const [assigneeMode, setAssigneeMode] = useState('');
  const [customAssigneeText, setCustomAssigneeText] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'todos'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodos(list);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching todos:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAddModal = () => {
    const newTodo = createEmptyTodo();
    setCurrentTodo(newTodo);
    setAssigneeMode('');
    setCustomAssigneeText('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (todo) => {
    setCurrentTodo({ ...todo });
    const isCustom = todo.assignee && !members.some(m => m.name === todo.assignee || m.id === todo.assignee);
    setAssigneeMode(isCustom ? 'other' : (todo.assignee || ''));
    setCustomAssigneeText(isCustom ? todo.assignee : '');
    setIsModalOpen(true);
  };

  const handleSaveTodo = async (e) => {
    e.preventDefault();
    const finalAssignee = assigneeMode === 'other' ? customAssigneeText : assigneeMode;
    const updatedTodo = { ...currentTodo, assignee: finalAssignee };

    try {
      await setDoc(doc(db, 'todos', updatedTodo.id), updatedTodo);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving todo:", err);
      alert("שגיאה בשמירת המשימה לענן.");
    }
  };

  const handleToggleStatus = async (todo) => {
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed';
    try {
      await setDoc(doc(db, 'todos', todo.id), { ...todo, status: nextStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!window.confirm('האם למחוק את המשימה?')) return;
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (err) {
      console.error("Error deleting todo:", err);
    }
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'completed' ? 1 : -1;
  });

  return (
    <div className="space-y-4">
      <div className="sticky top-[88px] sm:top-[108px] z-20 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/95 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-2xs backdrop-blur-md">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">ניהול משימות ומעקב</h2>
          <p className="text-xs text-slate-500">רשימת מטלות ומשימות משפחתיות לביצוע</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>משימה חדשה</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
          טוען משימות מהענן...
        </div>
      ) : sortedTodos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">אין משימות כרגע</p>
          <p className="text-xs text-slate-400 mt-1">הוסף משימה חדשה כדי להתחיל לעקוב</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {sortedTodos.map((todo) => {
              const isCompleted = todo.status === 'completed';

              return (
                <div
                  key={todo.id}
                  onClick={() => handleOpenEditModal(todo)}
                  className={`flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50 ${
                    isCompleted ? 'bg-slate-50/60 opacity-60' : ''
                  }`}
                >
                  {/* עמודה 1: המשימה */}
                  <div className="flex items-center gap-3 min-w-[220px] flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(todo);
                      }}
                      className={`shrink-0 rounded-lg p-1 transition-colors ${
                        isCompleted ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'
                      }`}
                      title={isCompleted ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                    >
                      {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>

                    <h3 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {todo.title}
                    </h3>
                  </div>

                  {/* עמודה 2: השם (מבצע) */}
                  <div className="w-32 shrink-0">
                    {todo.assignee && (
                      <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {todo.assignee}
                      </span>
                    )}
                  </div>

                  {/* עמודה 3: התאריך */}
                  <div className="w-40 shrink-0 text-xs text-slate-500 hidden sm:block">
                    {todo.start_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {todo.start_date} {todo.end_date ? `← ${todo.end_date}` : ''}
                      </span>
                    )}
                  </div>

                  {/* עמודה 4: הערות / פרטים */}
                  <div className="flex-1 min-w-0 text-xs text-slate-500 truncate hidden md:block">
                    {todo.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* מודאל הוספה / עריכה */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl transition-all">
            
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-xl font-bold text-slate-800">
                {currentTodo.title ? 'עריכת משימה' : 'הוספת משימה חדשה'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveTodo} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">כותרת המשימה</label>
                <input 
                  type="text"
                  required
                  placeholder="למשל: תיקון ברז במטבח..."
                  value={currentTodo.title}
                  onChange={(e) => setCurrentTodo({ ...currentTodo, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Calendar className="h-4 text-slate-400" /> תאריך התחלה
                  </label>
                  <input 
                    type="date"
                    value={currentTodo.start_date || ''}
                    onChange={(e) => setCurrentTodo({ ...currentTodo, start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Calendar className="h-4 text-slate-400" /> תאריך סיום (אופציונלי)
                  </label>
                  <input 
                    type="date"
                    value={currentTodo.end_date || ''}
                    onChange={(e) => setCurrentTodo({ ...currentTodo, end_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <User className="h-4 text-slate-400" /> מי מבצע?
                </label>
                <select 
                  value={assigneeMode}
                  onChange={(e) => setAssigneeMode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">ללא אחראי...</option>
                  {members.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                  <option value="other">מישהו אחר...</option>
                </select>

                {assigneeMode === 'other' && (
                  <input 
                    type="text"
                    required
                    placeholder="הקלד שם..."
                    value={customAssigneeText}
                    onChange={(e) => setCustomAssigneeText(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">פרטים והערות</label>
                <textarea 
                  rows="3"
                  placeholder="פרטים נוספים..."
                  value={currentTodo.description || ''}
                  onChange={(e) => setCurrentTodo({ ...currentTodo, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                {currentTodo.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTodo(currentTodo.id);
                      setIsModalOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> מחיקת משימה
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 bg-white border border-slate-200"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                  >
                    שמור משימה
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}