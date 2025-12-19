import { create } from 'zustand';

interface LoadingState {
 [key: string]: boolean;
}

interface Toast {
 id: string;
 title?: string;
 description?: string;
 variant?: 'default' | 'destructive' | 'success';
 duration?: number;
}

interface UIState {
 sidebarOpen: boolean;
 loadingStates: LoadingState;
 toasts: Toast[];
 activeModal: string | null;

 // Sidebar
 toggleSidebar: () => void;
 setSidebarOpen: (open: boolean) => void;

 // Loading states
 setLoading: (key: string, loading: boolean) => void;
 isLoading: (key: string) => boolean;

 // Toasts
 showToast: (toast: Omit<Toast, 'id'>) => void;
 dismissToast: (id: string) => void;
 clearToasts: () => void;

 // Modals
 openModal: (modalId: string) => void;
 closeModal: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
 sidebarOpen: true,
 loadingStates: {},
 toasts: [],
 activeModal: null,

 toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

 setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

 setLoading: (key: string, loading: boolean) =>
 set((state) => ({
 loadingStates: {
 ...state.loadingStates,
 [key]: loading,
 },
 })),

 isLoading: (key: string) => {
 const state = get();
 return state.loadingStates[key] || false;
 },

 showToast: (toast: Omit<Toast, 'id'>) =>
 set((state) => ({
 toasts: [
 ...state.toasts,
 {
 ...toast,
 id: `toast-${++toastCounter}`,
 },
 ],
 })),

 dismissToast: (id: string) =>
 set((state) => ({
 toasts: state.toasts.filter((toast) => toast.id !== id),
 })),

 clearToasts: () => set({ toasts: [] }),

 openModal: (modalId: string) => set({ activeModal: modalId }),

 closeModal: () => set({ activeModal: null }),
}));
