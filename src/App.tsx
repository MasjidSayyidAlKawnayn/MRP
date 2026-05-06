import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { AuthPanel } from "./components/AuthPanel";
import { authClient } from "./auth/client";

export default function App() {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      <main className="min-h-screen bg-paper text-ink">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
          <AuthPanel />
        </div>
      </main>
    </NeonAuthUIProvider>
  );
}
