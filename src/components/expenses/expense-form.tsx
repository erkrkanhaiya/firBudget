"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { mockUsers, currentUser, mockGroups } from "@/lib/mock-data";
import type { User } from "@/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const expenseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  totalAmount: z.coerce.number().positive("Amount must be positive"),
  paidByUserId: z.string().min(1, "Payer is required"),
  groupId: z.string().optional(),
  splitType: z.enum(["equal", "unequal"], {
    required_error: "You need to select a split type.",
  }),
  participants: z.array(
    z.object({
      userId: z.string(),
      name: z.string(), // For display
      selected: z.boolean(),
      amountOwed: z.coerce.number().optional(),
    })
  ).min(1, "At least one participant must be selected (including payer if they participated)."),
}).refine(data => {
  if (data.splitType === "unequal") {
    const sumOfAmounts = data.participants
      .filter(p => p.selected)
      .reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    // Allow for small floating point discrepancies
    return Math.abs(sumOfAmounts - data.totalAmount) < 0.01;
  }
  return true;
}, {
  message: "Sum of unequal splits must equal total amount",
  path: ["totalAmount"], // Or path: ["participants"] to show error near participant amounts
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const defaultValues: Partial<ExpenseFormValues> = {
  title: "",
  totalAmount: 0,
  paidByUserId: currentUser.id,
  splitType: "equal",
  participants: mockUsers.map(u => ({ userId: u.id, name: u.name, selected: u.id === currentUser.id, amountOwed: 0 })),
};

export function ExpenseForm() {
  const { toast } = useToast();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
    mode: "onChange", // Validate on change for better UX
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const splitType = form.watch("splitType");
  const totalAmount = form.watch("totalAmount");
  const selectedParticipants = form.watch("participants").filter(p => p.selected);

  useEffect(() => {
    if (splitType === "equal" && selectedParticipants.length > 0) {
      const amountPerParticipant = totalAmount / selectedParticipants.length;
      const updatedParticipants = form.getValues("participants").map(p => ({
        ...p,
        amountOwed: p.selected ? parseFloat(amountPerParticipant.toFixed(2)) : 0,
      }));
      form.setValue("participants", updatedParticipants, { shouldValidate: true });
    }
  }, [splitType, totalAmount, selectedParticipants.length, form]);


  function onSubmit(data: ExpenseFormValues) {
    const finalParticipants = data.participants
      .filter(p => p.selected)
      .map(p => ({
        userId: p.userId,
        amountOwed: p.amountOwed || 0, // Ensure amountOwed is a number
      }));

    // Validate sum if unequal again before submission (refine might not catch all edge cases with dynamic updates)
    if (data.splitType === 'unequal') {
      const sumOfAmounts = finalParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
      if (Math.abs(sumOfAmounts - data.totalAmount) >= 0.01) {
        form.setError("totalAmount", { type: "manual", message: "Sum of participant amounts does not match total." });
        return;
      }
    }


    console.log("Expense data:", {
      ...data,
      participants: finalParticipants,
    });
    toast({
      title: "Expense Added",
      description: `${data.title} for $${data.totalAmount.toFixed(2)} has been recorded.`,
    });
    form.reset(defaultValues); // Reset form after submission
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Add New Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dinner, Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidByUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
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
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Group (Direct Expense)</SelectItem>
                      {mockGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="splitType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Split Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="equal" />
                        </FormControl>
                        <FormLabel className="font-normal">Equally</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="unequal" />
                        </FormControl>
                        <FormLabel className="font-normal">Unequally</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Participants</FormLabel>
              <FormDescription>Select who was involved in this expense.</FormDescription>
              <div className="space-y-3 pt-2">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`participants.${index}.selected`}
                    render={({ field: checkboxField }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                        <FormControl>
                           <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => {
                              checkboxField.onChange(checked);
                              // Also update the participant's amountOwed if equal split is selected
                              const participants = form.getValues("participants");
                              participants[index].selected = !!checked; // Ensure boolean
                              if (form.getValues("splitType") === "equal" && selectedParticipants.length > 0) {
                                const amount = totalAmount / participants.filter(p=>p.selected).length;
                                participants.forEach(p => {
                                  if (p.selected) p.amountOwed = parseFloat(amount.toFixed(2));
                                  else p.amountOwed = 0;
                                });
                                form.setValue("participants", participants, { shouldValidate: true });
                              } else if (!checked) { // if deselected, reset amount
                                participants[index].amountOwed = 0;
                                form.setValue("participants", participants, { shouldValidate: true });
                              }
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none w-full">
                          <FormLabel className="font-normal">
                            {form.getValues(`participants.${index}.name`)}
                          </FormLabel>
                          {splitType === 'unequal' && checkboxField.value && (
                            <FormField
                              control={form.control}
                              name={`participants.${index}.amountOwed`}
                              render={({ field: amountField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Amount owed"
                                      className="h-8 mt-1"
                                      step="0.01"
                                      {...amountField}
                                      onChange={(e) => {
                                        amountField.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage /> {/* For participants array level errors */}
            </FormItem>
            
            <Button type="submit" className="w-full sm:w-auto">Add Expense</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
