import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';

export const [SidebarProvider, useSidebar] = createContextHook(() => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, openSidebar, closeSidebar };
});
