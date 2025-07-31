import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, CheckCircle, Plus, X, Car, Ship, Train, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertTravelPlan, EssentialItem, Participant, User } from "@shared/schema";

const newPlanSchema = z.object({
  title: z.string().min(1, "여행 제목을 입력해주세요"),
  startDate: z.string().min(1, "출발일을 선택해주세요"),
  endDate: z.string().min(1, "도착일을 선택해주세요"),
  participants: z.array(z.string()).min(1, "참가자를 최소 1명 선택해주세요"),
  transportType: z.string().min(1, "교통수단을 선택해주세요"),
  departureAirport: z.string().optional(),
  arrivalAirport: z.string().optional(),
  departureTime: z.string().optional(),
  departureAirline: z.string().optional(),
  departureFlightNumber: z.string().optional(),
  returnAirport: z.string().optional(),
  returnDestAirport: z.string().optional(),
  returnTime: z.string().optional(),
  returnAirline: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  departurePort: z.string().optional(),
  arrivalPort: z.string().optional(),
  shipCompany: z.string().optional(),
  shipName: z.string().optional(),
  departureStation: z.string().optional(),
  arrivalStation: z.string().optional(),
  trainCompany: z.string().optional(),
  trainNumber: z.string().optional(),
});

type NewPlanForm = z.infer<typeof newPlanSchema>;

export default function NewPlan() {
  const [, setLocation] = useLocation();
  const [essentialItems, setEssentialItems] = useState<EssentialItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [transportType, setTransportType] = useState<string>("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users for participants selection
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<NewPlanForm>({
    resolver: zodResolver(newPlanSchema),
    defaultValues: {
      title: "",
      startDate: "",
      endDate: "",
      participants: [],
      transportType: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: "",
      departureAirline: "",
      departureFlightNumber: "",
      returnAirport: "",
      returnDestAirport: "",
      returnTime: "",
      returnAirline: "",
      returnFlightNumber: "",
      departurePort: "",
      arrivalPort: "",
      shipCompany: "",
      shipName: "",
      departureStation: "",
      arrivalStation: "",
      trainCompany: "",
      trainNumber: "",
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: InsertTravelPlan) => {
      const response = await apiRequest("POST", "/api/travel-plans", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-plans"] });
      toast({
        title: "여행 계획 생성 완료",
        description: "새로운 여행 계획이 성공적으로 생성되었습니다.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "오류가 발생했습니다",
        description: "여행 계획 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: NewPlanForm) => {
    let transportInfo = null;
    
    if (data.transportType === "flight") {
      transportInfo = (data.departureAirport || data.departureTime) ? {
        departure: {
          airport: data.departureAirport || "",
          time: data.departureTime || "",
          airline: data.departureAirline || "",
          flightNumber: data.departureFlightNumber || "",
        },
        return: {
          airport: data.returnDestAirport || "",
          time: data.returnTime || "",
          airline: data.returnAirline || "",
          flightNumber: data.returnFlightNumber || "",
        },
      } : null;
    } else if (data.transportType === "ship") {
      transportInfo = (data.departurePort || data.departureTime) ? {
        departure: {
          location: data.departurePort || "",
          time: data.departureTime || "",
          company: data.shipCompany || "",
          transportNumber: data.shipName || "",
        },
        return: {
          location: data.arrivalPort || "",
          time: data.returnTime || "",
          company: data.shipCompany || "",
          transportNumber: data.shipName || "",
        },
      } : null;
    } else if (data.transportType === "train") {
      transportInfo = (data.departureStation || data.departureTime) ? {
        departure: {
          location: data.departureStation || "",
          time: data.departureTime || "",
          company: data.trainCompany || "",
          transportNumber: data.trainNumber || "",
        },
        return: {
          location: data.arrivalStation || "",
          time: data.returnTime || "",
          company: data.trainCompany || "",
          transportNumber: data.trainNumber || "",
        },
      } : null;
    }

    // Convert participant IDs to names
    const participantNames = selectedParticipants.map(id => 
      users?.find(u => u.id.toString() === id)?.name || id
    );

    const planData: InsertTravelPlan = {
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      participants: participantNames.join(", "),
      status: "planning",
      transportType: data.transportType,
      flightInfo: transportInfo,
      essentialItems,
    };

    createPlanMutation.mutate(planData);
  };

  const addEssentialItem = () => {
    if (newItemName.trim()) {
      const newItem: EssentialItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        checked: false,
        attachedImages: [],
      };
      setEssentialItems([...essentialItems, newItem]);
      setNewItemName("");
    }
  };

  const removeEssentialItem = (id: string) => {
    setEssentialItems(essentialItems.filter(item => item.id !== id));
  };

  const handleParticipantChange = (participantId: string, checked: boolean) => {
    if (checked) {
      setSelectedParticipants([...selectedParticipants, participantId]);
      form.setValue("participants", [...selectedParticipants, participantId]);
    } else {
      const newParticipants = selectedParticipants.filter(id => id !== participantId);
      setSelectedParticipants(newParticipants);
      form.setValue("participants", newParticipants);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="새 여행 계획" 
        showBack
        rightActions={
          <Button 
            onClick={form.handleSubmit(handleSubmit)}
            disabled={createPlanMutation.isPending}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            {createPlanMutation.isPending ? "저장중..." : "저장"}
          </Button>
        }
      />

      <form onSubmit={form.handleSubmit(handleSubmit)} className="px-4 py-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">여행 제목</Label>
            <Input
              id="title"
              placeholder="예: 제주도 가족여행"
              {...form.register("title")}
              className="mt-2"
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">출발일</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                className="mt-2"
              />
              {form.formState.errors.startDate && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="endDate">도착일</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                className="mt-2"
              />
              {form.formState.errors.endDate && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="participants">참가자</Label>
            <div className="mt-2 space-y-3">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={user.id.toString()}
                    checked={selectedParticipants.includes(user.id.toString())}
                    onCheckedChange={(checked) => 
                      handleParticipantChange(user.id.toString(), checked as boolean)
                    }
                    className="w-5 h-5"
                  />
                  <Label 
                    htmlFor={user.id.toString()} 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {user.name}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.participants && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.participants.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="transportType">이동 수단</Label>
            <Select onValueChange={(value) => {
              form.setValue("transportType", value);
              setTransportType(value);
            }}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="이동 수단을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">
                  <div className="flex items-center">
                    <Car className="mr-2 h-4 w-4" />
                    자동차
                  </div>
                </SelectItem>
                <SelectItem value="flight">
                  <div className="flex items-center">
                    <Plane className="mr-2 h-4 w-4" />
                    비행기
                  </div>
                </SelectItem>
                <SelectItem value="ship">
                  <div className="flex items-center">
                    <Ship className="mr-2 h-4 w-4" />
                    배/선박
                  </div>
                </SelectItem>
                <SelectItem value="train">
                  <div className="flex items-center">
                    <Train className="mr-2 h-4 w-4" />
                    기차
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.transportType && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.transportType.message}</p>
            )}
          </div>
        </div>

        {/* Transportation-specific Information */}
        {transportType === "flight" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plane className="mr-2 text-primary-500" />
                항공편 정보
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">가는 편</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    placeholder="출발공항 (예: ICN)"
                    {...form.register("departureAirport")}
                  />
                  <Input
                    placeholder="도착공항 (예: CJU)"
                    {...form.register("arrivalAirport")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    type="datetime-local"
                    {...form.register("departureTime")}
                  />
                  <Input
                    placeholder="항공사"
                    {...form.register("departureAirline")}
                  />
                </div>
                <Input
                  placeholder="항공편명 (예: KE1201)"
                  {...form.register("departureFlightNumber")}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">오는 편</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    placeholder="출발공항 (예: CJU)"
                    {...form.register("returnAirport")}
                  />
                  <Input
                    placeholder="도착공항 (예: ICN)"
                    {...form.register("returnDestAirport")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    type="datetime-local"
                    {...form.register("returnTime")}
                  />
                  <Input
                    placeholder="항공사"
                    {...form.register("returnAirline")}
                  />
                </div>
                <Input
                  placeholder="항공편명 (예: KE1208)"
                  {...form.register("returnFlightNumber")}
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        )}

        {transportType === "ship" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ship className="mr-2 text-primary-500" />
                선박 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departurePort">출발 항구</Label>
                  <Input
                    id="departurePort"
                    {...form.register("departurePort")}
                    placeholder="예: 인천항"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalPort">도착 항구</Label>
                  <Input
                    id="arrivalPort"
                    {...form.register("arrivalPort")}
                    placeholder="예: 제주항"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departureTime">출발 시간</Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    {...form.register("departureTime")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="returnTime">도착 시간</Label>
                  <Input
                    id="returnTime"
                    type="datetime-local"
                    {...form.register("returnTime")}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipCompany">선박 회사</Label>
                  <Input
                    id="shipCompany"
                    {...form.register("shipCompany")}
                    placeholder="예: 씨월드고속페리"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shipName">선박명</Label>
                  <Input
                    id="shipName"
                    {...form.register("shipName")}
                    placeholder="예: 씨월드1호"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transportType === "train" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Train className="mr-2 text-primary-500" />
                기차 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departureStation">출발 역</Label>
                  <Input
                    id="departureStation"
                    {...form.register("departureStation")}
                    placeholder="예: 서울역"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalStation">도착 역</Label>
                  <Input
                    id="arrivalStation"
                    {...form.register("arrivalStation")}
                    placeholder="예: 부산역"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departureTime">출발 시간</Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    {...form.register("departureTime")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="returnTime">도착 시간</Label>
                  <Input
                    id="returnTime"
                    type="datetime-local"
                    {...form.register("returnTime")}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trainCompany">운행사</Label>
                  <Input
                    id="trainCompany"
                    {...form.register("trainCompany")}
                    placeholder="예: 코레일"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="trainNumber">열차번호</Label>
                  <Input
                    id="trainNumber"
                    {...form.register("trainNumber")}
                    placeholder="예: KTX-101"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Essential Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 text-green-500" />
              필수 준비물
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-3">
              {essentialItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 bg-white rounded-lg p-3 border">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const updated = essentialItems.map(i => 
                        i.id === item.id ? { ...i, checked: e.target.checked } : i
                      );
                      setEssentialItems(updated);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">{item.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEssentialItem(item.id)}
                    className="text-red-500 hover:text-red-700 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Input
                placeholder="준비물 입력"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addEssentialItem())}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addEssentialItem}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
