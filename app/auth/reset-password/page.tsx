'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      setError('Authentication is not configured. Please contact administrator.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
              <p className="text-sm">
                Password reset email sent! Please check your inbox and follow the instructions.
              </p>
            </div>
          )}

          {!success ? (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Address</label>
                <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="Enter your email address" 
                    required
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to Sign In
            </button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <a 
              href="/auth/sign-in" 
              className="text-violet-400 hover:underline transition-colors"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

