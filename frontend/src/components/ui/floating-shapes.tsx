"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks";

interface FloatingShapesProps {
  className?: string;
  variant?: "default" | "minimal" | "dense";
}

export function FloatingShapes({ 
  className = "", 
  variant = "default" 
}: FloatingShapesProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  if (prefersReducedMotion) {
    return null;
  }
  
  const shapes = variant === "minimal" ? minimalShapes : 
                 variant === "dense" ? denseShapes : defaultShapes;
  
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className={shape.className}
          initial={shape.initial}
          animate={shape.animate}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: shape.delay,
          }}
        />
      ))}
    </div>
  );
}

const defaultShapes = [
  {
    className: "absolute w-72 h-72 rounded-full bg-primary/5 blur-3xl",
    initial: { x: "10%", y: "20%", scale: 1 },
    animate: { x: "15%", y: "25%", scale: 1.1 },
    duration: 8,
    delay: 0,
  },
  {
    className: "absolute w-96 h-96 rounded-full bg-accent/5 blur-3xl",
    initial: { x: "70%", y: "10%", scale: 1 },
    animate: { x: "65%", y: "15%", scale: 1.15 },
    duration: 10,
    delay: 1,
  },
  {
    className: "absolute w-64 h-64 rounded-full bg-chart-2/5 blur-3xl",
    initial: { x: "50%", y: "60%", scale: 1 },
    animate: { x: "55%", y: "65%", scale: 1.2 },
    duration: 12,
    delay: 2,
  },
  {
    className: "absolute w-48 h-48 rounded-full bg-primary/8 blur-2xl",
    initial: { x: "80%", y: "70%", scale: 1 },
    animate: { x: "75%", y: "75%", scale: 1.1 },
    duration: 9,
    delay: 0.5,
  },
];

const minimalShapes = [
  {
    className: "absolute w-96 h-96 rounded-full bg-primary/3 blur-3xl",
    initial: { x: "20%", y: "30%", scale: 1 },
    animate: { x: "25%", y: "35%", scale: 1.05 },
    duration: 15,
    delay: 0,
  },
  {
    className: "absolute w-80 h-80 rounded-full bg-accent/3 blur-3xl",
    initial: { x: "60%", y: "50%", scale: 1 },
    animate: { x: "65%", y: "55%", scale: 1.08 },
    duration: 18,
    delay: 2,
  },
];

const denseShapes = [
  ...defaultShapes,
  {
    className: "absolute w-32 h-32 rounded-full bg-chart-3/10 blur-2xl",
    initial: { x: "30%", y: "40%", scale: 1 },
    animate: { x: "35%", y: "45%", scale: 1.3 },
    duration: 7,
    delay: 1.5,
  },
  {
    className: "absolute w-40 h-40 rounded-full bg-chart-4/8 blur-2xl",
    initial: { x: "20%", y: "70%", scale: 1 },
    animate: { x: "25%", y: "75%", scale: 1.2 },
    duration: 11,
    delay: 3,
  },
];

// Grid pattern background
export function GridPattern({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, oklch(0.70 0.15 195 / 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, oklch(0.70 0.15 195 / 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

// Dot pattern background
export function DotPattern({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `radial-gradient(oklch(0.70 0.15 195 / 0.08) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    />
  );
}

