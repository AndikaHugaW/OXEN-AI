'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      setError('Authentication is not configured. Please contact administrator.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Show success message and redirect
        alert('Account created successfully! Please check your email to verify your account.');
        router.push('/auth/sign-in');
      }
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
              Create Account
            </h1>
            <p className="text-muted-foreground">
              Join OXEN and start using AI-powered tools for your business
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSignUp}>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Full Name</label>
              <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                <input 
                  name="fullName" 
                  type="text" 
                  placeholder="Enter your full name" 
                  required
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" 
                />
              </div>
            </div>

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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Password</label>
              <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                <div className="relative">
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Enter your password" 
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Confirm Password</label>
              <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                <div className="relative">
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Confirm your password" 
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
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

