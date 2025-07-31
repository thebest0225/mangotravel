import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/auth/auth-guard";
import Dashboard from "@/pages/dashboard";
import PlanDetail from "@/pages/plan-detail";
import NewPlan from "@/pages/new-plan";
import PlaceSearch from "@/pages/place-search";
import Login from "@/pages/login";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  
  // 로그인 페이지는 인증 없이 접근 가능
  if (location === '/login') {
    return <Login />;
  }
  
  // 나머지 페이지는 인증 필요
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/plan/:id" component={PlanDetail} />
        <Route path="/new-plan" component={NewPlan} />
        <Route path="/place-search" component={PlaceSearch} />
        <Route path="/saved" component={PlaceSearch} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-md mx-auto bg-white min-h-screen border-x border-gray-200">
            <Router />
          </div>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
