
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
import { mockUsers, mockGroups } from "@/lib/mock-data"; // currentUser removed
import type { User } from "@/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth

const NO_GROUP_SENTINEL_VALUE = "___NO_GROUP_SENTINEL___";

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
      name: z.string(), 
      selected: z.boolean(),
      amountOwed: z.coerce.number().optional(),
    })
  ).min(1, "At least one participant must be selected (including payer if they participated)."),
}).refine(data => {
  if (data.splitType === "unequal") {
    const sumOfAmounts = data.participants
      .filter(p => p.selected)
      .reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    return Math.abs(sumOfAmounts - data.totalAmount) < 0.01;
  }
  return true;
}, {
  message: "Sum of unequal splits must equal total amount",
  path: ["totalAmount"], 
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function ExpenseForm() {
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth(); // Get authenticated user

  // Prepare default values, ensuring paidByUserId is set once authUser is available
  const getDefaultValues = (userId?: string): Partial<ExpenseFormValues> => ({
    title: "",
    totalAmount: 0,
    paidByUserId: userId || "", // Set to empty if no user, will be updated by useEffect
    splitType: "equal",
    participants: mockUsers.map(u => ({ 
      userId: u.id, 
      name: u.name, 
      // Select the authenticated user by default if their ID matches one in mockUsers
      // Or, if we want to always select the current firebase user even if not in mockUsers:
      // selected: u.id === userId,
      // For now, we will base selection on mockUsers and authUser.uid matching.
      // This part may need refinement based on how participants are managed (Firebase users vs. mockUsers).
      selected: userId ? u.id === userId : false, // Simplified for now, might need better mapping if authUser.uid is not in mockUsers
      amountOwed: 0 
    })),
  });


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(), // Initial default values
    mode: "onChange",
  });

  useEffect(() => {
    if (authUser && !authLoading) {
      // Reset form with authUser.uid as default for paidByUserId and selected participant
      // This assumes authUser.uid can be found within mockUsers for initial selection.
      // If not, the participant selection logic would need adjustment.
      // For now, we find a mock user that matches the authUser's ID for selection.
      // A more robust solution would be to merge/manage a list of users from Firebase and local contacts.
      
      // Let's assume the first mock user is the authenticated user for simplicity in this mock setup.
      // In a real app, you'd use authUser.uid.
      const defaultPayerId = authUser.uid; // Use actual authUser.uid
      
      form.reset(getDefaultValues(defaultPayerId));
      
      // Manually update participants to select the authenticated user
      // This is a bit complex due to mockUsers vs authUser.
      // A simple approach: if authUser matches a mockUser name, select them.
      // Or, ensure paidByUserId is selectable and defaults to the authUser.
      
      // Update `paidByUserId` field specifically if it's not already set by reset.
      if (form.getValues("paidByUserId") !== defaultPayerId) {
        form.setValue("paidByUserId", defaultPayerId);
      }

      // Update participants array to ensure the current user is selected
      const updatedParticipants = mockUsers.map(u => ({
        userId: u.id,
        name: u.name,
        selected: u.id === defaultPayerId, // This might not work if defaultPayerId (UID) is not in mockUsers
        amountOwed: 0
      }));
      // To make it work with Firebase UID, we might need a different approach for participants
      // For now, this will select the user if their UID is in mockUsers
      form.setValue("participants", updatedParticipants, { shouldValidate: true });

    }
  }, [authUser, authLoading, form.reset, form.getValues, form.setValue, form]);


  const { fields } = useFieldArray({ // 'update' removed as it's not used
    control: form.control,
    name: "participants",
  });

  const splitType = form.watch("splitType");
  const totalAmount = form.watch("totalAmount");
  const selectedParticipantsCount = form.watch("participants").filter(p => p.selected).length;


  useEffect(() => {
    if (splitType === "equal" && selectedParticipantsCount > 0 && totalAmount > 0) {
      const amountPerParticipant = totalAmount / selectedParticipantsCount;
      const updatedParticipants = form.getValues("participants").map(p => ({
        ...p,
        amountOwed: p.selected ? parseFloat(amountPerParticipant.toFixed(2)) : 0,
      }));
      form.setValue("participants", updatedParticipants, { shouldValidate: true });
    } else if (splitType === "equal" && (selectedParticipantsCount === 0 || totalAmount <= 0)) {
      const updatedParticipants = form.getValues("participants").map(p => ({ ...p, amountOwed: 0 }));
      form.setValue("participants", updatedParticipants, { shouldValidate: true });
    }
  }, [splitType, totalAmount, selectedParticipantsCount, form]);


  function onSubmit(data: ExpenseFormValues) {
    if (!authUser) {
      toast({ title: "Error", description: "You must be logged in to add an expense.", variant: "destructive" });
      return;
    }

    const finalParticipants = data.participants
      .filter(p => p.selected)
      .map(p => ({
        userId: p.userId,
        amountOwed: p.amountOwed || 0, 
      }));

    if (data.splitType === 'unequal') {
      const sumOfAmounts = finalParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
      if (Math.abs(sumOfAmounts - data.totalAmount) >= 0.01) {
        form.setError("totalAmount", { type: "manual", message: "Sum of participant amounts does not match total." });
        return;
      }
    }
    
    const processedGroupId = data.groupId === NO_GROUP_SENTINEL_VALUE ? undefined : data.groupId;

    console.log("Expense data:", {
      ...data,
      paidByUserId: authUser.uid, // Ensure the actual authenticated user's ID is used
      groupId: processedGroupId,
      participants: finalParticipants,
    });
    toast({
      title: "Expense Added",
      description: `${data.title} for $${data.totalAmount.toFixed(2)} has been recorded.`,
    });
    form.reset(getDefaultValues(authUser.uid)); 
  }
  
  // Create a list of users for the "Paid By" dropdown.
  // This should include the authenticated user, even if not in mockUsers.
  const payerOptions: User[] = [...mockUsers];
  if (authUser && !mockUsers.find(u => u.id === authUser.uid)) {
    payerOptions.unshift({ id: authUser.uid, name: authUser.displayName || authUser.email || "You", avatarUrl: authUser.photoURL || undefined });
  }


  if (authLoading) {
    return <p>Loading form...</p>; // Or a spinner
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {payerOptions.map((user) => (
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
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group (Optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value === undefined ? "" : field.value} 
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_GROUP_SENTINEL_VALUE}>No Group (Direct Expense)</SelectItem>
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
              <FormDescription>Select who was involved in this expense (including yourself if applicable).</FormDescription>
              <div className="space-y-3 pt-2">
                {fields.map((item, index) => ( // Renamed field to item to avoid conflict
                  <FormField
                    key={item.id} // Use item.id for key
                    control={form.control}
                    name={`participants.${index}.selected`}
                    render={({ field: checkboxField }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                        <FormControl>
                           <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => {
                              checkboxField.onChange(checked);
                              const participants = form.getValues("participants");
                              participants[index].selected = !!checked; 
                              
                              const currentSplitType = form.getValues("splitType");
                              const currentTotalAmount = form.getValues("totalAmount");
                              const currentSelectedParticipantsCount = participants.filter(p => p.selected).length;

                              if (currentSplitType === "equal" && currentSelectedParticipantsCount > 0 && currentTotalAmount > 0) {
                                const amount = currentTotalAmount / currentSelectedParticipantsCount;
                                participants.forEach(p => {
                                  if (p.selected) p.amountOwed = parseFloat(amount.toFixed(2));
                                  else p.amountOwed = 0;
                                });
                              } else if (!checked) { 
                                participants[index].amountOwed = 0;
                              } else if (currentSplitType === "equal" && (currentSelectedParticipantsCount === 0 || currentTotalAmount <= 0)) {
                                participants.forEach(p => p.amountOwed = 0);
                              }
                              form.setValue("participants", participants, { shouldValidate: true });
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none w-full">
                          <FormLabel className="font-normal">
                            {form.getValues(`participants.${index}.name`)}
                             {form.getValues(`participants.${index}.userId`) === authUser?.uid && " (You)"}
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
              <FormMessage />
            </FormItem>
            
            <Button type="submit" className="w-full sm:w-auto" disabled={authLoading || !authUser}>Add Expense</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
