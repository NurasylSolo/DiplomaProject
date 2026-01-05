import { FloatingShapes, GridPattern } from "@/components/ui/floating-shapes";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        <FloatingShapes variant="minimal" />
        <GridPattern className="opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="authLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="oklch(0.70 0.15 195)" />
                      <stop offset="100%" stopColor="oklch(0.75 0.14 75)" />
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r="20" fill="url(#authLogoGradient)" />
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
                </svg>
              </div>
              <span className="font-display text-2xl font-bold">
                Senti<span className="text-primary">News</span>
              </span>
            </div>
            
            <h1 className="font-display text-4xl xl:text-5xl font-bold mb-4 tracking-tight">
              Media Intelligence
              <br />
              <span className="text-primary">Reimagined</span>
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-md">
              Track brand mentions, analyze sentiment, and gain actionable insights 
              from news and social media in real-time.
            </p>
          </div>
          
          {/* Features list */}
          <div className="space-y-4">
            {[
              "Real-time monitoring across 150+ countries",
              "AI-powered sentiment & emotion analysis",
              "Automated reports and alerts",
              "Multi-language support (EN, RU, KZ)",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
          
          {/* Testimonial */}
          <div className="mt-12 p-6 glass rounded-2xl max-w-md">
            <p className="text-sm italic text-muted-foreground mb-4">
              "Senti News transformed how we monitor our brand reputation. 
              The AI insights are incredibly accurate and save us hours every week."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent" />
              <div>
                <div className="font-medium text-sm">Sarah Chen</div>
                <div className="text-xs text-muted-foreground">PR Director, TechCorp</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

