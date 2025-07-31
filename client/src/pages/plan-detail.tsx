import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FlightInfoComponent } from "@/components/travel/flight-info";
import { EssentialsChecklist } from "@/components/travel/essentials-checklist";
import { DailySchedule } from "@/components/travel/daily-schedule";
import { ScheduleForm } from "@/components/travel/schedule-form";
import { ScheduleEditForm } from "@/components/travel/schedule-edit-form";
import { PlanEditForm } from "@/components/travel/plan-edit-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CalendarDays, Edit2, Plus, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelPlan, ScheduleItem, EssentialItem, FlightInfo, Participant } from "@shared/schema";

export default function PlanDetail() {
  const [, params] = useRoute("/plan/:id");
  const planId = params?.id ? parseInt(params.id) : null;
  
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isPlanEditOpen, setIsPlanEditOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const { toast } = useToast();
  
  // 스와이프 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: plan, isLoading: planLoading } = useQuery<TravelPlan>({
    queryKey: ["/api/travel-plans", planId],
    enabled: !!planId,
  });

  const { data: scheduleItems, isLoading: scheduleLoading } = useQuery<ScheduleItem[]>({
    queryKey: ["/api/travel-plans", planId, "schedule"],
    enabled: !!planId,
  });

  const updateEssentialItemsMutation = useMutation({
    mutationFn: async (updatedItems: EssentialItem[]) => {
      const response = await apiRequest("PATCH", `/api/travel-plans/${planId}/essential-items`, {
        essentialItems: updatedItems
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", planId] });
    }
  });

  const updateParticipantsMutation = useMutation({
    mutationFn: async (participants: Participant[]) => {
      const response = await apiRequest("PATCH", `/api/travel-plans/${planId}`, {
        participants
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", planId] });
      toast({
        title: "참가자 업데이트 완료",
        description: "참가자 목록이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "업데이트 실패",
        description: "참가자 목록 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });



  // 모든 Hook을 조건부 렌더링 전에 호출
  const planDays = plan ? (() => {
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      return {
        index,
        date: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        displayDay: `Day ${index + 1}`,
        dayOfWeek: `(${dayOfWeek})`,
      };
    });
  })() : [];

  // 현재 날짜에 따른 기본 선택 날짜 설정
  useEffect(() => {
    if (!plan || planDays.length === 0) return;
    
    const today = new Date();
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    
    // 오늘이 여행 기간 안에 있는지 확인
    if (today >= startDate && today <= endDate) {
      // 여행 기간 중이면 오늘에 해당하는 날짜 인덱스 찾기
      const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const targetDay = Math.max(0, Math.min(daysDiff, planDays.length - 1));
      setSelectedDay(targetDay);
    } else {
      // 여행 전이거나 후면 첫날(0) 유지
      setSelectedDay(0);
    }
  }, [plan?.startDate, plan?.endDate, planDays.length]);

  if (!planId) {
    return <div>Invalid plan ID</div>;
  }

  if (planLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="로딩중..." showBack />
        <main className="pb-20 px-4 py-6">
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="계획을 찾을 수 없음" showBack />
        <main className="pb-20 px-4 py-6">
          <p className="text-center text-gray-500">여행 계획을 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  // Get schedule items for selected day
  const selectedDate = planDays[selectedDay]?.date;
  const dayScheduleItems = scheduleItems?.filter(item => item.date === selectedDate) || [];

  // Parse flight info and essential items
  const flightInfo = plan.flightInfo as FlightInfo | null;
  const essentialItems = (plan.essentialItems as EssentialItem[]) || [];

  const handleToggleEssentialItem = (itemId: string, checked: boolean) => {
    const updatedItems = essentialItems.map(item => 
      item.id === itemId ? { ...item, checked } : item
    );
    
    updateEssentialItemsMutation.mutate(updatedItems);
    toast({
      title: checked ? "체크 완료" : "체크 해제",
      description: "준비물 상태가 업데이트되었습니다.",
    });
  };

  const handleUpdateEssentialItem = (itemId: string, updates: Partial<EssentialItem>) => {
    const updatedItems = essentialItems.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    updateEssentialItemsMutation.mutate(updatedItems);
    toast({
      title: "파일 첨부 완료",
      description: "준비물에 파일이 첨부되었습니다.",
    });
  };

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStart;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 50; // 최소 스와이프 거리
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && selectedDay > 0) {
        // 오른쪽 스와이프 - 이전 날
        setSelectedDay(selectedDay - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 상단으로 스크롤
      } else if (dragOffset < 0 && selectedDay < planDays.length - 1) {
        // 왼쪽 스와이프 - 다음 날
        setSelectedDay(selectedDay + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 상단으로 스크롤
      }
    }
    
    setDragOffset(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStart;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 50;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && selectedDay > 0) {
        setSelectedDay(selectedDay - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 상단으로 스크롤
      } else if (dragOffset < 0 && selectedDay < planDays.length - 1) {
        setSelectedDay(selectedDay + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 상단으로 스크롤
      }
    }
    
    setDragOffset(0);
  };

  // 기존 문자열 형태의 참가자를 Participant 객체 배열로 변환하는 헬퍼 함수
  const convertParticipantsToArray = (participants: any): Participant[] => {
    if (!participants) return [];
    
    if (Array.isArray(participants)) {
      // 이미 Participant 객체 배열인 경우
      return participants;
    }
    
    if (typeof participants === 'string') {
      // 문자열인 경우 쉼표로 분리하여 Participant 객체 배열로 변환
      return participants.split(',').map((name: string, index: number) => ({
        name: name.trim(),
        role: index === 0 ? 'leader' : 'member' // 첫 번째 참가자를 리더로 설정
      }));
    }
    
    return [];
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim() || !plan) return;
    
    const currentParticipants = convertParticipantsToArray(plan.participants);
    const newParticipant: Participant = {
      name: newParticipantName.trim(),
      role: "member"
    };
    
    const updatedParticipants = [...currentParticipants, newParticipant];
    updateParticipantsMutation.mutate(updatedParticipants);
    setNewParticipantName("");
  };

  const handleRemoveParticipant = (index: number) => {
    if (!plan) return;
    
    const currentParticipants = convertParticipantsToArray(plan.participants);
    const updatedParticipants = currentParticipants.filter((_, i) => i !== index);
    updateParticipantsMutation.mutate(updatedParticipants);
  };

  const getCalendarData = () => {
    if (!scheduleItems || !plan) return {};
    
    const calendarData: { [date: string]: ScheduleItem[] } = {};
    
    scheduleItems.forEach(item => {
      if (!calendarData[item.date]) {
        calendarData[item.date] = [];
      }
      calendarData[item.date].push(item);
    });
    
    // 날짜별로 시간순 정렬
    Object.keys(calendarData).forEach(date => {
      calendarData[date].sort((a, b) => {
        const getTimeValue = (time: string | null) => {
          if (!time) return 0;
          
          // HH:MM 형식인 경우
          if (typeof time === 'string' && time.includes(':')) {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          }
          
          // Date 객체인 경우
          try {
            return new Date(time).getTime();
          } catch {
            return 0;
          }
        };
        
        const timeA = getTimeValue(a.time);
        const timeB = getTimeValue(b.time);
        return timeA - timeB;
      });
    });
    
    return calendarData;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title={plan.title} 
        showBack 
        rightActions={
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsParticipantsOpen(true)}
              title="참가자 관리"
            >
              <Users className="h-5 w-5 text-gray-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsCalendarOpen(true)}
              title="전체 일정 보기"
            >
              <Calendar className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        }
      />

      <main className="pb-20">
        {/* Plan Header Info */}
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                계획중
              </div>
              <button
                onClick={() => setIsPlanEditOpen(true)}
                className="p-1 text-orange-600 hover:text-orange-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{plan.startDate} - {plan.endDate}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>
                {(() => {
                  const participants = convertParticipantsToArray(plan.participants);
                  return `${participants.length}명`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Itinerary */}
        <div className="px-4 py-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarDays className="mr-2 text-primary-500" />
            일정표
          </h3>

          {/* Day Indicator */}
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              {planDays.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    selectedDay === index ? "bg-primary-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Swipeable Day Cards */}
          <div className="relative overflow-hidden">
            <div 
              ref={containerRef}
              className="flex transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
              style={{ 
                transform: `translateX(-${selectedDay * 100}%) translateX(${dragOffset}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {planDays.map((day, index) => {
                const dayScheduleItems = scheduleItems?.filter(item => item.date === day.date) || [];
                
                return (
                  <div key={day.index} className="w-full flex-shrink-0 px-2">
                    <div className={`bg-white rounded-lg border border-gray-200 p-4 mb-4 ${
                      dayScheduleItems.length === 0 ? 'min-h-0' : 'min-h-[400px]'
                    }`}>
                      {/* Day Header */}
                      <div className="text-center mb-3 pb-2 border-b border-gray-100">
                        <h4 className="font-semibold text-lg text-gray-900">
                          {day.displayDay}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {day.displayDate} {day.dayOfWeek}
                        </p>
                      </div>

                      {/* Day Schedule */}
                      {scheduleLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-20" />
                          <Skeleton className="h-20" />
                        </div>
                      ) : (
                        <div className={dayScheduleItems.length === 0 ? "space-y-2" : "space-y-4"}>
                          <DailySchedule 
                            scheduleItems={dayScheduleItems}
                            date={day.date}
                            planId={planId}
                            onEditItem={setEditingItem}
                          />
                          <ScheduleForm 
                            planId={planId}
                            date={day.date}
                            onSuccess={() => {
                              toast({
                                title: "일정 추가 완료",
                                description: "새로운 일정이 추가되었습니다.",
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDay(Math.max(0, selectedDay - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={selectedDay === 0}
              className="flex items-center space-x-2"
            >
              <span>← 이전</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDay(Math.min(planDays.length - 1, selectedDay + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={selectedDay === planDays.length - 1}
              className="flex items-center space-x-2"
            >
              <span>다음 →</span>
            </Button>
          </div>
        </div>

        {/* Essential Items Checklist */}
        <div className="mx-4 mt-1 mb-1">
          <EssentialsChecklist 
            items={essentialItems}
            onToggleItem={handleToggleEssentialItem}
            onUpdateItem={handleUpdateEssentialItem}
            onEditChecklist={() => {
              toast({
                title: "준비물 편집",
                description: "준비물 편집 기능이 곧 추가됩니다.",
              });
            }}
          />
        </div>

        {/* Transportation Information - Show for all transport types except car */}
        {plan.transportType !== "car" && (
          <div className="mx-4 mt-1 mb-4">
            <FlightInfoComponent 
              flightInfo={flightInfo} 
              transportType={plan.transportType} 
            />
          </div>
        )}
      </main>

      <BottomNav />
      
      {/* Edit Schedule Dialog */}
      <ScheduleEditForm
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        planStartDate={plan.startDate}
        planEndDate={plan.endDate}
        onSuccess={() => {
          toast({
            title: "일정 수정 완료",
            description: "일정이 성공적으로 수정되었습니다.",
          });
        }}
      />

      {/* Edit Plan Dialog */}
      <PlanEditForm
        plan={plan}
        isOpen={isPlanEditOpen}
        onClose={() => setIsPlanEditOpen(false)}
        onSuccess={() => {
          toast({
            title: "여행 계획 수정 완료",
            description: "여행 계획이 성공적으로 수정되었습니다.",
          });
        }}
      />

      {/* Participants Dialog */}
      <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>참가자 관리</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add New Participant */}
            <div className="space-y-2">
              <Label htmlFor="participant-name">새 참가자 추가</Label>
              <div className="flex space-x-2">
                <Input
                  id="participant-name"
                  placeholder="참가자 이름"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddParticipant();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddParticipant}
                  disabled={!newParticipantName.trim() || updateParticipantsMutation.isPending}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <Label>현재 참가자</Label>
              {(() => {
                const participants = convertParticipantsToArray(plan?.participants);
                return participants.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{participant.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {participant.role === 'leader' ? '리더' : '멤버'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(index)}
                        disabled={updateParticipantsMutation.isPending}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    아직 참가자가 없습니다.
                  </p>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>전체 일정 보기</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {planDays.map((day) => {
              const daySchedules = scheduleItems?.filter(item => item.date === day.date) || [];
              const sortedSchedules = daySchedules.sort((a, b) => {
                const timeA = a.time ? new Date(a.time).getTime() : 0;
                const timeB = b.time ? new Date(b.time).getTime() : 0;
                return timeA - timeB;
              });

              return (
                <div key={day.date} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {day.displayDay}
                      </Badge>
                      <span className="font-medium">
                        {day.displayDate} {day.dayOfWeek}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {sortedSchedules.length}개 일정
                    </span>
                  </div>
                  
                  {sortedSchedules.length > 0 ? (
                    <div className="space-y-2">
                      {sortedSchedules.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-blue-600 min-w-[60px]">
                            {item.time ? (
                              // time이 HH:MM 형식 문자열인지 확인
                              typeof item.time === 'string' && item.time.includes(':') ? 
                              item.time : 
                              new Date(item.time).toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                              })
                            ) : '--:--'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.title}</p>
                            {item.memo && (
                              <p className="text-xs text-gray-600">{item.memo}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      이 날에는 일정이 없습니다.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
