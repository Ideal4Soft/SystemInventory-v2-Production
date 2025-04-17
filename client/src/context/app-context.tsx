import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  fullName?: string;
  role?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  authenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isRTL: boolean;
  setIsRTL: (isRTL: boolean) => void;
}

const defaultContext: AppContextType = {
  user: null,
  setUser: () => {},
  authenticated: false,
  setAuthenticated: () => {},
  companyName: "شركة الريادي لتوزيع المواد الغذائية",
  setCompanyName: () => {},
  loading: false, 
  setLoading: () => {},
  isRTL: true,
  setIsRTL: () => {},
};

const AppContext = createContext<AppContextType>(defaultContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>({
    id: 1,
    username: "test",
    fullName: "Test User",
    role: "admin"
  });
  const [authenticated, setAuthenticated] = useState(true);
  const [companyName, setCompanyName] = useState("شركة الريادي لتوزيع المواد الغذائية");
  const [loading, setLoading] = useState(false);
  const [isRTL, setIsRTL] = useState(true);
  
  // Fetch settings to get company name
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: authenticated,
  });
  
  // Update company name when settings are fetched
  useEffect(() => {
    if (settings?.companyName) {
      setCompanyName(settings.companyName);
    }
  }, [settings]);
  
  // Set RTL direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [isRTL]);
  
  const value = {
    user,
    setUser,
    authenticated,
    setAuthenticated,
    companyName,
    setCompanyName,
    loading,
    setLoading,
    isRTL,
    setIsRTL,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
