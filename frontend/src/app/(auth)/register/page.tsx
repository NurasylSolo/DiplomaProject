"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegister } from "@/hooks";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
  });
  
  const password = watch("password");
  const acceptTerms = watch("acceptTerms");
  const isLoading = registerMutation.isPending;
  
  const onSubmit = async (data: RegisterFormData) => {
    registerMutation.mutate(
      { name: data.name, email: data.email, password: data.password },
      {
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  // Password strength checker
  const getPasswordStrength = (pass: string) => {
    const checks = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return { checks, score };
  };
  
  const { checks, score } = getPasswordStrength(password || "");
  
  const strengthColors = {
    0: "bg-muted",
    1: "bg-destructive",
    2: "bg-orange-500",
    3: "bg-yellow-500",
    4: "bg-green-500",
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="mobileLogo2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.70 0.15 195)" />
                  <stop offset="100%" stopColor="oklch(0.75 0.14 75)" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="url(#mobileLogo2)" />
              <path
                d="M16 30C16 30 19 26 24 26C29 26 32 22 32 18"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="font-display text-xl font-bold">
            Senti<span className="text-primary">News</span>
          </span>
        </div>
        
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Start your 14-day free trial. No credit card required.
        </p>
      </motion.div>
      
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isLoading}
            className="h-12"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </motion.div>
        
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="email">Work Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            disabled={isLoading}
            className="h-12"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </motion.div>
        
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={isLoading}
              className="h-12 pr-12"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {password && (
            <div className="space-y-3 pt-1">
              {/* Strength bar */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      score >= level ? strengthColors[score as keyof typeof strengthColors] : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              
              {/* Requirements list */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <PasswordRequirement met={checks.length} label="8+ characters" />
                <PasswordRequirement met={checks.uppercase} label="Uppercase" />
                <PasswordRequirement met={checks.lowercase} label="Lowercase" />
                <PasswordRequirement met={checks.number} label="Number" />
              </div>
            </div>
          )}
          
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setValue("acceptTerms", !!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:text-primary/80">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:text-primary/80">
              Privacy Policy
            </Link>
          </Label>
        </motion.div>
        {errors.acceptTerms && (
          <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
        )}
        
        <motion.div variants={itemVariants}>
          <Button 
            type="submit" 
            className="w-full h-12 text-base glow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </form>
      
      {/* Divider */}
      <motion.div variants={itemVariants} className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </motion.div>
      
      {/* Social login */}
      <motion.div variants={itemVariants}>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full h-12"
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </motion.div>
      
      {/* Sign in link */}
      <motion.p 
        variants={itemVariants}
        className="text-center text-sm text-muted-foreground"
      >
        Already have an account?{" "}
        <Link 
          href="/login" 
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

// Password requirement component
function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
          met ? "bg-green-500" : "bg-muted"
        }`}
      >
        {met && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className={met ? "text-muted-foreground" : "text-muted-foreground/50"}>
        {label}
      </span>
    </div>
  );
}

