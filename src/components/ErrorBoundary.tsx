import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    // Hook Sentry ici si VITE_SENTRY_DSN configuré
  }

  reset = () => { this.setState({ error: null }); window.location.reload(); };

  report = () => {
    const body = encodeURIComponent(
      `Erreur: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack ?? ""}`
    );
    window.location.href = `mailto:support@insurezen.flow?subject=Signalement%20bug&body=${body}`;
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground">
            Nous sommes désolés pour la gêne. L'incident a été enregistré.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-left bg-muted p-3 rounded overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={this.reset}>Recharger l'application</Button>
            <Button variant="outline" onClick={this.report}>Signaler un problème</Button>
          </div>
        </div>
      </div>
    );
  }
}