) : (
  <div className="max-w-xl mx-auto">
    <div className="flex items-center justify-between mb-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
      <button
        onClick={() => setSelectedDayIndex(prev => (prev > 0 ? prev - 1 : 6))}
        className="rounded-xl px-3 py-1.5 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 flex items-center gap-1"
      >
        <ChevronRight className="h-4 w-4" /> יום קודם
      </button>
      <button
        onClick={() => setSelectedDayIndex(prev => (prev < 6 ? prev + 1 : 0))}
        className="rounded-xl px-3 py-1.5 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 flex items-center gap-1"
      >
        יום הבא <ChevronLeft className="h-4 w-4" />
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