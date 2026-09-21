'use client';

import { useToast } from '@/hooks/use-toast';

export function useAppToast() {
  const { toast } = useToast();

  return {
    success: (message: string) =>
      toast({ title: 'تم بنجاح', description: message }),
    error: (message: string) =>
      toast({ title: 'خطأ', description: message, variant: 'destructive' }),
    info: (message: string) =>
      toast({ title: 'تنبيه', description: message }),
  };
}
