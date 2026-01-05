"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animated?: boolean;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
  xl: { icon: 48, text: "text-3xl" },
};

export function Logo({ 
  className, 
  size = "md", 
  showText = true,
  animated = true 
}: LogoProps) {
  const { icon, text } = sizes[size];
  
  const Wrapper = animated ? motion.div : "div";
  const wrapperProps = animated ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  } : {};
  
  return (
    <Wrapper
      className={cn("flex items-center gap-2.5", className)}
      {...wrapperProps}
    >
      {/* Logo Icon */}
      <div className="relative">
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.70 0.15 195)" />
              <stop offset="50%" stopColor="oklch(0.65 0.17 180)" />
              <stop offset="100%" stopColor="oklch(0.75 0.14 75)" />
            </linearGradient>
            <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.70 0.15 195 / 0.3)" />
              <stop offset="100%" stopColor="oklch(0.75 0.14 75 / 0.1)" />
            </linearGradient>
          </defs>
          
          {/* Outer glow ring */}
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="url(#pulseGradient)"
            className="animate-pulse"
            style={{ animationDuration: "3s" }}
          />
          
          {/* Main circle */}
          <circle cx="24" cy="24" r="20" fill="url(#logoGradient)" />
          
          {/* Stylized "S" wave for Senti */}
          <path
            d="M16 30C16 30 19 26 24 26C29 26 32 22 32 18"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M16 18C16 18 19 22 24 22C29 22 32 26 32 30"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          
          {/* Accent dots */}
          <circle cx="16" cy="18" r="2" fill="white" />
          <circle cx="32" cy="30" r="2" fill="white" />
        </svg>
        
        {/* Ambient glow */}
        {animated && (
          <div 
            className="absolute inset-0 blur-xl opacity-40"
            style={{
              background: "radial-gradient(circle, oklch(0.70 0.15 195 / 0.5) 0%, transparent 70%)"
            }}
          />
        )}
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className={cn("font-display font-bold tracking-tight", text)}>
          <span className="text-foreground">Senti</span>
          <span className="text-primary">News</span>
        </div>
      )}
    </Wrapper>
  );
}

