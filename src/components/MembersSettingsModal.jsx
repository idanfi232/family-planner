import React, { useState } from 'react';
import { X, Plus, Trash2, User } from 'lucide-react';

export default function MembersSettingsModal({ isOpen, onClose, members, onAddMember, onDeleteMember }) {
  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddMember(newName.trim());
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">ניהול משתתפים במשפחה</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="שם משתתף חדש (למשל: מרי)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> הוסף
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <User className="h-4 w-4 text-blue-600" /> {member.name}
                </span>
                <button
                  onClick={() => onDeleteMember(member.id)}
                  className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                  title="מחק משתתף"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t bg-slate-50 px-6 py-3 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            סיום
          </button>
        </div>
      </div>
    </div>
  );
}