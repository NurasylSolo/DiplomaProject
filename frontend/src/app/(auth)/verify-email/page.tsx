"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/services";
import { getErrorMessage } from "@/lib/api";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const handleVerify = useCallback(
    async (fullCode: string) => {
      if (!email) {
        toast.error("Missing email — please go back and try again.");
        return;
      }
      setIsVerifying(true);
      try {
        await authApi.verifyEmail(email, fullCode);
        toast.success("Email verified! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 600);
      } catch (error) {
        toast.error(getErrorMessage(error));
        // Reset on failure so user can re-type.
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [email, router]
  );

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;
    const next = [...code];
    next[index] = cleaned.slice(-1);
    setCode(next);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    const fullCode = next.join("");
    if (fullCode.length === 6 && next.every((c) => c)) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    if (pasted.length === 6) {
      handleVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success("New code sent — check your inbox.");
      setResendCooldown(60);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Verify your email
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            We sent a 6-digit code to{" "}
            <span className="text-foreground font-medium">{email || "your email"}</span>.
            Enter it below to continue.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isVerifying}
              className="h-14 w-12 sm:w-14 text-center text-xl font-semibold"
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="text-sm"
          >
            {isResending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code"}
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to sign in
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>
          Code expires in 10 minutes. Check your spam folder if you don't see it.
        </span>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
