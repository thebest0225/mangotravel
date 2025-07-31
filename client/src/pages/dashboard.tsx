import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PlanCard } from "@/components/travel/plan-card";
import { Map, CheckCircle, ChevronRight, Navigation } from "lucide-react";
import type { TravelPlan, SavedPlace, LocationLabel } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  const { data: travelPlans, isLoading: plansLoading } = useQuery<TravelPlan[]>({
    queryKey: ["/api/travel-plans"],
  });

  const { data: savedPlaces, isLoading: placesLoading } = useQuery<SavedPlace[]>({
    queryKey: ["/api/saved-places"],
  });

  const { data: locationLabels } = useQuery<LocationLabel[]>({
    queryKey: ["/api/location-labels"],
  });

  // 진행중인 계획: planning(계획중) + active(진행중) 상태 모두 포함
  const activePlans = travelPlans?.filter(plan => 
    plan.status === 'active' || plan.status === 'planning'
  ) || [];
  const completedPlans = travelPlans?.filter(plan => plan.status === 'completed') || [];
  const currentPlans = travelPlans?.filter(plan => 
    plan.status === 'active' || plan.status === 'planning'
  ) || [];

  // Get the most recent upcoming plan for the "가장 가까운 여행 일정" section
  const upcomingPlan = currentPlans
    .filter(plan => new Date(plan.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="MangoTravel" />
        <main className="pb-20 px-4 py-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="MangoTravel" />
      
      <main className="pb-20">
        <div className="px-3 py-4">


          {/* Travel Plans Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">일정</h3>
            </div>

            {currentPlans && currentPlans.length > 0 ? (
              <div className="space-y-3">
                {currentPlans
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((plan, index) => (
                    <PlanCard key={plan.id} plan={plan} sortIndex={index} />
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 mb-2 text-sm">예정된 여행이 없습니다.</p>
                  <p className="text-xs text-gray-400">
                    + 버튼을 눌러 새로운 여행 계획을 만들어보세요!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Map className="w-4 h-4 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">계획중/진행중</p>
                    <p className="text-base font-semibold text-gray-900">
                      {activePlans.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">완료된 여행</p>
                    <p className="text-base font-semibold text-gray-900">
                      {completedPlans.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
