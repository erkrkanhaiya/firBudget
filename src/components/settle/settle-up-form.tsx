"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUsers, currentUser } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { HandCoins } from "lucide-react";

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

const defaultValues: Partial<SettleUpFormValues> = {
  payerId: currentUser.id,
  amount: 0,
};

export function SettleUpForm() {
  const { toast } = useToast();
  const form = useForm<SettleUpFormValues>({
    resolver: zodResolver(settleUpFormSchema),
    defaultValues,
  });

  function onSubmit(data: SettleUpFormValues) {
    const payer = mockUsers.find(u => u.id === data.payerId);
    const recipient = mockUsers.find(u => u.id === data.recipientId);

    console.log("Settlement data:", data);
    toast({
      title: "Payment Recorded",
      description: `${payer?.name || 'Someone'} paid $${data.amount.toFixed(2)} to ${recipient?.name || 'Someone'}.`,
    });
    form.reset(defaultValues);
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Record a Payment</CardTitle>
        <FormDescription>Log a payment made to settle a debt.</FormDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Payer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
            
            <Button type="submit" className="w-full sm:w-auto">
              <HandCoins className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
