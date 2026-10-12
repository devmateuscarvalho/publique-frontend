import { toast } from "sonner";

/** Stable ids so autosave / rapid updates replace instead of stacking. */
export const appToast = {
  success(message: string, id?: string) {
    toast.success(message, id ? { id } : undefined);
  },
  error(message: string, id?: string) {
    toast.error(message, id ? { id } : undefined);
  },
  info(message: string, id?: string) {
    toast(message, id ? { id } : undefined);
  },
};
