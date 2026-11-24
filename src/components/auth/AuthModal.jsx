import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Mail, User, Loader2, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';
import { isGoogleSignInEnabled, renderGoogleButton } from '@/lib/googleAuth';
import { resolveTheme } from '@/lib/theme';

export default function AuthModal({ open, onOpenChange, onSuccess, feature = 'this feature' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); // e.g. "check your email to confirm"
  const [tab, setTab] = useState('login');
  const googleButtonRef = useRef(null);
  const googleEnabled = isGoogleSignInEnabled();

  // Render Google's button whenever the dialog opens (it lives inside the dialog)
  useEffect(() => {
    if (!open || !googleEnabled) return undefined;
    let cancelled = false;
    // Wait a tick for the dialog content to mount
    const t = setTimeout(() => {
      if (cancelled || !googleButtonRef.current) return;
      renderGoogleButton(googleButtonRef.current, {
        theme: resolveTheme() === 'dark' ? 'filled_black' : 'outline',
        text: tab === 'register' ? 'signup_with' : 'continue_with',
        onProfile: async (profile, credential) => {
          try {
            const user = await auth.signInWithGoogle(profile, credential);
            toast.success(`Welcome, ${user.full_name || 'friend'}!`);
            onSuccess?.(user);
            onOpenChange(false);
          } catch (err) {
            setError(err.message);
          }
        },
        onError: (err) => setError(err.message),
      }).catch((err) => !cancelled && setError(err.message));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, googleEnabled, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);
    
    try {
      const user = await auth.login({ email: loginEmail, password: loginPassword });
      toast.success(`Welcome back, ${user.full_name || 'friend'}!`);
      onSuccess?.(user);
      onOpenChange(false);
      // Reset form
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);
    
    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    
    try {
      const user = await auth.register({ 
        email: registerEmail, 
        password: registerPassword, 
        full_name: registerName 
      });
      toast.success(`Welcome to GameDay, ${user.full_name}!`);
      onSuccess?.(user);
      onOpenChange(false);
      // Reset form
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterName('');
    } catch (err) {
      if (err.code === 'CONFIRM_EMAIL') {
        setNotice(err.message);
        setTab('login');
        setLoginEmail(registerEmail);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const features = [
    { text: 'Track friends in real-time' },
    { text: 'Save your car location' },
    { text: 'RSVP to tailgates' },
    { text: 'Create your own events' },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">Welcome to GameDay</DialogTitle>
          <DialogDescription className="text-center">
            Sign in or create an account to access {feature}
          </DialogDescription>
        </DialogHeader>
        
        {googleEnabled && (
          <div className="space-y-3">
            <div ref={googleButtonRef} className="flex min-h-[44px] w-full justify-center" aria-label="Sign in with Google" />
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              or use email
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>
          
          {notice && !error && (
            <div role="status" className="flex items-start gap-2 p-3 mt-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              {notice}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          
          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4">
          <Button 
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continue Browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


