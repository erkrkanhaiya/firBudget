
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { NotificationItem, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (details: { title: string; message: string; type: NotificationType; href?: string }) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void; 
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_NOTIFICATIONS = 10; // Keep only the N most recent notifications

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((details: { title: string; message: string; type: NotificationType; href?: string }) => {
    const newNotification: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: details.title,
      message: details.message,
      type: details.type,
      href: details.href,
      time: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]); 
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, clearAllNotifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
