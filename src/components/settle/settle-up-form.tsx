
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockUsers } from "@/lib/mock-data"; // currentUser removed
import { useToast } from "@/hooks/use-toast";
import { HandCoins } from "lucide-react";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth
import type { User } from "@/types";
import { useEffect } from "react";

const settleUpFormSchema = z.object({
  payerId: z.string().min(1, "Payer is required"),
  recipientId: z.string().min(1, "Recipient is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  notes: z.string().optional(),
}).refine(data => data.payerId !== data.recipientId, {
  message: "Payer and recipient cannot be the same person.",
  path: ["recipientId"], 
});

type SettleUpFormValues = z.infer<typeof settleUpFormSchema>;


export function SettleUpForm() {
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth();

  const getDefaultValues = (userId?: string): Partial<SettleUpFormValues> => ({
    payerId: userId || "",
    amount: 0,
  });


  const form = useForm<SettleUpFormValues>({
    resolver: zodResolver(settleUpFormSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (authUser && !authLoading) {
      form.reset(getDefaultValues(authUser.uid));
    }
  }, [authUser, authLoading, form.reset, form]);


  function onSubmit(data: SettleUpFormValues) {
     if (!authUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const payer = userOptions.find(u => u.id === data.payerId);
    const recipient = userOptions.find(u => u.id === data.recipientId);

    console.log("Settlement data:", data);
    toast({
      title: "Payment Recorded",
      description: `${payer?.name || 'Someone'} paid $${data.amount.toFixed(2)} to ${recipient?.name || 'Someone'}.`,
    });
    form.reset(getDefaultValues(authUser.uid));
  }

  // Create a list of users for dropdowns.
  // This should include the authenticated user, even if not in mockUsers.
  const userOptions: User[] = [...mockUsers];
  if (authUser && !mockUsers.find(u => u.id === authUser.uid)) {
    userOptions.unshift({ id: authUser.uid, name: authUser.displayName || authUser.email || "You (Authenticated User)", avatarUrl: authUser.photoURL || undefined });
  }
  
  if (authLoading) {
    return <p>Loading form...</p>; // Or a spinner
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Record a Payment</CardTitle>
        <CardDescription>Log a payment made to settle a debt.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="payerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who Paid?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Payer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.id === authUser?.uid && "(You)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Whom?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.id === authUser?.uid && "(You)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Settled for dinner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full sm:w-auto" disabled={authLoading || !authUser}>
              <HandCoins className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

