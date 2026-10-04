// HISTORY_DATA no longer imported statically, we pass it dynamically from DatabaseContext

export function getWeeklyChartData(historyData: any[]) {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const today = new Date();
  
  // Create buckets for the last 7 days (ending today)
  const buckets: { dateStr: string; day: string; total: number; healthy: number }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push({
      dateStr: d.toDateString(), 
      day: dayNames[d.getDay()],
      total: 0,
      healthy: 0
    });
  }

  const safeHistory = Array.isArray(historyData) ? historyData : [];
  safeHistory.forEach(item => {
    let d = new Date();
    if (item.createdAt) {
      d = new Date(item.createdAt);
    } else if (item.date && item.date.startsWith('Hari ini')) {
      d = new Date();
    } else if (item.date && item.date.startsWith('Kemarin')) {
      d.setDate(d.getDate() - 1);
    } else if (item.date) {
      const datePart = item.date.split(',')[0]; 
      d = new Date(datePart);
    }
    
    // Find the matching bucket
    const bucket = buckets.find(b => b.dateStr === d.toDateString());
    if (bucket) {
      bucket.total += 1;
      if (item.result === 'SEHAT') {
        bucket.healthy += 1;
      }
    }
  });

  return buckets.map(b => ({
    day: b.day,
    total: b.total,
    healthy: b.healthy
  }));
}
