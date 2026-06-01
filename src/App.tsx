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
import NouvelleCotationVie from "./pages/cotations/NouvelleCotationVie";
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
import DetailSinistre from "./pages/sinistres/DetailSinistre";
import StockAttestations from "./pages/attestations/StockAttestations";
import ImportExport from "./pages/import-export/ImportExport";
import ListeTaches from "./pages/taches/ListeTaches";
import SuiviCA from "./pages/finance/SuiviCA";
import EspaceClient from "./pages/client/EspaceClient";
import CotationAutoClient from "./pages/client/CotationAutoClient";
import CotationVoyageClient from "./pages/client/CotationVoyageClient";
import CotationVieClient from "./pages/client/CotationVieClient";
import MesAccesCompagnies from "./pages/courtier/MesAccesCompagnies";
import DemandesCourtiers from "./pages/assureur/DemandesCourtiers";
import Equipe from "./pages/equipe/Equipe";
import AcceptInvitation from "./pages/invitation/AcceptInvitation";
import Logs from "./pages/admin/Logs";
import Renouvellements from "./pages/contrats/Renouvellements";
import Bordereaux from "./pages/finance/Bordereaux";
import Compagnies from "./pages/admin/Compagnies";
import Utilisateurs from "./pages/admin/Utilisateurs";
import Roles from "./pages/admin/Roles";
import Parametres from "./pages/admin/Parametres";
import Portefeuille from "./pages/assureur/Portefeuille";
import Reseau from "./pages/assureur/Reseau";
import GarageDashboard from "./pages/dashboards/GarageDashboard";
import ExpertDashboard from "./pages/dashboards/ExpertDashboard";
import HopitalDashboard from "./pages/dashboards/HopitalDashboard";
import PharmacieDashboard from "./pages/dashboards/PharmacieDashboard";
import AutoriteDashboard from "./pages/dashboards/AutoriteDashboard";
import DossiersSinistres from "./pages/garage/DossiersSinistres";
import Factures from "./pages/garage/Factures";
import Missions from "./pages/expert/Missions";
import RapportExpertise from "./pages/expert/RapportExpertise";
import NouveauDossier from "./pages/hopital/NouveauDossier";
import ListeDossiers from "./pages/hopital/ListeDossiers";
import NouvelleDispensation from "./pages/pharmacie/NouvelleDispensation";
import Historique from "./pages/pharmacie/Historique";
import DepotDocument from "./pages/autorite/DepotDocument";
import MesDocuments from "./pages/autorite/MesDocuments";
import VerificationAttestation from "./pages/autorite/VerificationAttestation";

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
    <Route path={`${base}/cotations/nouvelle/vie`} element={<NouvelleCotationVie basePath={base} />} />
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
    <Route path={`${base}/sinistres/:id`} element={<DetailSinistre basePath={base} />} />
    <Route path={`${base}/import-export`} element={<ImportExport />} />
    <Route path={`${base}/taches`} element={<ListeTaches />} />
    <Route path={`${base}/suivi-ca`} element={<SuiviCA />} />
    <Route path={`${base}/equipe`} element={<Equipe />} />
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
            <Route path="/invitation/:token" element={<AcceptInvitation />} />

            {/* CLIENT */}
            <Route element={<ProtectedRoute allow={["client", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/espace" element={<EspaceClient />} />
              <Route path="/client/cotations/nouvelle/auto" element={<CotationAutoClient />} />
              <Route path="/client/cotations/nouvelle/voyage" element={<CotationVoyageClient />} />
              <Route path="/client/cotations/nouvelle/vie" element={<CotationVieClient />} />
              {RoleRoutes({ base: "/client" })}
            </Route>

            {/* AGENT */}
            <Route element={<ProtectedRoute allow={["agent", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/agent" element={<AgentDashboard />} />
              {RoleRoutes({ base: "/agent" })}
              <Route path="/agent/quotes" element={<ListeCotations basePath="/agent" />} />
              <Route path="/agent/attestations" element={<StockAttestations />} />
              <Route path="/agent/renouvellements" element={<Renouvellements basePath="/agent" />} />
              <Route path="/agent/bordereaux" element={<Bordereaux />} />
            </Route>

            {/* COURTIER */}
            <Route element={<ProtectedRoute allow={["courtier", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/courtier" element={<CourtierDashboard />} />
              {RoleRoutes({ base: "/courtier" })}
              <Route path="/courtier/compagnies" element={<MesAccesCompagnies />} />
              <Route path="/courtier/renouvellements" element={<Renouvellements basePath="/courtier" />} />
              <Route path="/courtier/bordereaux" element={<Bordereaux />} />
            </Route>

            {/* ASSUREUR */}
            <Route element={<ProtectedRoute allow={["assureur", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/assureur" element={<AssureurDashboard />} />
              {RoleRoutes({ base: "/assureur" })}
              <Route path="/assureur/portefeuille" element={<Portefeuille />} />
              <Route path="/assureur/reseau" element={<Reseau />} />
              <Route path="/assureur/demandes-courtiers" element={<DemandesCourtiers />} />
              <Route path="/assureur/attestations" element={<StockAttestations />} />
              <Route path="/assureur/renouvellements" element={<Renouvellements basePath="/assureur" />} />
              <Route path="/assureur/bordereaux" element={<Bordereaux />} />
            </Route>

            {/* SUPER ADMIN */}
            <Route element={<ProtectedRoute allow={["super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              {RoleRoutes({ base: "/admin" })}
              <Route path="/admin/compagnies" element={<Compagnies />} />
              <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
              <Route path="/admin/roles" element={<Roles />} />
              <Route path="/admin/logs" element={<Logs />} />
              <Route path="/admin/parametres" element={<Parametres />} />
            </Route>

            {/* GARAGE */}
            <Route element={<ProtectedRoute allow={["garage", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/garage" element={<GarageDashboard />} />
              <Route path="/garage/sinistres" element={<DossiersSinistres />} />
              <Route path="/garage/factures" element={<Factures />} />
              <Route path="/garage/messages" element={<Messagerie />} />
            </Route>

            {/* EXPERT */}
            <Route element={<ProtectedRoute allow={["expert", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/expert" element={<ExpertDashboard />} />
              <Route path="/expert/missions" element={<Missions />} />
              <Route path="/expert/rapport/:claimId" element={<RapportExpertise />} />
              <Route path="/expert/messages" element={<Messagerie />} />
            </Route>

            {/* HOPITAL */}
            <Route element={<ProtectedRoute allow={["hopital", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/hopital" element={<HopitalDashboard />} />
              <Route path="/hopital/dossiers" element={<ListeDossiers />} />
              <Route path="/hopital/dossiers/nouveau" element={<NouveauDossier />} />
              <Route path="/hopital/messages" element={<Messagerie />} />
            </Route>

            {/* PHARMACIE */}
            <Route element={<ProtectedRoute allow={["pharmacie", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/pharmacie" element={<PharmacieDashboard />} />
              <Route path="/pharmacie/dispensation" element={<NouvelleDispensation />} />
              <Route path="/pharmacie/historique" element={<Historique />} />
              <Route path="/pharmacie/messages" element={<Messagerie />} />
            </Route>

            {/* AUTORITE */}
            <Route element={<ProtectedRoute allow={["autorite", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/autorite" element={<AutoriteDashboard />} />
              <Route path="/autorite/depot" element={<DepotDocument />} />
              <Route path="/autorite/documents" element={<MesDocuments />} />
              <Route path="/autorite/verification" element={<VerificationAttestation />} />
              <Route path="/autorite/messages" element={<Messagerie />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
