import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck, Building2, Users, FileCheck, BarChart3, MessagesSquare,
  Stamp, Globe2, ArrowRight, CheckCircle2,
} from "lucide-react";

const features = [
  { icon: FileCheck, title: "Cotation & souscription", desc: "Auto, voyage, risques divers : barèmes CIMA prêts à l'emploi." },
  { icon: BarChart3, title: "Suivi du chiffre d'affaires", desc: "Comparaisons M/M, A/A et taux de réalisation vs objectifs." },
  { icon: Stamp, title: "Documents officiels", desc: "Conditions particulières, Carte Rose CEMAC, reçus en un clic." },
  { icon: Users, title: "Multi-rôles", desc: "Compagnies, agents, courtiers, clients et tiers (garages, experts, autorités)." },
  { icon: MessagesSquare, title: "Messagerie & notifications", desc: "Échanges internes en temps réel, alertes ciblées par rôle." },
  { icon: Globe2, title: "Conçu pour la zone CIMA", desc: "Carte Rose, fichier central, taxes et fiscalité alignés." },
];

const audiences = [
  { icon: Building2, title: "Compagnies d'assurance", desc: "Pilotez votre portefeuille, votre réseau et vos bordereaux." },
  { icon: Users, title: "Agents & courtiers", desc: "Cotez plus vite, encaissez mieux, fidélisez vos clients." },
  { icon: ShieldCheck, title: "Clients particuliers", desc: "Souscrivez en ligne, suivez vos contrats et déclarez vos sinistres." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">InsureFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-primary transition">Fonctionnalités</a>
            <a href="#audiences" className="hover:text-primary transition">Pour qui</a>
            <a href="#contact" className="hover:text-primary transition">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Connexion</Link></Button>
            <Button asChild size="sm" className="bg-gradient-primary"><Link to="/auth">Démarrer</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          ERP assurance pour la zone CIMA
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
          La plateforme tout-en-un pour <span className="bg-gradient-primary bg-clip-text text-transparent">digitaliser votre activité d'assurance</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cotation, souscription, encaissement, sinistres, bordereaux et pilotage du chiffre d'affaires
          — pour compagnies, agents généraux, courtiers et clients.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
            <Link to="/auth">Demander un accès <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline"><a href="#features">Voir les fonctionnalités</a></Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-3">Tout ce dont vous avez besoin</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Une suite complète pensée pour le marché africain : barèmes CIMA, Carte Rose CEMAC,
          multi-compagnies, multi-rôles.
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

      {/* Audiences */}
      <section id="audiences" className="container mx-auto px-4 py-16 border-t border-border/40">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Une solution, plusieurs métiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {audiences.map((a) => (
            <Card key={a.title} className="p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                <a.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="container mx-auto px-4 py-16 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold mb-4">Conçu en Afrique, pour l'Afrique</h2>
            <p className="text-muted-foreground mb-6">
              InsureFlow respecte les exigences réglementaires du Code CIMA et s'adapte aux pratiques
              locales : Mobile Money, Carte Rose CEMAC, fichier central, fiscalité spécifique.
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

      {/* Footer */}
      <footer id="contact" className="border-t border-border/40 mt-16">
        <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">InsureFlow</span>
            </div>
            <p className="text-muted-foreground">ERP d'assurance pour la zone CIMA.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-muted-foreground">contact@insureflow.africa</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Accès</h4>
            <Link to="/auth" className="text-muted-foreground hover:text-primary">Connexion / Inscription</Link>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} InsureFlow. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}