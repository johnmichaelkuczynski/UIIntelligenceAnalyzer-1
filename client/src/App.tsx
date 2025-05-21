import { Route, Switch } from 'wouter';
import { ProfilerPage } from './pages/ProfilerPage';

function Navigation() {
  return (
    <nav className="bg-blue-500 py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <a href="/" className="text-white text-xl font-bold">Cognitive Profiler</a>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProfilerPage} />
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow">
        <Router />
      </main>
    </div>
  );
}

export default App;