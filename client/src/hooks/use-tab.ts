import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface Tab {
  id: string;
  title: string;
  path: string;
}

export function useTab() {
  const [location] = useLocation();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  
  // Initialize with default home tab if no tabs exist
  useEffect(() => {
    if (tabs.length === 0) {
      const homeTab = { id: "home", title: "لوحة التحكم", path: "/" };
      setTabs([homeTab]);
      setActiveTab("home");
    }
  }, [tabs.length]);
  
  // Update active tab when location changes
  useEffect(() => {
    const matchingTab = tabs.find(tab => tab.path === location);
    
    if (matchingTab) {
      setActiveTab(matchingTab.id);
    } else if (location !== '/' && tabs.length > 0) {
      // If we're on a new path that doesn't have a tab yet,
      // we should add a tab for it with a default title
      let tabTitle = "صفحة جديدة";
      
      switch (location) {
        case "/accounts":
          tabTitle = "الحسابات";
          break;
        case "/finance":
          tabTitle = "المعاملات المالية";
          break;
        case "/settings":
          tabTitle = "إعداد سهل";
          break;
        case "/backup":
          tabTitle = "عمل نسخة احتياطية";
          break;
        case "/restore":
          tabTitle = "استرجاع نسخة احتياطية";
          break;
        case "/import":
          tabTitle = "استيراد بيانات";
          break;
      }
      
      addTab(tabTitle, location);
    }
  }, [location, tabs]);
  
  // Add a new tab
  const addTab = (title: string, path: string) => {
    const id = `tab-${Date.now()}`;
    const newTab = { id, title, path };
    
    // Check if we already have a tab for this path
    const existingTabIndex = tabs.findIndex(tab => tab.path === path);
    
    if (existingTabIndex !== -1) {
      // If we do, just activate it
      setActiveTab(tabs[existingTabIndex].id);
    } else {
      // Otherwise add the new tab and activate it
      setTabs(prev => [...prev, newTab]);
      setActiveTab(id);
    }
  };
  
  // Remove a tab
  const removeTab = (id: string) => {
    // Find the tab to remove
    const tabToRemove = tabs.find(tab => tab.id === id);
    
    // Don't remove if it's the last tab
    if (tabs.length <= 1) {
      return;
    }
    
    // Remove the tab
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    
    // If we removed the active tab, activate another one
    if (id === activeTab) {
      // Prefer to activate the tab to the left
      const index = tabs.findIndex(tab => tab.id === id);
      const newActiveIndex = Math.max(0, index - 1);
      setActiveTab(newTabs[newActiveIndex].id);
      
      // Also navigate to the new active tab's path
      const newActivePath = newTabs[newActiveIndex].path;
      window.history.pushState(null, "", newActivePath);
    }
  };
  
  return {
    tabs,
    activeTab,
    addTab,
    removeTab,
    setActiveTab,
  };
}
