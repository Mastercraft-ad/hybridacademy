import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchoolProvider } from "@/hooks/useSchool";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Schools from "@/pages/Schools";
import Classes from "@/pages/Classes";
import Students from "@/pages/Students";
import Subjects from "@/pages/Subjects";
import ScoreEntry from "@/pages/ScoreEntry";
import ReportCards from "@/pages/ReportCards";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <SchoolProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/schools" component={Schools} />
          <Route path="/classes" component={Classes} />
          <Route path="/students" component={Students} />
          <Route path="/subjects" component={Subjects} />
          <Route path="/scores" component={ScoreEntry} />
          <Route path="/reportcards" component={ReportCards} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </SchoolProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
