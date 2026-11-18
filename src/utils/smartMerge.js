/**
 * פונקציה המייצרת את הלו"ז לשבוע חדש מתוך תבנית השגרה,
 * תוך שמירה על אירועים חד-פעמיים קיימים (מיזוג חכם ולא דריסה).
 */
export const generateWeekSchedule = (targetStartDate, routineTemplates, existingEvents = []) => {
    // targetStartDate הוא תאריך ההתחלה של השבוע (יום ראשון) מחרוזת בסגנון YYYY-MM-DD
    const startDate = new Date(targetStartDate);
    const newWeekEvents = [];
  
    // עוברים על 7 ימי השבוע (0 = ראשון, 6 = שבת)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayIndex);
      const dateString = currentDate.toISOString().split('T')[0];
  
      // 1. מוצאים את כל משימות השגרה ששייכות ליום הזה (day_of_week)
      const dayRoutines = routineTemplates.filter(t => t.day_of_week === dayIndex);
  
      // 2. מוצאים אירועים חד-פעמיים או מותאמים שכבר קיימים בתאריך הספציפי הזה
      const existingForDay = existingEvents.filter(e => e.date === dateString);
  
      // 3. מיזוג חכם
      dayRoutines.forEach(routine => {
        // בדיקה האם כבר קיים אירוע שנוצר מהשגרה הזו או מתנגש באותו תאריך ושעה
        const alreadyExists = existingForDay.find(
          e => e.template_id === routine.id || (e.time === routine.time && e.title === routine.title)
        );
  
        if (!alreadyExists) {
          // אם המשימה עדיין לא קיימת בשבוע הזה, ניצור אותה מתוך השגרה
          newWeekEvents.push({
            ...routine,
            id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: dateString,
            template_id: routine.id,
            type: 'routine',
            status: 'active',
            is_modified: false
          });
        }
      });
    }
  
    // מחזירים את האירועים הקיימים (כמו אירועים חד-פעמיים מיוחדים שלא נגענו בהם) יחד עם משימות השגרה החדשות שנוספו
    // אירועים חד-פעמיים שנקבעו מראש נשמרים קומפלט
    const oneOffEvents = existingEvents.filter(e => e.type === 'one-off' || !e.template_id);
    
    // שילוב האירועים החד-פעמיים יחד עם השגרה שעודכנה
    return [...oneOffEvents, ...newWeekEvents];
  };
  
  /**
   * פונקציית עזרה לפורמט תאריך לתצוגה נוחה בעברית
   */
  export const formatDateHe = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('he-IL', options);
  };