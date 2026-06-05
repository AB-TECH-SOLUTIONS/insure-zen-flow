import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck, Building2, Users, FileCheck, BarChart3, MessagesSquare,
  Stamp, Globe2, ArrowRight, CheckCircle2, Smartphone, Wrench,
} from "lucide-react";

const features = [
  { icon: FileCheck, title: "Cotation en 2 minutes", desc: "Auto, voyage, risques divers : barèmes CIMA prêts à l'emploi." },
  { icon: Smartphone, title: "Paiement Mobile Money", desc: "MTN MoMo & Orange Money intégrés pour vos clients camerounais." },
  { icon: Stamp, title: "Documents officiels", desc: "Conditions particulières, Carte Rose CEMAC, reçus en un clic." },
  { icon: BarChart3, title: "Pilotage temps réel", desc: "CA, sinistralité, renouvellements, top agents — tout en un dashboard." },
  { icon: MessagesSquare, title: "Sinistres en ligne", desc: "Déclaration, expertise, règlement avec suivi client transparent." },
  { icon: Globe2, title: "Conçu pour la zone CIMA", desc: "Carte Rose, fichier central, taxes et fiscalité alignés." },
];

const audiences = [
  { icon: ShieldCheck, title: "Clients", desc: "Comparez, souscrivez, payez, déclarez vos sinistres." },
  { icon: Users, title: "Agents généraux", desc: "Gérez cotations et contrats d'une compagnie." },
  { icon: Users, title: "Courtiers", desc: "Travaillez avec plusieurs compagnies." },
  { icon: Building2, title: "Assureurs", desc: "Vue 360° de votre portefeuille et de votre réseau." },
  { icon: Wrench, title: "Garages & experts", desc: "Devis, rapports, factures électroniques." },
];

const cemac = [
  { code: "CM", nom: "Cameroun" },
  { code: "CG", nom: "Congo" },
  { code: "GA", nom: "Gabon" },
  { code: "CF", nom: "RCA" },
  { code: "TD", nom: "Tchad" },
  { code: "GQ", nom: "Guinée Éq." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InsureZen Flow",
  applicationCategory: "InsuranceSoftware",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "XAF" },
  inLanguage: "fr",
  areaServed: ["CM", "CG", "GA", "CF", "TD", "GQ"],
  description:
    "Plateforme d'assurance digitale pour la zone CEMAC : cotation, souscription, paiement Mobile Money, gestion sinistres.",
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>InsureZen Flow — Plateforme d'assurance Cameroun & CEMAC</title>
        <meta name="description" content="Cotation en 2 minutes, paiement Mobile Money, gestion sinistres en ligne. La plateforme tout-en-un pour le marché CEMAC." />
        <link rel="canonical" href="https://insure-zen-flow.lovable.app/" />
        <meta property="og:title" content="InsureZen Flow — Assurance digitale CEMAC" />
        <meta property="og:description" content="Cotation, paiement Mobile Money, sinistres en ligne." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://insure-zen-flow.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">InsureZen Flow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-primary transition">Fonctionnalités</a>
            <a href="#audiences" className="hover:text-primary transition">Pour qui</a>
            <a href="#process" className="hover:text-primary transition">Processus</a>
            <a href="#cemac" className="hover:text-primary transition">Marchés</a>
            <a href="#contact" className="hover:text-primary transition">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Connexion</Link></Button>
            <Button asChild size="sm" className="bg-gradient-primary"><Link to="/auth">Commencer</Link></Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          La plateforme nouvelle génération pour la CEMAC
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
          La plateforme d'assurance qui <span className="bg-gradient-primary bg-clip-text text-transparent">révolutionne le marché CEMAC</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cotation en 2 minutes • Paiement Mobile Money • Gestion sinistres en ligne
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
            <Link to="/auth">Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline"><a href="#features">Voir une démo</a></Button>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs">
          {["11 types d'acteurs", "Conformité CIMA", "Mobile Money intégré"].map((b) => (
            <span key={b} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-3 py-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> {b}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-3">Tout ce dont vous avez besoin</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Une suite complète pensée pour le marché africain : barèmes CIMA, Carte Rose CEMAC, multi-compagnies, multi-rôles.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover:border-primary/40 transition">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="process" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Souscrire en 3 étapes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "1", t: "Cotation", d: "Renseignez votre véhicule ou voyage, obtenez un tarif CIMA en 2 min." },
            { n: "2", t: "Souscription", d: "Payez par Mobile Money, virement ou chez votre agent." },
            { n: "3", t: "Attestation", d: "Recevez Conditions particulières et Carte Rose CEMAC en PDF." },
          ].map((s) => (
            <Card key={s.n} className="p-6 text-center">
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl">{s.n}</div>
              <h3 className="font-semibold mb-1">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="audiences" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Qui utilise InsureZen Flow ?</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {audiences.map((a) => (
            <Card key={a.title} className="p-5 text-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary mx-auto mb-3 flex items-center justify-center shadow-glow">
                <a.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold mb-1">{a.title}</h3>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="cemac" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-3">Marchés couverts</h2>
        <p className="text-center text-muted-foreground mb-12">Les 6 pays de la zone CEMAC.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
          {cemac.map((p) => (
            <Card key={p.code} className="p-4 text-center">
              <div className="font-display font-bold text-lg">{p.code}</div>
              <div className="text-xs text-muted-foreground">{p.nom}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold mb-4">Conçu en Afrique, pour l'Afrique</h2>
            <p className="text-muted-foreground mb-6">
              InsureZen Flow respecte les exigences réglementaires du Code CIMA et s'adapte aux pratiques locales :
              Mobile Money, Carte Rose CEMAC, fichier central, fiscalité spécifique.
            </p>
            <ul className="space-y-3">
              {[
                "Barèmes auto, voyage et risques divers paramétrables",
                "Multi-compagnies avec workflow d'approbation pour courtiers",
                "Documents PDF officiels prêts à imprimer",
                "Rôles dédiés : garages, experts, hôpitaux, autorités",
                "Sécurité renforcée (RLS, anti-mots-de-passe compromis)",
              ].map((l) => (
                <li key={l} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" /> <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 bg-gradient-primary text-primary-foreground shadow-glow">
            <ShieldCheck className="h-10 w-10 mb-4 opacity-80" />
            <h3 className="font-display text-2xl font-bold mb-2">Prêt à digitaliser ?</h3>
            <p className="opacity-90 mb-6">Contactez-nous pour une démonstration personnalisée et un essai pilote.</p>
            <Button asChild variant="secondary" size="lg">
              <Link to="/auth">Créer un compte <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </Card>
        </div>
      </section>

      <footer id="contact" className="border-t border-border/40 mt-16">
        <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">InsureZen Flow</span>
            </div>
            <p className="text-muted-foreground">ERP d'assurance pour la zone CEMAC.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-muted-foreground">contact@insurezenflow.com</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Légal</h4>
            <p className="text-muted-foreground">Conformité Code CIMA • RGPD</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Accès</h4>
            <Link to="/auth" className="text-muted-foreground hover:text-primary">Connexion / Inscription</Link>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} InsureZen Flow. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}