import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import TranslationPage from "@/pages/TranslationPage";
import RewritePage from "@/pages/RewritePage";
import WebSearchPage from "@/pages/WebSearchPage";
import SimpleDirectPage from "@/pages/SimpleDirectPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import OriginalityMeter from "@/pages/OriginalityMeter";
import NotFound from "@/pages/not-found";
import { BrainCircuit, Languages, FileEdit, Globe, Bot, Brain, Lightbulb } from "lucide-react";

function Navigation() {
  return (
    <nav className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">Originality Meter</div>
        <ul className="flex gap-6">
          <li>
            <Link href="/" className="flex items-center gap-2 hover:underline">
              <Lightbulb className="h-5 w-5" />
              <span>Originality Meter</span>
            </Link>
          </li>
          <li>
            <Link href="/analytics" className="flex items-center gap-2 hover:underline">
              <Brain className="h-5 w-5" />
              <span>Cognitive Analytics</span>
            </Link>
          </li>
          <li>
            <Link href="/direct" className="flex items-center gap-2 hover:underline">
              <Bot className="h-5 w-5" />
              <span>Direct AI Rewrite</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={OriginalityMeter} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/direct" component={SimpleDirectPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
