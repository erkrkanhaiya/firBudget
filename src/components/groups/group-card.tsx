import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import type { Group } from "@/types";

interface GroupCardProps {
  group: Group;
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={group.avatarUrl} alt={group.name} data-ai-hint="group community" />
            <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{group.name}</CardTitle>
            <CardDescription className="flex items-center">
              <Users className="mr-1 h-4 w-4" /> {group.members.length} members
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Placeholder for group balance or recent activity summary */}
        <p className="text-sm text-muted-foreground">
          View details and expenses for the "{group.name}" group.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          View Group <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
