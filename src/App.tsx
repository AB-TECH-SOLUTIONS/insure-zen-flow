import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";

// Layout reste eager (utilisé dès la 1ère route protégée)
import AppLayout from "@/components/layout/AppLayout";

// Pages publiques — petites, gardées eager pour 1er paint
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Toutes les autres pages en lazy → code splitting par route
const ClientDashboard = lazy(() => import("./pages/dashboards/ClientDashboard"));
const AgentDashboard = lazy(() => import("./pages/dashboards/AgentDashboard"));
const CourtierDashboard = lazy(() => import("./pages/dashboards/CourtierDashboard"));
const AssureurDashboard = lazy(() => import("./pages/dashboards/AssureurDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const GarageDashboard = lazy(() => import("./pages/dashboards/GarageDashboard"));
const ExpertDashboard = lazy(() => import("./pages/dashboards/ExpertDashboard"));
const HopitalDashboard = lazy(() => import("./pages/dashboards/HopitalDashboard"));
const PharmacieDashboard = lazy(() => import("./pages/dashboards/PharmacieDashboard"));
const AutoriteDashboard = lazy(() => import("./pages/dashboards/AutoriteDashboard"));

const NouvelleCotationAuto = lazy(() => import("./pages/cotations/NouvelleCotationAuto"));
const NouvelleCotationVoyage = lazy(() => import("./pages/cotations/NouvelleCotationVoyage"));
const NouvelleCotationVie = lazy(() => import("./pages/cotations/NouvelleCotationVie"));
const SelecteurProduit = lazy(() => import("./pages/cotations/SelecteurProduit"));
const ListeCotations = lazy(() => import("./pages/cotations/ListeCotations"));
const DetailCotation = lazy(() => import("./pages/cotations/DetailCotation"));
const ListeContrats = lazy(() => import("./pages/contrats/ListeContrats"));
const DetailContrat = lazy(() => import("./pages/contrats/DetailContrat"));
const ListePaiements = lazy(() => import("./pages/paiements/ListePaiements"));
const ListeClients = lazy(() => import("./pages/clients/ListeClients"));
const NouveauClient = lazy(() => import("./pages/clients/NouveauClient"));
const DetailClient = lazy(() => import("./pages/clients/DetailClient"));
const ListeVehicules = lazy(() => import("./pages/vehicules/ListeVehicules"));
const Messagerie = lazy(() => import("./pages/messages/Messagerie"));
const ListeSinistres = lazy(() => import("./pages/sinistres/ListeSinistres"));
const DetailSinistre = lazy(() => import("./pages/sinistres/DetailSinistre"));
const StockAttestations = lazy(() => import("./pages/attestations/StockAttestations"));
const ImportExport = lazy(() => import("./pages/import-export/ImportExport"));
const ListeTaches = lazy(() => import("./pages/taches/ListeTaches"));
const SuiviCA = lazy(() => import("./pages/finance/SuiviCA"));
const EspaceClient = lazy(() => import("./pages/client/EspaceClient"));
const CotationAutoClient = lazy(() => import("./pages/client/CotationAutoClient"));
const CotationVoyageClient = lazy(() => import("./pages/client/CotationVoyageClient"));
const CotationVieClient = lazy(() => import("./pages/client/CotationVieClient"));
const MesAccesCompagnies = lazy(() => import("./pages/courtier/MesAccesCompagnies"));
const DemandesCourtiers = lazy(() => import("./pages/assureur/DemandesCourtiers"));
const Equipe = lazy(() => import("./pages/equipe/Equipe"));
const AcceptInvitation = lazy(() => import("./pages/invitation/AcceptInvitation"));
const EmailConfirmation = lazy(() => import("./pages/auth/EmailConfirmation"));
const Logs = lazy(() => import("./pages/admin/Logs"));
const Renouvellements = lazy(() => import("./pages/contrats/Renouvellements"));
const Bordereaux = lazy(() => import("./pages/finance/Bordereaux"));
const Compagnies = lazy(() => import("./pages/admin/Compagnies"));
const Utilisateurs = lazy(() => import("./pages/admin/Utilisateurs"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Parametres = lazy(() => import("./pages/admin/Parametres"));
const ParametresConfig = lazy(() => import("./pages/admin/ParametresConfig"));
const AIConfig = lazy(() => import("./pages/admin/AIConfig"));
const Portefeuille = lazy(() => import("./pages/assureur/Portefeuille"));
const Reseau = lazy(() => import("./pages/assureur/Reseau"));
const DossiersSinistres = lazy(() => import("./pages/garage/DossiersSinistres"));
const Factures = lazy(() => import("./pages/garage/Factures"));
const Missions = lazy(() => import("./pages/expert/Missions"));
const RapportExpertise = lazy(() => import("./pages/expert/RapportExpertise"));
const NouveauDossier = lazy(() => import("./pages/hopital/NouveauDossier"));
const ListeDossiers = lazy(() => import("./pages/hopital/ListeDossiers"));
const NouvelleDispensation = lazy(() => import("./pages/pharmacie/NouvelleDispensation"));
const Historique = lazy(() => import("./pages/pharmacie/Historique"));
const DepotDocument = lazy(() => import("./pages/autorite/DepotDocument"));
const MesDocuments = lazy(() => import("./pages/autorite/MesDocuments"));
const VerificationAttestation = lazy(() => import("./pages/autorite/VerificationAttestation"));
const MesCommissions = lazy(() => import("./pages/courtier/MesCommissions"));
const CarteAssure = lazy(() => import("./pages/client/CarteAssure"));
const ConstatAmiable = lazy(() => import("./pages/sinistres/ConstatAmiable"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, retryDelay: 1000, staleTime: 30_000 },
  },
});

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
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<EmailConfirmation />} />
            <Route path="/invitation/:token" element={<AcceptInvitation />} />

            {/* CLIENT */}
            <Route element={<ProtectedRoute allow={["client", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/espace" element={<EspaceClient />} />
              <Route path="/client/carte" element={<CarteAssure />} />
              <Route path="/client/constats/nouveau" element={<ConstatAmiable />} />
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
              <Route path="/agent/constats/nouveau" element={<ConstatAmiable />} />
            </Route>

            {/* COURTIER */}
            <Route element={<ProtectedRoute allow={["courtier", "super_admin"]}><AppLayout /></ProtectedRoute>}>
              <Route path="/courtier" element={<CourtierDashboard />} />
              {RoleRoutes({ base: "/courtier" })}
              <Route path="/courtier/compagnies" element={<MesAccesCompagnies />} />
              <Route path="/courtier/commissions" element={<MesCommissions />} />
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
              <Route path="/admin/configuration" element={<ParametresConfig />} />
              <Route path="/admin/ai-config" element={<AIConfig />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
