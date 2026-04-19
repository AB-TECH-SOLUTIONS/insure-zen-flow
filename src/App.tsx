import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import ClientDashboard from "./pages/dashboards/ClientDashboard";
import AgentDashboard from "./pages/dashboards/AgentDashboard";
import CourtierDashboard from "./pages/dashboards/CourtierDashboard";
import AssureurDashboard from "./pages/dashboards/AssureurDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

import { PlaceholderPage } from "./components/PlaceholderPage";
import NouvelleCotationAuto from "./pages/cotations/NouvelleCotationAuto";
import NouvelleCotationVoyage from "./pages/cotations/NouvelleCotationVoyage";
import SelecteurProduit from "./pages/cotations/SelecteurProduit";
import ListeCotations from "./pages/cotations/ListeCotations";

const queryClient = new QueryClient();

const Stub = (props: { title: string; description?: string; sprint?: string }) => (
  <PlaceholderPage {...props} />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* CLIENT */}
            <Route element={<ProtectedRoute allow={["client", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/cotations" element={<ListeCotations basePath="/client" />} />
              <Route path="/client/cotations/nouvelle/auto" element={<NouvelleCotationAuto />} />
              <Route path="/client/cotations/nouvelle" element={<Stub title="Nouvelle cotation" description="Choisissez Auto, Voyage ou Risques Divers." sprint="Sprint 1" />} />
              <Route path="/client/contrats" element={<Stub title="Mes contrats" sprint="Sprint 2" />} />
              <Route path="/client/sinistres" element={<Stub title="Mes sinistres" sprint="Sprint 4" />} />
              <Route path="/client/paiements" element={<Stub title="Paiements" sprint="Sprint 5" />} />
              <Route path="/client/messages" element={<Stub title="Messagerie" sprint="Sprint 3" />} />
            </Route>

            {/* AGENT */}
            <Route element={<ProtectedRoute allow={["agent", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/agent/cotations" element={<ListeCotations basePath="/agent" />} />
              <Route path="/agent/quotes" element={<ListeCotations basePath="/agent" />} />
              <Route path="/agent/cotations/nouvelle/auto" element={<NouvelleCotationAuto />} />
              <Route path="/agent/cotations/nouvelle" element={<Stub title="Nouvelle cotation" description="Auto, Voyage ou Risques Divers." sprint="Sprint 1" />} />
              <Route path="/agent/contrats" element={<Stub title="Contrats" sprint="Sprint 2" />} />
              <Route path="/agent/clients" element={<Stub title="Clients" sprint="Sprint 1" />} />
              <Route path="/agent/vehicules" element={<Stub title="Véhicules" sprint="Sprint 1" />} />
              <Route path="/agent/sinistres" element={<Stub title="Sinistres" sprint="Sprint 4" />} />
              <Route path="/agent/paiements" element={<Stub title="Paiements" sprint="Sprint 5" />} />
              <Route path="/agent/attestations" element={<Stub title="Stock attestations" sprint="Sprint 3" />} />
              <Route path="/agent/messages" element={<Stub title="Messagerie" sprint="Sprint 3" />} />
            </Route>

            {/* COURTIER */}
            <Route element={<ProtectedRoute allow={["courtier", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/courtier" element={<CourtierDashboard />} />
              <Route path="/courtier/cotations" element={<ListeCotations basePath="/courtier" />} />
              <Route path="/courtier/cotations/nouvelle/auto" element={<NouvelleCotationAuto />} />
              <Route path="/courtier/cotations/nouvelle" element={<Stub title="Nouvelle cotation" sprint="Sprint 1" />} />
              <Route path="/courtier/contrats" element={<Stub title="Contrats" sprint="Sprint 2" />} />
              <Route path="/courtier/clients" element={<Stub title="Clients" sprint="Sprint 1" />} />
              <Route path="/courtier/compagnies" element={<Stub title="Mes accès compagnies" sprint="Sprint 2" />} />
              <Route path="/courtier/sinistres" element={<Stub title="Sinistres" sprint="Sprint 4" />} />
              <Route path="/courtier/paiements" element={<Stub title="Paiements" sprint="Sprint 5" />} />
              <Route path="/courtier/messages" element={<Stub title="Messagerie" sprint="Sprint 3" />} />
            </Route>

            {/* ASSUREUR */}
            <Route element={<ProtectedRoute allow={["assureur", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/assureur" element={<AssureurDashboard />} />
              <Route path="/assureur/portefeuille" element={<Stub title="Portefeuille" sprint="Sprint 2" />} />
              <Route path="/assureur/cotations" element={<ListeCotations basePath="/assureur" />} />
              <Route path="/assureur/cotations/nouvelle/auto" element={<NouvelleCotationAuto />} />
              <Route path="/assureur/cotations/nouvelle" element={<Stub title="Nouvelle cotation" sprint="Sprint 1" />} />
              <Route path="/assureur/contrats" element={<Stub title="Contrats" sprint="Sprint 2" />} />
              <Route path="/assureur/reseau" element={<Stub title="Réseau" sprint="Sprint 2" />} />
              <Route path="/assureur/demandes-courtiers" element={<Stub title="Demandes courtiers" sprint="Sprint 2" />} />
              <Route path="/assureur/sinistres" element={<Stub title="Sinistres" sprint="Sprint 4" />} />
              <Route path="/assureur/paiements" element={<Stub title="Paiements" sprint="Sprint 5" />} />
              <Route path="/assureur/attestations" element={<Stub title="Stock attestations" sprint="Sprint 3" />} />
              <Route path="/assureur/messages" element={<Stub title="Messagerie" sprint="Sprint 3" />} />
            </Route>

            {/* SUPER ADMIN */}
            <Route element={<ProtectedRoute allow={["super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/compagnies" element={<Stub title="Compagnies" sprint="Sprint 2" />} />
              <Route path="/admin/utilisateurs" element={<Stub title="Utilisateurs" sprint="Sprint 2" />} />
              <Route path="/admin/roles" element={<Stub title="Rôles & accès" sprint="Sprint 2" />} />
              <Route path="/admin/cotations" element={<ListeCotations basePath="/admin" />} />
              <Route path="/admin/cotations/nouvelle/auto" element={<NouvelleCotationAuto />} />
              <Route path="/admin/contrats" element={<Stub title="Tous les contrats" sprint="Sprint 2" />} />
              <Route path="/admin/sinistres" element={<Stub title="Tous les sinistres" sprint="Sprint 4" />} />
              <Route path="/admin/logs" element={<Stub title="Journaux" sprint="Sprint 5" />} />
              <Route path="/admin/parametres" element={<Stub title="Paramètres" sprint="Sprint 2" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
