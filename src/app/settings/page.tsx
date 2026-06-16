
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Settings as SettingsIcon, Palette, DollarSign, Languages as LanguagesIcon } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // For theme toggle if desired here

export default function SettingsPage() {
  const { currentUser } = useUser();
  const { theme, toggleTheme, isThemeInitialized } = useTheme();
  const { language, setLanguage, isLanguageInitialized, translate } = useLanguage();
  const { currency, setCurrency, isCurrencyInitialized } = useCurrency();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view settings.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isThemeInitialized && (
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle" className="flex flex-col gap-1">
                <span>Dark Mode</span>
                <span className="text-xs text-muted-foreground">
                  Switch between light and dark themes.
                </span>
              </Label>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Set your preferred language and currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLanguageInitialized && (
            <div className="space-y-2">
              <Label htmlFor="language-select">Language</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as Language)}
              >
                <SelectTrigger id="language-select" className="w-full md:w-1/2">
                  <LanguagesIcon className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isCurrencyInitialized && (
            <div className="space-y-2">
              <Label htmlFor="currency-select">Currency</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as Currency)}
              >
                <SelectTrigger id="currency-select" className="w-full md:w-1/2">
                 <DollarSign className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($) - United States Dollar</SelectItem>
                  <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for other settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account details.</CardDescription>
        </CardHeader>
        <CardContent className="p-10 text-center">
          <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">More Settings Coming Soon</h3>
          <p className="text-muted-foreground">
            This area will include options for account management, notifications, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
