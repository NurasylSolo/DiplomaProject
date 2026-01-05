"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "accent" | "rainbow" | "sunset" | "ocean";
  animated?: boolean;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p";
}

const gradients = {
  primary: "from-primary via-primary/80 to-accent",
  accent: "from-accent via-warning to-accent",
  rainbow: "from-chart-1 via-chart-3 to-chart-5",
  sunset: "from-orange-500 via-rose-500 to-purple-500",
  ocean: "from-cyan-400 via-blue-500 to-purple-600",
};

export function GradientText({
  children,
  className,
  variant = "primary",
  animated = false,
  as: Component = "span",
}: GradientTextProps) {
  const gradientClass = cn(
    "bg-clip-text text-transparent bg-gradient-to-r",
    gradients[variant],
    animated && "bg-[length:200%_100%] animate-gradient",
    className
  );

  if (animated) {
    return (
      <motion.span
        className={gradientClass}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
      </motion.span>
    );
  }

  return <Component className={gradientClass}>{children}</Component>;
}

// Animated gradient border wrapper
interface GradientBorderProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  borderWidth?: number;
  animated?: boolean;
}

export function GradientBorder({
  children,
  className,
  containerClassName,
  borderWidth = 1,
  animated = true,
}: GradientBorderProps) {
  return (
    <div 
      className={cn(
        "relative rounded-xl p-[1px]",
        animated && "animate-gradient bg-[length:200%_200%]",
        "bg-gradient-to-r from-primary via-accent to-primary",
        containerClassName
      )}
      style={{ padding: borderWidth }}
    >
      <div className={cn("bg-background rounded-[inherit]", className)}>
        {children}
      </div>
    </div>
  );
}

