import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { TravelPlan } from "@shared/schema";


interface PlanCardProps {
  plan: TravelPlan;
  sortIndex?: number; // 정렬된 순서 인덱스
}

export function PlanCard({ plan, sortIndex = 0 }: PlanCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // 가장 가까운 여행일정(sortIndex 0)만 기본으로 펼쳐진 상태
  const [isExpanded, setIsExpanded] = useState(sortIndex === 0);

  const deleteMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiRequest("DELETE", `/api/travel-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans"] });
      toast({
        title: "여행 계획 삭제 완료",
        description: "여행 계획이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "여행 계획을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`"${plan.title}" 여행 계획을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  // Calculate D-Day
  const calculateDDay = (startDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `D-${diffDays}`;
    } else if (diffDays === 0) {
      return "오늘 출발!";
    } else {
      return "여행중";
    }
  };

  // Calculate trip duration
  const calculateTripDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    
    if (diffDays === 1) {
      return "당일 여행";
    } else {
      const nights = diffDays - 1;
      return `${nights}박 ${diffDays}일`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "planning": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "진행중";
      case "planning": return "계획중";
      case "completed": return "완료";
      default: return status;
    }
  };

  // Calculate background color based on sort order (different warm colors)
  const getBackgroundGradient = (index: number) => {
    switch (index) {
      case 0:
        // 가장 가까운 일정 - 오렌지 (원래 색상)
        return "from-orange-400 to-amber-500";
      case 1:
        // 두 번째 일정 - 레드-오렌지
        return "from-red-400 to-orange-500";
      case 2:
        // 세 번째 일정 - 핑크-레드
        return "from-pink-400 to-red-500";
      case 3:
        // 네 번째 일정 - 퍼플-핑크
        return "from-purple-400 to-pink-500";
      case 4:
        // 다섯 번째 일정 - 인디고-퍼플
        return "from-indigo-400 to-purple-500";
      case 5:
        // 여섯 번째 일정 - 블루-인디고
        return "from-blue-400 to-indigo-500";
      default:
        // 일곱 번째 이후 - 시안-블루
        return "from-cyan-400 to-blue-500";
    }
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className={`h-16 bg-gradient-to-r ${getBackgroundGradient(sortIndex)} relative cursor-pointer`}
        onClick={(e) => {
          // 버튼들이 클릭된 경우가 아닐 때만 접기/펼치기 동작
          if (!(e.target as HTMLElement).closest('button')) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="absolute top-2 left-2">
          <span className="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full text-[10px]">
            {calculateDDay(plan.startDate)}
          </span>
        </div>
        
        {/* 제목을 배경색 부분에 배치 */}
        <div className="absolute bottom-2 left-2">
          <h4 className="font-semibold text-white text-base drop-shadow-md">{plan.title}</h4>
        </div>
        
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          <span className={`${getStatusColor(plan.status)} text-white text-xs px-2 py-1 rounded-full`}>
            {getStatusLabel(plan.status)}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors disabled:opacity-50"
            title="여행 계획 삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {/* 접기 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-full transition-colors"
            title={isExpanded ? "접기" : "펼치기"}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {/* 접기 가능한 콘텐츠 */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <CardContent className="p-2">
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{plan.startDate} - {plan.endDate}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Users className="w-4 h-4 mr-1" />
            <span>
              {Array.isArray(plan.participants) 
                ? plan.participants.map((p: any) => typeof p === 'string' ? p : p.name).join(', ')
                : plan.participants
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              <span>{calculateTripDuration(plan.startDate, plan.endDate)}</span>
            </div>
            <Button
              onClick={() => setLocation(`/plan/${plan.id}`)}
              className="bg-primary-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-primary-600"
            >
              일정 보기
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
