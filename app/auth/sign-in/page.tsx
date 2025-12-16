'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import { createClient } from '@/lib/supabase/client';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Amazing platform! The user experience is seamless and the features are exactly what I needed."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "This service has transformed how I work. Clean design, powerful features, and excellent support."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity."
  },
];

export default function SignInPageRoute() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rememberMe = formData.get('rememberMe') === 'on';

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      setError('Authentication is not configured. Please contact administrator.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Failed to sign in. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to home page after successful login
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      setError('Authentication is not configured. Please contact administrator.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) {
        setError(googleError.message || 'Failed to sign in with Google.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    router.push('/auth/reset-password');
  };

  const handleCreateAccount = () => {
    router.push('/auth/sign-up');
  };

  return (
    <div className="bg-background text-foreground">
      {error && (
        <div className="fixed top-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      <SignInPage
        title={<span className="font-light text-foreground tracking-tighter">Welcome to OXEN</span>}
        description="Sign in to access AI-powered growth tools for your business"
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
      />
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-foreground">Signing in...</p>
          </div>
        </div>
      )}
    </div>
  );
}

