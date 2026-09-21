export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' ريال';
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar').format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function generateReference(prefix: string = 'TX'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateCardCode(): string {
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let seg = '';
    for (let i = 0; i < 5; i++) {
      seg += Math.floor(Math.random() * 36).toString(36).toUpperCase();
    }
    segments.push(seg);
  }
  return segments.join('-');
}

export function generateTrackingNumber(): string {
  return 'TK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export const PAYMENT_METHODS = [
  { id: 'kuraimi', name: 'بنك الكريمي', icon: '🏦', color: 'from-blue-600 to-blue-800' },
  { id: 'amqi', name: 'بنك العمقي', icon: '🏦', color: 'from-emerald-600 to-emerald-800' },
  { id: 'qatibi', name: 'بنك القطيبي', icon: '🏦', color: 'from-amber-600 to-amber-800' },
  { id: 'inma', name: 'بنك الإنماء', icon: '🏦', color: 'from-teal-600 to-teal-800' },
] as const;

export const NETWORK_NAMES = ['5G-NET', 'al-alam-net', 'tawfeer-Net'] as const;

export const TRANSACTION_STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'قيد المعالجة', color: 'text-warning', dot: 'bg-warning' },
  success: { label: 'ناجحة', color: 'text-success', dot: 'bg-success' },
  failed: { label: 'فاشلة', color: 'text-destructive', dot: 'bg-destructive' },
  cancelled: { label: 'ملغاة', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  refunded: { label: 'مستردة', color: 'text-primary', dot: 'bg-primary' },
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'شراء',
  exchange: 'مبادلة',
  gift_sent: 'إرسال هدية',
  gift_received: 'استلام هدية',
  refund: 'استرداد',
};

export const GIFT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'متاحة للمبادلة', color: 'text-success' },
  used: { label: 'مستخدمة', color: 'text-muted-foreground' },
  expired: { label: 'منتهية', color: 'text-destructive' },
};
