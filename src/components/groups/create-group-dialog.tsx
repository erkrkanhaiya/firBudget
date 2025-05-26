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
import { mockUsers, currentUser } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name too long"),
  members: z.array(z.string()).min(1, "At least one member (yourself) must be selected."),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export function CreateGroupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      members: [currentUser.id], // Current user is selected by default
    },
  });

  function onSubmit(data: CreateGroupFormValues) {
    console.log("New group data:", data);
    toast({
      title: "Group Created",
      description: `Group "${data.name}" has been successfully created.`,
    });
    form.reset();
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
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
                  <div className="space-y-2">
                    {mockUsers.map((user) => (
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
                                  disabled={user.id === currentUser.id} // Current user cannot be deselected
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {user.name} {user.id === currentUser.id && "(You)"}
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
      </DialogContent>
    </Dialog>
  );
}
