import { useState } from "react";
import { Home, PhoneCall, Building2, Search, Briefcase, LogOut, Users, ChevronDown, UserCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLogout, useAuth, useImpersonate, useAdminUsers } from "@/hooks/use-auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Sourcing", url: "/sourcing", icon: Search },
  { title: "Opportunities", url: "/opportunities", icon: Briefcase },
  { title: "Call History", url: "/history", icon: PhoneCall },
];

export function AppSidebar() {
  const [location] = useLocation();
  const logout = useLogout();
  const { data: user } = useAuth();
  const impersonate = useImpersonate();
  const [usersOpen, setUsersOpen] = useState(false);

  const adminUsers = useAdminUsers();

  const handleUsersOpen = (open: boolean) => {
    setUsersOpen(open);
    if (open && !adminUsers.data) {
      adminUsers.refetch();
    }
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display leading-tight text-foreground">Bob the Caller</h2>
          <p className="text-xs text-muted-foreground font-medium">AI Agency Caller</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <Collapsible open={usersOpen} onOpenChange={handleUsersOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="View as user"
                    className="w-full transition-all duration-200"
                    data-testid="button-admin-users"
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium flex-1">View as User</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${usersOpen ? "rotate-180" : ""}`} />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-2 space-y-0.5">
                  {adminUsers.isFetching ? (
                    <div className="space-y-1 px-2 py-1">
                      <Skeleton className="h-7 w-full" />
                      <Skeleton className="h-7 w-full" />
                    </div>
                  ) : (adminUsers.data ?? [])
                    .filter((u) => u.id !== user?.id)
                    .map((u) => {
                      const isActive = user?.impersonating?.id === u.id;
                      return (
                        <SidebarMenuButton
                          key={u.id}
                          onClick={() => impersonate.mutate(u.id)}
                          disabled={impersonate.isPending}
                          className={`w-full text-sm transition-all duration-200 ${isActive ? "bg-amber-500/10 text-amber-700" : ""}`}
                          data-testid={`button-impersonate-${u.id}`}
                        >
                          <UserCheck className="w-4 h-4 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </SidebarMenuButton>
                      );
                    })
                  }
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border space-y-2">
        {user && (
          <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
            {user.email}
          </p>
        )}
        <SidebarMenuButton
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          tooltip="Sign out"
          className="w-full text-muted-foreground hover:text-destructive transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
