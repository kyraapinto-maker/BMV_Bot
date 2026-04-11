import { Home, PhoneCall, Building2, Search, Briefcase, LogOut } from "lucide-react";
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
import { useLogout, useAuth } from "@/hooks/use-auth";

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
