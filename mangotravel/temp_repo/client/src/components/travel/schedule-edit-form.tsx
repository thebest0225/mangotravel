import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SchedulePlaceSearch } from "./schedule-place-search";
import type { ScheduleItem } from "@shared/schema";

const scheduleEditFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  time: z.string().min(1, "시간을 입력해주세요"),
  date: z.string().min(1, "날짜를 선택해주세요").refine((date) => {
    // 추가 날짜 검증은 컴포넌트에서 처리
    return true;
  }),
  location: z.string().optional(),
  memo: z.string().optional(),
});

type ScheduleEditFormData = z.infer<typeof scheduleEditFormSchema>;

interface ScheduleEditFormProps {
  item: ScheduleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planStartDate?: string;
  planEndDate?: string;
}

export function ScheduleEditForm({ item, isOpen, onClose, onSuccess, planStartDate, planEndDate }: ScheduleEditFormProps) {
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const form = useForm<ScheduleEditFormData>({
    resolver: zodResolver(scheduleEditFormSchema),
  });

  const { register, handleSubmit, reset, formState: { errors } } = form;

  // 아이템이 변경될 때 폼 리셋
  useEffect(() => {
    if (item) {
      reset({
        title: item.title,
        time: item.time,
        date: item.date,
        location: item.location || "",
        memo: item.memo || "",
      });
      setSelectedDate(new Date(item.date));
      setSelectedPlace(null);
    }
  }, [item, reset]);

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: Partial<ScheduleItem>) => {
      if (!item) throw new Error("No item to update");
      const response = await apiRequest("PATCH", `/api/schedule-items/${item.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", item?.planId, "schedule"] });
      toast({
        title: "일정 수정 완료",
        description: "일정이 성공적으로 수정되었습니다.",
      });
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Schedule update error:", error);
      toast({
        title: "일정 수정 실패",
        description: error instanceof Error ? error.message : "일정 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item to delete");
      await apiRequest("DELETE", `/api/schedule-items/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", item?.planId, "schedule"] });
      toast({
        title: "일정 삭제 완료",
        description: "일정이 성공적으로 삭제되었습니다.",
      });
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Schedule delete error:", error);
      toast({
        title: "일정 삭제 실패",
        description: error instanceof Error ? error.message : "일정 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduleEditFormData) => {
    updateScheduleMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      deleteScheduleMutation.mutate();
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">날짜 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? selectedDate.toLocaleDateString('ko-KR') : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        const dateString = date.toISOString().split('T')[0];
                        form.setValue("date", dateString);
                      }
                    }}
                    disabled={(date) => {
                      if (!planStartDate || !planEndDate) return false;
                      const startDate = new Date(planStartDate);
                      const endDate = new Date(planEndDate);
                      return date < startDate || date > endDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {planStartDate && planEndDate && (
                <p className="text-xs text-gray-500">
                  여행 기간 내에서만 선택 가능: {new Date(planStartDate).toLocaleDateString('ko-KR')} ~ {new Date(planEndDate).toLocaleDateString('ko-KR')}
                </p>
              )}
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">시간 *</Label>
              <Select
                onValueChange={(value) => form.setValue("time", value)}
                value={form.watch("time") || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="시간 선택" />
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
                <p className="text-sm text-red-600">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">장소</Label>
            <div className="flex space-x-2">
              <Input
                id="location"
                placeholder="예: 오키나와 츄라우미 수족관"
                {...register("location")}
                value={selectedPlace ? (selectedPlace.formatted_address || selectedPlace.name) : form.watch("location") || ""}
                onChange={(e) => {
                  form.setValue("location", e.target.value);
                  setSelectedPlace(null);
                }}
              />
              <SchedulePlaceSearch
                onSelectPlace={(place) => {
                  console.log("Selected place:", place);
                  setSelectedPlace(place);
                  // formatted_address를 사용하거나 name을 사용
                  const locationText = place.formatted_address || place.name;
                  form.setValue("location", locationText);
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
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="일정에 대한 추가 정보나 메모를 입력하세요"
              {...register("memo")}
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteScheduleMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleteScheduleMutation.isPending ? "삭제 중..." : "삭제"}</span>
            </Button>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={updateScheduleMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {updateScheduleMutation.isPending ? "수정 중..." : "수정 완료"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}