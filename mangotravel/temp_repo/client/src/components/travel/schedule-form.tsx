import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, Plus, X, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SchedulePlaceSearch } from "./schedule-place-search";
import type { InsertScheduleItem, ScheduleItem } from "@shared/schema";

const scheduleFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  time: z.string().min(1, "시간을 입력해주세요"),
  location: z.string().optional(),
  memo: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface ScheduleFormProps {
  planId: number;
  date: string;
  onSuccess?: () => void;
}

export function ScheduleForm({ planId, date, onSuccess }: ScheduleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [hotelLocation, setHotelLocation] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 여행 계획 정보 가져오기
  const { data: travelPlan } = useQuery({
    queryKey: ["/api/travel-plans", planId]
  });

  // 전체 일정 정보 가져오기
  const { data: allScheduleItems } = useQuery({
    queryKey: ["/api/travel-plans", planId, "schedule"]
  });

  // 30분 단위 시간 옵션 생성 (1:30~6:00 제외)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      // 1:30부터 5:30까지 제외 (새벽 시간대)
      if (hour >= 2 && hour <= 5) {
        continue;
      }
      // 1시인 경우 1:30 제외하고 1:00만 포함
      if (hour === 1) {
        options.push('01:00');
        continue;
      }
      // 6시인 경우 6:00부터 포함
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
  });

  // 숙소 체크인 정보 찾기 및 날짜별 기본값 설정
  useEffect(() => {
    if (!travelPlan || !allScheduleItems || !date) return;

    const startDate = new Date(travelPlan.startDate);
    const currentDate = new Date(date);
    const isAfterFirstDay = currentDate > startDate;

    if (isAfterFirstDay) {
      // 첫날의 체크인 일정 찾기
      const firstDaySchedule = allScheduleItems.filter((item: ScheduleItem) => 
        item.date === travelPlan.startDate
      );
      
      // 체크인 관련 일정 찾기 (호텔, 숙소, 체크인 키워드 포함)
      const checkinItem = firstDaySchedule.find((item: ScheduleItem) => {
        const title = item.title.toLowerCase();
        const location = item.location?.toLowerCase() || "";
        return title.includes('체크인') || 
               title.includes('호텔') || 
               title.includes('숙소') || 
               title.includes('리조트') ||
               title.includes('accommodation') ||
               location.includes('호텔') ||
               location.includes('리조트') ||
               location.includes('숙소') ||
               location.includes('resort') ||
               location.includes('hotel') ||
               // 숙소로만 되어 있는 일정도 포함
               (title === '숙소' && item.location);
      });

      if (checkinItem && checkinItem.location) {
        setHotelLocation(checkinItem.location);
      }
    }
  }, [travelPlan, allScheduleItems, date, form]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const createScheduleMutation = useMutation({
    mutationFn: async (data: InsertScheduleItem) => {
      const response = await apiRequest("POST", `/api/travel-plans/${planId}/schedule`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", planId, "schedule"] });
      toast({
        title: "일정 추가 완료",
        description: "새로운 일정이 추가되었습니다.",
      });
      reset();
      setSelectedPlace(null);
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Schedule creation error:", error);
      toast({
        title: "일정 추가 실패",
        description: error instanceof Error ? error.message : "일정 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    // 시간이 선택되지 않았을 때 명확한 알림
    if (!data.time || data.time.trim() === "") {
      toast({
        title: "시간 선택 필요",
        description: "일정 시간을 반드시 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const scheduleData = {
      planId,
      date,
      title: data.title,
      time: data.time,
      location: selectedPlace ? selectedPlace.formatted_address || selectedPlace.name : data.location || null,
      memo: data.memo || null,
      order: 0,
    };
    createScheduleMutation.mutate(scheduleData as InsertScheduleItem);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full bg-gray-50 border-2 border-dashed border-gray-300 p-4 text-gray-500 hover:border-primary-300 hover:text-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          일정 추가하기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 일정 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              placeholder="예: 오키나와 수족관 방문"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">장소</Label>
            {hotelLocation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Home className="w-4 h-4" />
                  <span className="text-sm font-medium">숙소에서 시작해서 목적지로 이동</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  출발지: {hotelLocation}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  아래에서 목적지를 선택하세요
                </p>
              </div>
            )}
            <div className="flex space-x-2">
              <Input
                id="location"
                placeholder={hotelLocation ? "목적지를 입력하세요" : "예: 오키나와 츄라우미 수족관"}
                {...register("location")}
                value={selectedPlace ? selectedPlace.name : form.watch("location") || ""}
                onChange={(e) => {
                  form.setValue("location", e.target.value);
                  setSelectedPlace(null);
                }}
              />
              <SchedulePlaceSearch
                onSelectPlace={(place) => {
                  console.log("Place selected:", place);
                  setSelectedPlace(place);
                  form.setValue("location", place.name);
                }}
                buttonText="검색"
                className="flex-shrink-0"
              />
            </div>
            {selectedPlace && (
              <p className="text-sm text-gray-600">{selectedPlace.formatted_address}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="text-red-600 font-semibold">시간 * (필수 선택)</Label>
            <Select
              onValueChange={(value) => form.setValue("time", value)}
              value={form.watch("time") || ""}
            >
              <SelectTrigger className="border-red-200 focus:border-red-400">
                <SelectValue placeholder="⚠️ 시간을 반드시 선택해주세요" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.time && (
              <p className="text-sm text-red-600 font-semibold">{errors.time.message}</p>
            )}
            {!form.watch("time") && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">
                ⚠️ 시간을 선택하지 않으면 일정이 "시간미정"으로 표시됩니다.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="일정에 대한 추가 정보나 메모를 입력하세요"
              {...register("memo")}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={createScheduleMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600"
            >
              {createScheduleMutation.isPending ? "추가 중..." : "일정 추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}