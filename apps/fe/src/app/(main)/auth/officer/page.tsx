import { Suspense } from "react";

import { LoginForm } from "../_components/login-form";

export default function OfficerLoginPage() {
  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-5 sm:max-w-[500px]">
      <div className="flex w-full flex-col gap-5 rounded-[20px] border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6 text-cyan-600 dark:text-[#14B8FF]"
            >
              <title>Field Officer login</title>
              <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
              <circle cx="12" cy="10" r="2" />
            </svg>
          </div>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-foreground">FIELD OFFICER</h1>
          <p className="max-w-sm text-balance font-mono text-[10px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
            DENS CAKRA Secure Location Access
          </p>
        </div>

        <Suspense fallback={<div className="h-12 animate-pulse rounded-lg border border-cyan-500/15 bg-cyan-500/5" />}>
          <LoginForm officerOnly />
        </Suspense>
      </div>

      <div className="flex w-full items-center justify-center text-center font-mono text-[10px] text-muted-foreground/60">
        <div>© 2026 DENS CAKRA</div>
      </div>
    </div>
  );
}
