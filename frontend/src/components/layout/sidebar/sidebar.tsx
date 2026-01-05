"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores";
import { useTranslation } from "@/hooks";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getSidebarData, type SidebarItem, type SidebarSection } from "./sidebar-data";

interface SidebarProps {
  projectId: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebarStore();
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  
  const sidebarData = getSidebarData(projectId, t);
  
  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [pathname, isMobile, setMobileOpen]);
  
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" showText={!isCollapsed} animated={false} />
        </Link>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
        <nav className="space-y-6 px-3">
          {sidebarData.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section Title */}
              <AnimatePresence>
                {section.title && !isCollapsed && (
                  <motion.h4
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider"
                  >
                    {section.title}
                  </motion.h4>
                )}
              </AnimatePresence>
              
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      
      {/* Collapse Toggle */}
      {!isMobile && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full justify-center h-9",
              "text-sidebar-foreground/60 hover:text-sidebar-foreground",
              "hover:bg-sidebar-accent"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">{t("common.collapse", { defaultValue: "Collapse" })}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
  
  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col h-full">
              {sidebarContent}
            </div>
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    );
  }
  
  // Desktop: Fixed sidebar
  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-300 ease-in-out",
          "hidden lg:flex"
        )}
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
      >
        {sidebarContent}
      </motion.aside>
    </TooltipProvider>
  );
}

// Sidebar Nav Item Component
interface SidebarNavItemProps {
  item: SidebarItem;
  pathname: string;
  isCollapsed: boolean;
}

function SidebarNavItem({ item, pathname, isCollapsed }: SidebarNavItemProps) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "transition-all duration-200",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground",
        "hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        isActive && "shadow-sm",
        isCollapsed && "justify-center px-0"
      )}
    >
      <div className={cn(
        "flex items-center justify-center",
        isActive && "text-sidebar-primary"
      )}>
        <Icon className="h-5 w-5 flex-shrink-0" />
      </div>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      
      {/* Badge */}
      {!isCollapsed && item.badge && (
        <Badge 
          variant="secondary" 
          className="ml-auto text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary"
        >
          {item.badge}
        </Badge>
      )}
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 w-1 h-6 bg-sidebar-primary rounded-r-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
  
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {item.badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return <div className="relative">{content}</div>;
}

