import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Edit2, Plane, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TravelPlan, InsertTravelPlan, Participant } from "@shared/schema";

const planEditSchema = z.object({
  title: z.string().min(1, "여행 제목을 입력해주세요"),
  startDate: z.string().min(1, "출발일을 선택해주세요"),
  endDate: z.string().min(1, "도착일을 선택해주세요"),
  transportType: z.enum(["flight", "car", "ship", "train"]),
  participants: z.any().optional(),
  flightInfo: z.any().optional(),
  essentialItems: z.any().optional(),
});

type PlanEditFormData = z.infer<typeof planEditSchema>;

interface PlanEditFormProps {
  plan: TravelPlan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PlanEditForm({ plan, isOpen, onClose, onSuccess }: PlanEditFormProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    plan.startDate ? new Date(plan.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    plan.endDate ? new Date(plan.endDate) : undefined
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 기존 데이터 파싱
  const existingParticipants = (() => {
    if (!plan.participants) return [];
    if (Array.isArray(plan.participants)) return plan.participants;
    if (typeof plan.participants === 'string') {
      try {
        return JSON.parse(plan.participants);
      } catch {
        return [];
      }
    }
    return [];
  })();

  const existingFlightInfo = (() => {
    if (!plan.flightInfo) return null;
    if (typeof plan.flightInfo === 'object') return plan.flightInfo;
    if (typeof plan.flightInfo === 'string') {
      try {
        return JSON.parse(plan.flightInfo);
      } catch {
        return null;
      }
    }
    return null;
  })();

  const existingEssentialItems = (() => {
    if (!plan.essentialItems) return [];
    if (Array.isArray(plan.essentialItems)) return plan.essentialItems;
    if (typeof plan.essentialItems === 'string') {
      try {
        return JSON.parse(plan.essentialItems);
      } catch {
        return [];
      }
    }
    return [];
  })();

  const form = useForm<PlanEditFormData>({
    resolver: zodResolver(planEditSchema),
    defaultValues: {
      title: plan.title,
      startDate: plan.startDate,
      endDate: plan.endDate,
      transportType: (plan.transportType as "flight" | "car" | "ship" | "train") || "flight",
      participants: existingParticipants,
      flightInfo: existingFlightInfo,
      essentialItems: existingEssentialItems,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  // 다이얼로그가 열릴 때마다 기존 데이터로 폼 재설정
  useEffect(() => {
    if (isOpen) {
      const formData = {
        title: plan.title,
        startDate: plan.startDate,
        endDate: plan.endDate,
        transportType: (plan.transportType as "flight" | "car" | "ship" | "train") || "flight",
        participants: existingParticipants,
        flightInfo: existingFlightInfo,
        essentialItems: existingEssentialItems,
      };
      
      console.log("Reset form with existing data:", formData);
      form.reset(formData);
    }
  }, [isOpen, plan, existingParticipants, existingFlightInfo, existingEssentialItems, form]);

  const updatePlanMutation = useMutation({
    mutationFn: async (data: Partial<InsertTravelPlan>) => {
      const response = await apiRequest("PATCH", `/api/travel-plans/${plan.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans", plan.id] });
      toast({
        title: "여행 계획 수정 완료",
        description: "여행 계획이 성공적으로 수정되었습니다.",
      });
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Plan update error:", error);
      toast({
        title: "여행 계획 수정 실패",
        description: error instanceof Error ? error.message : "여행 계획 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlanEditFormData) => {
    if (startDate && endDate && startDate > endDate) {
      toast({
        title: "날짜 오류",
        description: "출발일은 도착일보다 이전이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    // 참가자 데이터 정리 - 빈 이름 제거
    const validParticipants = (data.participants || []).filter(p => 
      p.name && p.name.trim() !== ''
    );

    const updateData: Partial<InsertTravelPlan> = {
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      transportType: data.transportType,
      participants: validParticipants.length > 0 ? validParticipants : [],
      flightInfo: data.flightInfo,
      essentialItems: data.essentialItems || [],
    };

    console.log("Sending update data:", updateData);
    updatePlanMutation.mutate(updateData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            여행 계획 수정
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 여행 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">여행 제목 *</Label>
            <Input
              id="title"
              placeholder="예: 오키나와 가족여행"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* 날짜 선택 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">출발일 *</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                onChange={(e) => {
                  form.setValue("startDate", e.target.value);
                  setStartDate(e.target.value ? new Date(e.target.value) : undefined);
                }}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">도착일 *</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                onChange={(e) => {
                  form.setValue("endDate", e.target.value);
                  setEndDate(e.target.value ? new Date(e.target.value) : undefined);
                }}
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* 교통수단 */}
          <div className="space-y-2">
            <Label>교통수단 *</Label>
            <Select
              onValueChange={(value) => form.setValue("transportType", value as "flight" | "car" | "ship" | "train")}
              value={form.watch("transportType")}
            >
              <SelectTrigger>
                <SelectValue placeholder="교통수단을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">✈️ 비행기</SelectItem>
                <SelectItem value="car">🚗 자동차</SelectItem>
                <SelectItem value="ship">🚢 선박</SelectItem>
                <SelectItem value="train">🚄 기차</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 참가자 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>참가자</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", role: "" })}
              >
                <Plus className="w-4 h-4 mr-1" />
                참가자 추가
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="이름"
                    {...form.register(`participants.${index}.name`)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="역할 (선택사항)"
                    {...form.register(`participants.${index}.role`)}
                  />
                </div>
                {fields.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {form.formState.errors.participants && (
              <p className="text-sm text-red-600">{form.formState.errors.participants.message}</p>
            )}
          </div>

          {/* 항공편 정보 (항공편 선택시만 표시) */}
          {form.watch("transportType") === "flight" && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                항공편 정보
              </Label>
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">출발 공항</Label>
                    <Input
                      placeholder="예: 인천공항"
                      value={form.watch("flightInfo")?.departureAirport || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          departureAirport: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">도착 공항</Label>
                    <Input
                      placeholder="예: 나하공항"
                      value={form.watch("flightInfo")?.arrivalAirport || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          arrivalAirport: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">출발 시간</Label>
                    <Input
                      type="time"
                      value={form.watch("flightInfo")?.departureTime || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          departureTime: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">도착 시간</Label>
                    <Input
                      type="time"
                      value={form.watch("flightInfo")?.arrivalTime || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          arrivalTime: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">항공사</Label>
                    <Input
                      placeholder="예: 진에어"
                      value={form.watch("flightInfo")?.airline || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          airline: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">항공편명</Label>
                    <Input
                      placeholder="예: LJ201"
                      value={form.watch("flightInfo")?.flightNumber || ""}
                      onChange={(e) => {
                        const currentFlight = form.watch("flightInfo") || {};
                        form.setValue("flightInfo", {
                          ...currentFlight,
                          flightNumber: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 필수준비물 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                필수준비물
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentItems = form.watch("essentialItems") || [];
                  form.setValue("essentialItems", [
                    ...currentItems,
                    { item: "", completed: false }
                  ]);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                아이템 추가
              </Button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(form.watch("essentialItems") || []).map((_, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="준비물 이름"
                    value={form.watch("essentialItems")?.[index]?.item || ""}
                    onChange={(e) => {
                      const currentItems = form.watch("essentialItems") || [];
                      const updatedItems = [...currentItems];
                      updatedItems[index] = {
                        ...updatedItems[index],
                        item: e.target.value
                      };
                      form.setValue("essentialItems", updatedItems);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentItems = form.watch("essentialItems") || [];
                      const updatedItems = currentItems.filter((_, i) => i !== index);
                      form.setValue("essentialItems", updatedItems);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="여행에 대한 추가 정보나 메모를 입력하세요"
              {...form.register("memo")}
              rows={3}
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={updatePlanMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600"
            >
              {updatePlanMutation.isPending ? "수정 중..." : "수정 완료"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}