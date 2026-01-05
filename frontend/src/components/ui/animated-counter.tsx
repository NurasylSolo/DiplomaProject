"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 2,
  delay = 0,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });
  
  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });
  
  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
      }, delay * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isInView, hasAnimated, value, spring, delay]);
  
  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

// Compact number display (e.g., 1.2M, 500K)
interface CompactCounterProps extends Omit<AnimatedCounterProps, "decimals"> {
  compact?: boolean;
}

export function CompactCounter({
  value,
  compact = true,
  ...props
}: CompactCounterProps) {
  const formatCompact = (num: number): { value: number; suffix: string; decimals: number } => {
    if (!compact || num < 1000) {
      return { value: num, suffix: "", decimals: 0 };
    }
    if (num < 1000000) {
      return { value: num / 1000, suffix: "K", decimals: 1 };
    }
    if (num < 1000000000) {
      return { value: num / 1000000, suffix: "M", decimals: 1 };
    }
    return { value: num / 1000000000, suffix: "B", decimals: 2 };
  };
  
  const { value: displayValue, suffix, decimals } = formatCompact(value);
  
  return (
    <AnimatedCounter
      value={displayValue}
      suffix={suffix + (props.suffix || "")}
      decimals={decimals}
      {...props}
    />
  );
}

