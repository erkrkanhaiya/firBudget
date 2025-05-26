import { GroupCard } from "@/components/groups/group-card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { mockGroups } from "@/lib/mock-data";

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Your Groups</h1>
        <CreateGroupDialog />
      </div>

      {mockGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">You are not part of any groups yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Create a group to start sharing expenses!</p>
        </div>
      )}
    </div>
  );
}
