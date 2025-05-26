
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, UserPlus } from "lucide-react";
import { mockUsers } from "@/lib/mock-data"; // currentUser removed
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth
import type { User } from "@/types";


const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name too long"),
  members: z.array(z.string()).min(1, "At least one member (yourself) must be selected."),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export function CreateGroupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth();

  const getDefaultValues = (userId?: string): CreateGroupFormValues => ({
    name: "",
    members: userId ? [userId] : [],
  });

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: getDefaultValues(),
  });
  
  useEffect(() => {
    if (authUser && !authLoading) {
      form.reset(getDefaultValues(authUser.uid));
    }
  }, [authUser, authLoading, form.reset, form]);

  function onSubmit(data: CreateGroupFormValues) {
    if (!authUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    console.log("New group data:", data);
    toast({
      title: "Group Created",
      description: `Group "${data.name}" has been successfully created.`,
    });
    form.reset(getDefaultValues(authUser.uid));
    setIsOpen(false);
  }

  // Create a list of users for member selection.
  // This should include the authenticated user, even if not in mockUsers.
  const memberOptions: User[] = [...mockUsers];
  if (authUser && !mockUsers.find(u => u.id === authUser.uid)) {
     memberOptions.unshift({ id: authUser.uid, name: authUser.displayName || authUser.email || "You (Authenticated User)", avatarUrl: authUser.photoURL || undefined });
  }


  if (authLoading) {
    return (
      <Button disabled>
        <PlusCircle className="mr-2 h-4 w-4" /> Create Group (Loading...)
      </Button>
    );
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={!authUser}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Add a name and select members for your new group.
          </DialogDescription>
        </DialogHeader>
        {authUser ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Road Trip Buddies" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="members"
                render={() => (
                  <FormItem>
                    <FormLabel>Members</FormLabel>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {memberOptions.map((user) => (
                        <FormField
                          key={user.id}
                          control={form.control}
                          name="members"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={user.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(user.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), user.id])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== user.id
                                            )
                                          );
                                    }}
                                    disabled={user.id === authUser?.uid} // Current auth user cannot be deselected
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {user.name} {user.id === authUser?.uid && "(You)"}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <UserPlus className="mr-2 h-4 w-4" /> Create Group
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <p className="text-muted-foreground">Please log in to create a group.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
