
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Eye, EyeOff, Send } from 'lucide-react'; // Added Send icon
import { useUser } from '@/contexts/UserContext';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(''); // New state for verification code
  const [isVerificationCodeSent, setIsVerificationCodeSent] = useState(false); // New state to track if code was "sent"
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false); // State for "Send Code" button loading
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendVerificationCode = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingCode(true);
    // Simulate sending verification code
    // In a real app, this would call a backend or Firebase function to send an email
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    toast({
      title: "Verification Code Sent (Simulated)",
      description: `A verification code has been "sent" to ${email}. Please check your inbox.`,
    });
    setIsVerificationCodeSent(true);
    setIsSendingCode(false);
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({
        title: "Signup Failed",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Note: In a real scenario with pre-signup code verification, you'd verify the code here
    // before calling Firebase's signup. This prototype doesn't include that backend logic.

    try {
      await signup(email, password, name || undefined);
      toast({
        title: "Signup Successful!",
        description: "Welcome! You are now logged in. Please check your email to verify your account if prompted by Firebase.",
      });
      router.push('/dashboard');
    } catch (error) {
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email address is already in use.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. It should be at least 6 characters.";
            break;
          default:
            errorMessage = "Signup failed. Please try again.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Signup error:", error);
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <AppLogo iconSize={40} textSize="text-3xl" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join BalanceBeam to share expenses easily.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={isLoading || isSendingCode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email*</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading || isVerificationCodeSent || isSendingCode}
                  className="flex-grow"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSendVerificationCode}
                  disabled={isLoading || isVerificationCodeSent || !email.trim() || isSendingCode}
                  title="Send verification code"
                >
                  {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="sr-only">Send verification code</span>
                </Button>
              </div>
            </div>

            {isVerificationCodeSent && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code*</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter code from email"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  // In a real flow, this might be required. For this UI prototype, it's not strictly enforced before signup.
                  // required 
                  disabled={isLoading || isSendingCode}
                />
                 <p className="text-xs text-muted-foreground">
                    The verification code input is for UI demonstration. Standard Firebase email verification typically uses a link sent to your email after signup.
                 </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password*</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••• (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading || isSendingCode}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isSendingCode}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password*</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading || isSendingCode}
                />
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading || isSendingCode}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSendingCode || (isVerificationCodeSent && !verificationCode.trim())}>
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/login">
                  Log In
                </Link>
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    