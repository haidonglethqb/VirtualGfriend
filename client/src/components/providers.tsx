'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore, Language } from '@/store/language-store';
import api from '@/services/api';

function AuthInitializer({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sync language from server after auth resolves
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    api.get<{ language?: string }>('/users/settings').then((res) => {
      const lang = res.data?.language;
      if (lang === 'vi' || lang === 'en') {
        setLanguage(lang as Language);
      }
    }).catch(() => {});
  }, [isAuthenticated, isLoading, setLanguage]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
      <Toaster />
    </QueryClientProvider>
  );
}
