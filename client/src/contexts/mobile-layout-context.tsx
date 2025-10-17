import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MobileLayoutContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isConversationListOpen: boolean;
  isContactDetailsOpen: boolean;
  setConversationListOpen: (open: boolean) => void;
  setContactDetailsOpen: (open: boolean) => void;
  toggleConversationList: () => void;
  toggleContactDetails: () => void;
  closeAllPanels: () => void;
}

const MobileLayoutContext = createContext<MobileLayoutContextType | undefined>(undefined);

interface MobileLayoutProviderProps {
  children: ReactNode;
}

export function MobileLayoutProvider({ children }: MobileLayoutProviderProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;



      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsDesktop(desktop);


      if (mobile) {
        setIsConversationListOpen(false);
        setIsContactDetailsOpen(false);
      } else if (desktop) {

        setIsConversationListOpen(true);
        setIsContactDetailsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const setConversationListOpen = (open: boolean) => {
    setIsConversationListOpen(open);

    if (open && isMobile) {
      setIsContactDetailsOpen(false);
    }
  };

  const setContactDetailsOpen = (open: boolean) => {
    setIsContactDetailsOpen(open);

    if (open && isMobile) {
      setIsConversationListOpen(false);
    }
  };

  const toggleConversationList = () => {
    setConversationListOpen(!isConversationListOpen);
  };

  const toggleContactDetails = () => {
    setContactDetailsOpen(!isContactDetailsOpen);
  };

  const closeAllPanels = () => {
    setIsConversationListOpen(false);
    setIsContactDetailsOpen(false);
  };

  const value: MobileLayoutContextType = {
    isMobile,
    isTablet,
    isDesktop,
    isConversationListOpen,
    isContactDetailsOpen,
    setConversationListOpen,
    setContactDetailsOpen,
    toggleConversationList,
    toggleContactDetails,
    closeAllPanels,
  };

  return (
    <MobileLayoutContext.Provider value={value}>
      {children}
    </MobileLayoutContext.Provider>
  );
}

export function useMobileLayout() {
  const context = useContext(MobileLayoutContext);
  if (context === undefined) {
    throw new Error('useMobileLayout must be used within a MobileLayoutProvider');
  }
  return context;
}
