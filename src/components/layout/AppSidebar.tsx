import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, FileText, Users, Car, FileCheck, AlertTriangle, CreditCard,
  MessagesSquare, Settings, Building2, ShieldCheck, ScrollText, BarChart3, Stamp,
  UserCog, Plus, Database, ListTodo, LineChart, Briefcase,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/roles";
import { ROLE_LABELS } from "@/types/roles";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: any };

const NAV: Partial<Record<AppRole, { label: string; items: Item[] }[]>> = {
  client: [
    { label: "Espace client", items: [
      { title: "Tableau de bord", url: "/client", icon: LayoutDashboard },
      { title: "Mon espace", url: "/client/espace", icon: Briefcase },
      { title: "Mes cotations", url: "/client/cotations", icon: FileText },
      { title: "Mes contrats", url: "/client/contrats", icon: FileCheck },
      { title: "Sinistres", url: "/client/sinistres", icon: AlertTriangle },
      { title: "Paiements", url: "/client/paiements", icon: CreditCard },
      { title: "Messagerie", url: "/client/messages", icon: MessagesSquare },
    ]},
  ],
  agent: [
    { label: "Pilotage", items: [
      { title: "Tableau de bord", url: "/agent", icon: LayoutDashboard },
      { title: "Suivi CA", url: "/agent/suivi-ca", icon: LineChart },
      { title: "Tâches équipe", url: "/agent/taches", icon: ListTodo },
    ]},
    { label: "Production", items: [
      { title: "Cotations", url: "/agent/cotations", icon: FileText },
      { title: "Contrats", url: "/agent/contrats", icon: FileCheck },
      { title: "Clients", url: "/agent/clients", icon: Users },
      { title: "Véhicules", url: "/agent/vehicules", icon: Car },
    ]},
    { label: "Encaissements & sinistres", items: [
      { title: "Paiements", url: "/agent/paiements", icon: CreditCard },
      { title: "Sinistres", url: "/agent/sinistres", icon: AlertTriangle },
      { title: "Stock attestations", url: "/agent/attestations", icon: Stamp },
    ]},
    { label: "Échanges & outils", items: [
      { title: "Messagerie", url: "/agent/messages", icon: MessagesSquare },
      { title: "Import / Export", url: "/agent/import-export", icon: Database },
    ]},
  ],
  courtier: [
    { label: "Pilotage", items: [
      { title: "Tableau de bord", url: "/courtier", icon: LayoutDashboard },
      { title: "Suivi CA", url: "/courtier/suivi-ca", icon: LineChart },
      { title: "Tâches équipe", url: "/courtier/taches", icon: ListTodo },
      { title: "Mes accès compagnies", url: "/courtier/compagnies", icon: Building2 },
    ]},
    { label: "Production", items: [
      { title: "Cotations", url: "/courtier/cotations", icon: FileText },
      { title: "Contrats", url: "/courtier/contrats", icon: FileCheck },
      { title: "Clients", url: "/courtier/clients", icon: Users },
    ]},
    { label: "Encaissements & sinistres", items: [
      { title: "Paiements", url: "/courtier/paiements", icon: CreditCard },
      { title: "Sinistres", url: "/courtier/sinistres", icon: AlertTriangle },
    ]},
    { label: "Échanges & outils", items: [
      { title: "Messagerie", url: "/courtier/messages", icon: MessagesSquare },
      { title: "Import / Export", url: "/courtier/import-export", icon: Database },
    ]},
  ],
  assureur: [
    { label: "Pilotage", items: [
      { title: "Tableau de bord", url: "/assureur", icon: LayoutDashboard },
      { title: "Suivi CA", url: "/assureur/suivi-ca", icon: LineChart },
      { title: "Portefeuille", url: "/assureur/portefeuille", icon: BarChart3 },
      { title: "Tâches équipe", url: "/assureur/taches", icon: ListTodo },
    ]},
    { label: "Production", items: [
      { title: "Cotations", url: "/assureur/cotations", icon: FileText },
      { title: "Contrats", url: "/assureur/contrats", icon: FileCheck },
      { title: "Clients", url: "/assureur/clients", icon: Users },
    ]},
    { label: "Réseau", items: [
      { title: "Agents & courtiers", url: "/assureur/reseau", icon: Users },
      { title: "Demandes courtiers", url: "/assureur/demandes-courtiers", icon: UserCog },
    ]},
    { label: "Encaissements & sinistres", items: [
      { title: "Paiements", url: "/assureur/paiements", icon: CreditCard },
      { title: "Sinistres", url: "/assureur/sinistres", icon: AlertTriangle },
      { title: "Stock attestations", url: "/assureur/attestations", icon: Stamp },
    ]},
    { label: "Échanges & outils", items: [
      { title: "Messagerie", url: "/assureur/messages", icon: MessagesSquare },
      { title: "Import / Export", url: "/assureur/import-export", icon: Database },
    ]},
  ],
  super_admin: [
    { label: "Administration", items: [
      { title: "Tableau de bord", url: "/admin", icon: LayoutDashboard },
      { title: "Compagnies", url: "/admin/compagnies", icon: Building2 },
      { title: "Utilisateurs", url: "/admin/utilisateurs", icon: Users },
      { title: "Rôles & accès", url: "/admin/roles", icon: ShieldCheck },
    ]},
    { label: "Données globales", items: [
      { title: "Cotations", url: "/admin/cotations", icon: FileText },
      { title: "Contrats", url: "/admin/contrats", icon: FileCheck },
      { title: "Sinistres", url: "/admin/sinistres", icon: AlertTriangle },
      { title: "Import / Export", url: "/admin/import-export", icon: Database },
      { title: "Journaux", url: "/admin/logs", icon: ScrollText },
      { title: "Paramètres", url: "/admin/parametres", icon: Settings },
    ]},
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const location = useLocation();

  const groups = role ? NAV[role] : [];
  const newQuoteUrl =
    role === "client" ? "/client/cotations/nouvelle"
    : role === "agent" ? "/agent/cotations/nouvelle"
    : role === "courtier" ? "/courtier/cotations/nouvelle"
    : role === "assureur" ? "/assureur/cotations/nouvelle"
    : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display font-bold text-sidebar-foreground truncate">InsureFlow</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{role ? ROLE_LABELS[role] : ""}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {newQuoteUrl && (
          <div className="px-2 pt-3">
            <Button asChild className="w-full bg-gradient-primary hover:opacity-90 shadow-glow">
              <NavLink to={newQuoteUrl}>
                <Plus className="h-4 w-4" />
                {!collapsed && <span>Nouvelle cotation</span>}
              </NavLink>
            </Button>
          </div>
        )}

        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink to={item.url} end={item.url.split("/").length <= 2}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <p className="px-2 py-1 text-xs text-sidebar-foreground/40">
            v0.1 · MVP
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
