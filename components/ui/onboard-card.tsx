"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import { LuLoader } from "react-icons/lu";

interface OnboardCardProps {
  duration?: number;
  step1?: string;
  step2?: string;
  step3?: string;
  className?: string;
}

const OnboardCard = ({
  duration = 3000,
  step1 = "Context Analyzed",
  step2 = "Generating Response",
  step3 = "Finalizing Answer",
  className
}: OnboardCardProps) => {
  const [progress, setProgress] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    // Reset progress to 0 initially
    setProgress(0);
    
    const forward = setTimeout(() => setProgress(100), 100);
    const reset = setTimeout(() => {
      setAnimateKey((k) => k + 1);
    }, duration + 2000);

    return () => {
      clearTimeout(forward);
      clearTimeout(reset);
    };
  }, [animateKey, duration]);

  return (
    <div
      className={cn(
        "relative",
        "flex flex-col items-center justify-center gap-1 p-4 max-w-[300px]",
        className
      )}
    >
      {/* Future/Pending Step (Step 3) */}
      <div className="flex w-full scale-[0.9] flex-col justify-center gap-2 rounded-md border bg-gradient-to-br from-neutral-100 to-neutral-50 py-2 pl-3 pr-4 opacity-60 dark:from-neutral-800 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-start gap-2 text-xs text-primary/70">
          <div>
            <LuLoader className="animate-spin-slow" />
          </div>
          <div>{step3}</div>
        </div>
        <div
          className={`ml-5 h-1.5 w-[80%] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700`}
        ></div>
      </div>

      {/* Active Step (Step 2) */}
      <div className="flex w-full flex-col justify-center gap-2 rounded-md border bg-gradient-to-br from-white to-neutral-50 py-3 pl-3 pr-4 shadow-sm dark:from-neutral-900 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800 z-10">
        <div className="flex items-center justify-start gap-1.5 text-xs font-medium text-primary">
          <div className="animate-spin text-indigo-500">
            <LuLoader />
          </div>
          <div>{step2}</div>
        </div>
        <div
          className={`ml-5 h-1.5 w-[85%] overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800`}
        >
          <motion.div
            key={animateKey}
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: duration / 1000, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Completed Step (Step 1) */}
      <div className="flex w-full scale-[0.9] flex-col justify-center gap-2 rounded-md border bg-gradient-to-br from-neutral-100 to-neutral-50 py-2 pl-3 pr-4 opacity-60 dark:from-neutral-800 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-start text-xs text-primary/70 gap-2">
          <div className="relative flex items-center justify-center">
            <div className="size-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <IoMdCheckmark className="size-3 text-green-500" />
            </div>
          </div>
          <div>{step1}</div>
        </div>
        <div
          className={`ml-5 h-1.5 w-[80%] overflow-hidden rounded-full bg-green-500/50`}
        ></div>
      </div>

      <div className="absolute top-0 h-[40%] w-full [background-image:linear-gradient(to_bottom,theme(colors.background)_10%,transparent_100%)]pointer-events-none" />
      <div className="absolute bottom-0 h-[40%] w-full [background-image:linear-gradient(to_top,theme(colors.background)_10%,transparent_100%)] pointer-events-none" />
    </div>
  );
};
export default OnboardCard;
