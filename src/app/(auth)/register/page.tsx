import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterFallback() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-9 w-48 animate-pulse rounded bg-white/5" />
      <div className="h-4 w-72 animate-pulse rounded bg-white/5" />
      <div className="mt-6 flex flex-col gap-5">
        <div className="h-12 animate-pulse rounded bg-white/5" />
        <div className="h-12 animate-pulse rounded bg-white/5" />
        <div className="h-12 animate-pulse rounded bg-white/5" />
        <div className="h-12 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
