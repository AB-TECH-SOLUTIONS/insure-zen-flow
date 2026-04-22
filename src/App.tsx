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
import DetailCotation from "./pages/cotations/DetailCotation";
import ListeContrats from "./pages/contrats/ListeContrats";
import DetailContrat from "./pages/contrats/DetailContrat";
import ListePaiements from "./pages/paiements/ListePaiements";
import ListeClients from "./pages/clients/ListeClients";
import NouveauClient from "./pages/clients/NouveauClient";
import DetailClient from "./pages/clients/DetailClient";
import ListeVehicules from "./pages/vehicules/ListeVehicules";
import Messagerie from "./pages/messages/Messagerie";
import ListeSinistres from "./pages/sinistres/ListeSinistres";
import StockAttestations from "./pages/attestations/StockAttestations";
import ImportExport from "./pages/import-export/ImportExport";
import ListeTaches from "./pages/taches/ListeTaches";

const queryClient = new QueryClient();

const Stub = (props: { title: string; description?: string; sprint?: string }) => (
  <PlaceholderPage {...props} />
);

// Routes communes cotation + contrats pour un rôle donné
const RoleRoutes = ({ base }: { base: string }) => (
  <>
    <Route path={`${base}/cotations`} element={<ListeCotations basePath={base} />} />
    <Route path={`${base}/cotations/nouvelle`} element={<SelecteurProduit basePath={base} />} />
    <Route path={`${base}/cotations/nouvelle/auto`} element={<NouvelleCotationAuto basePath={base} />} />
    <Route path={`${base}/cotations/nouvelle/voyage`} element={<NouvelleCotationVoyage basePath={base} />} />
    <Route path={`${base}/cotations/:id`} element={<DetailCotation basePath={base} />} />
    <Route path={`${base}/contrats`} element={<ListeContrats basePath={base} />} />
    <Route path={`${base}/contrats/:id`} element={<DetailContrat basePath={base} />} />
    <Route path={`${base}/paiements`} element={<ListePaiements />} />
    <Route path={`${base}/clients`} element={<ListeClients basePath={base} />} />
    <Route path={`${base}/clients/nouveau`} element={<NouveauClient basePath={base} />} />
    <Route path={`${base}/clients/:id`} element={<DetailClient basePath={base} />} />
    <Route path={`${base}/vehicules`} element={<ListeVehicules basePath={base} />} />
    <Route path={`${base}/messages`} element={<Messagerie />} />
    <Route path={`${base}/sinistres`} element={<ListeSinistres basePath={base} />} />
    <Route path={`${base}/import-export`} element={<ImportExport />} />
    <Route path={`${base}/taches`} element={<ListeTaches />} />
  </>
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
              {RoleRoutes({ base: "/client" })}
            </Route>

            {/* AGENT */}
            <Route element={<ProtectedRoute allow={["agent", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/agent" element={<AgentDashboard />} />
              {RoleRoutes({ base: "/agent" })}
              <Route path="/agent/quotes" element={<ListeCotations basePath="/agent" />} />
              <Route path="/agent/attestations" element={<StockAttestations />} />
            </Route>

            {/* COURTIER */}
            <Route element={<ProtectedRoute allow={["courtier", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/courtier" element={<CourtierDashboard />} />
              {RoleRoutes({ base: "/courtier" })}
              <Route path="/courtier/compagnies" element={<Stub title="Mes accès compagnies" sprint="Sprint 2" />} />
            </Route>

            {/* ASSUREUR */}
            <Route element={<ProtectedRoute allow={["assureur", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/assureur" element={<AssureurDashboard />} />
              {RoleRoutes({ base: "/assureur" })}
              <Route path="/assureur/portefeuille" element={<Stub title="Portefeuille" sprint="Sprint 2" />} />
              <Route path="/assureur/reseau" element={<Stub title="Réseau" sprint="Sprint 2" />} />
              <Route path="/assureur/demandes-courtiers" element={<Stub title="Demandes courtiers" sprint="Sprint 2" />} />
              <Route path="/assureur/attestations" element={<StockAttestations />} />
            </Route>

            {/* SUPER ADMIN */}
            <Route element={<ProtectedRoute allow={["super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              {RoleRoutes({ base: "/admin" })}
              <Route path="/admin/compagnies" element={<Stub title="Compagnies" sprint="Sprint 2" />} />
              <Route path="/admin/utilisateurs" element={<Stub title="Utilisateurs" sprint="Sprint 2" />} />
              <Route path="/admin/roles" element={<Stub title="Rôles & accès" sprint="Sprint 2" />} />
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
