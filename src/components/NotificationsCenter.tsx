"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Award,
  Package,
  BookOpen
} from "lucide-react";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: "warning" | "error" | "info" | "success";
  category: "checklist" | "nc" | "plan" | "document" | "occurrence" | "inventory" | "training";
  createdAt: string;
  critical: boolean;
  linkToTab: string;
}

interface NotificationsCenterProps {
  notifications: AppNotification[];
  readNotificationIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
  setActiveTab: (tab: any) => void;
}

export default function NotificationsCenter({
  notifications,
  readNotificationIds,
  onMarkAsRead,
  onMarkAllAsRead,
  setActiveTab
}: NotificationsCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (n: AppNotification) => {
    onMarkAsRead(n.id);
    setIsOpen(false);
    setActiveTab(n.linkToTab);
  };

  const getCategoryIcon = (category: AppNotification["category"], type: AppNotification["type"]) => {
    const className = `w-4 h-4 ${
      type === "error" ? "text-rose-600" : type === "warning" ? "text-amber-500" : "text-blue-500"
    }`;

    switch (category) {
      case "checklist":
        return <ClipboardCheck className={className} />;
      case "nc":
        return <AlertTriangle className={className} />;
      case "plan":
        return <Calendar className={className} />;
      case "document":
        return <FileText className={className} />;
      case "occurrence":
        return <Layers className={className} />;
      case "inventory":
        return <Package className={className} />;
      case "training":
        return <BookOpen className={className} />;
      default:
        return <Bell className={className} />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = new Date().getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Agora mesmo";
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      if (diffDays === 1) return "Ontem";
      return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    } catch {
      return "Recente";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-full transition-all relative flex items-center justify-center focus:outline-none"
        title="Notificações"
      >
        <Bell className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-black text-white items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scaleUp text-xs font-semibold text-slate-700">
          
          {/* Header */}
          <div className="px-5 py-4 bg-[#131b2e] text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="font-extrabold uppercase tracking-wider text-xs">Alertas & Pendências</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => onMarkAllAsRead(unreadNotifications.map(n => n.id))}
                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors font-bold"
              >
                Limpar Todos ({unreadCount})
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100 shadow-inner">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 text-sm">Tudo em ordem!</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Nenhum desvio ou alerta pendente no momento.</p>
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readNotificationIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-5 py-4 flex gap-3.5 hover:bg-slate-50 transition-all cursor-pointer relative group ${
                      !isRead ? "bg-slate-50/50" : ""
                    }`}
                  >
                    {/* Left Border Accent for critical/unread alerts */}
                    {!isRead && (
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${
                        n.type === "error" ? "bg-rose-600" : n.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                    )}

                    {/* Icon Container */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      n.type === "error"
                        ? "bg-rose-50 border-rose-100/70"
                        : n.type === "warning"
                        ? "bg-amber-50 border-amber-100/70"
                        : "bg-blue-50 border-blue-100/70"
                    }`}>
                      {getCategoryIcon(n.category, n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors ${
                          !isRead ? "font-black" : "opacity-80"
                        }`}>
                          {n.title}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-normal text-slate-500 font-medium ${
                        !isRead ? "text-slate-600 font-semibold" : "opacity-75"
                      }`}>
                        {n.description}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer banner */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
            Exibindo desvios operacionais reais do Supabase
          </div>
        </div>
      )}
    </div>
  );
}
