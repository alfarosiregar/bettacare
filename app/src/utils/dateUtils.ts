const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Memformat tanggal riwayat diagnosis secara ramah manusia (human-readable)
 * berdasarkan waktu kapan diagnosis dilakukan (createdAt).
 *
 * Contoh hasil:
 * - "Hari ini, 14:30 WIB" (jika diagnosis dilakukan di hari yang sama)
 * - "Kemarin, 09:15 WIB" (jika diagnosis dilakukan kemarin)
 * - "28 Mei, 14:20 WIB" (jika di tahun yang sama)
 * - "15 Des 2025, 10:00 WIB" (jika di tahun berbeda)
 */
export function formatHistoryDate(createdAt?: string | number | Date | null, fallbackDate?: string): string {
  if (!createdAt && fallbackDate) {
    return fallbackDate;
  }

  const dateObj = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(dateObj.getTime())) {
    return fallbackDate || 'Hari ini';
  }

  const now = new Date();
  const isSameYear = now.getFullYear() === dateObj.getFullYear();
  const isToday =
    isSameYear &&
    now.getMonth() === dateObj.getMonth() &&
    now.getDate() === dateObj.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === dateObj.getFullYear() &&
    yesterday.getMonth() === dateObj.getMonth() &&
    yesterday.getDate() === dateObj.getDate();

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes} WIB`;

  if (isToday) {
    return `Hari ini, ${timeStr}`;
  }

  if (isYesterday) {
    return `Kemarin, ${timeStr}`;
  }

  const day = dateObj.getDate();
  const monthName = MONTH_NAMES_ID[dateObj.getMonth()];

  if (isSameYear) {
    return `${day} ${monthName}, ${timeStr}`;
  }

  return `${day} ${monthName} ${dateObj.getFullYear()}, ${timeStr}`;
}
