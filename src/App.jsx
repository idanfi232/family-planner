) : (
  <div className="max-w-xl mx-auto">
    {/* סרגל ניווט עליון שכולל יום קודם, תאריך אמצעי, ויום הבא */}
    <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
      <button
        onClick={() => setSelectedDayIndex(prev => (prev > 0 ? prev - 1 : 6))}
        className="rounded-xl px-3 py-1.5 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 flex items-center gap-1"
      >
        <ChevronRight className="h-4 w-4" /> יום קודם
      </button>
      <div className="text-center">
        <h2 className="text-sm font-bold text-slate-800">יום {weekDays[selectedDayIndex].name}</h2>
        <span className="text-xs text-slate-400">{formatShort(weekDays[selectedDayIndex].dateStr)}</span>
      </div>
      <button
        onClick={() => setSelectedDayIndex(prev => (prev < 6 ? prev + 1 : 0))}
        className="rounded-xl px-3 py-1.5 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 flex items-center gap-1"
      >
        יום הבא <ChevronLeft className="h-4 w-4" />
      </button>
    </div>

    {/* עמודת היום ללא כותרת פנימית מיותרת */}
    <DayColumn
      dayName={weekDays[selectedDayIndex].name}
      dateStr={weekDays[selectedDayIndex].dateStr}
      tasks={weekDays[selectedDayIndex].tasks}
      members={members}
      onAddTask={() => handleOpenAddModal(weekDays[selectedDayIndex].id, weekDays[selectedDayIndex].dateStr)}
      onEditTask={handleOpenEditModal}
      hideHeader={true}
    />
  </div>
)