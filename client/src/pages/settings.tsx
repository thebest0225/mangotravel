import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, LogOut } from "lucide-react";
import type { User, LocationLabel } from "@shared/schema";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z.string().min(4, "새 비밀번호는 4자 이상이어야 합니다"),
  confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

const labelSchema = z.object({
  name: z.string().min(1, "라벨명을 입력해주세요"),
  color: z.string().min(1, "색상을 선택해주세요"),
});

const userSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
  role: z.number().min(1).max(3),
});

type PasswordForm = z.infer<typeof passwordSchema>;
type LabelForm = z.infer<typeof labelSchema>;
type UserForm = z.infer<typeof userSchema>;

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LocationLabel | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: labels, isLoading: labelsLoading } = useQuery<LocationLabel[]>({
    queryKey: ['/api/location-labels'],
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const labelForm = useForm<LabelForm>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      password: "",
      role: 3,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: data.newPassword }),
      });
      
      if (!response.ok) {
        throw new Error('Password change failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    },
    onError: () => {
      toast({
        title: "비밀번호 변경 실패",
        description: "비밀번호 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const labelMutation = useMutation({
    mutationFn: async (data: LabelForm) => {
      const url = editingLabel ? `/api/location-labels/${editingLabel.id}` : '/api/location-labels';
      const method = editingLabel ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Label save failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/location-labels'] });
      toast({
        title: editingLabel ? "라벨 수정 완료" : "라벨 추가 완료",
        description: editingLabel ? "라벨이 수정되었습니다." : "새 라벨이 추가되었습니다.",
      });
      setIsLabelDialogOpen(false);
      setEditingLabel(null);
      labelForm.reset();
    },
    onError: () => {
      toast({
        title: "라벨 저장 실패",
        description: "라벨 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/location-labels/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Label not found');
        }
        throw new Error('Label delete failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/location-labels'] });
      toast({
        title: "라벨 삭제 완료",
        description: "라벨이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      if (error.message === 'Label not found') {
        toast({
          title: "이미 삭제됨",
          description: "라벨이 이미 삭제되었습니다.",
        });
        // 캐시를 새로고침하여 UI 동기화
        queryClient.invalidateQueries({ queryKey: ['/api/location-labels'] });
      } else {
        toast({
          title: "라벨 삭제 실패",
          description: "라벨 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  const userMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('User save failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: editingUser ? "사용자 수정 완료" : "사용자 추가 완료",
        description: editingUser ? "사용자 정보가 수정되었습니다." : "새 사용자가 추가되었습니다.",
      });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
    },
    onError: () => {
      toast({
        title: "사용자 저장 실패",
        description: "사용자 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('User delete failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "사용자 삭제 완료",
        description: "사용자가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "사용자 삭제 실패",
        description: "사용자 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      setLocation('/login');
    },
  });

  const handleEditLabel = (label: LocationLabel) => {
    setEditingLabel(label);
    labelForm.setValue('name', label.name);
    labelForm.setValue('color', label.color || '#3B82F6');
    setIsLabelDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.setValue('name', user.name);
    userForm.setValue('password', '');
    userForm.setValue('role', user.role);
    setIsUserDialogOpen(true);
  };

  const getRoleText = (role: number) => {
    switch (role) {
      case 1: return "슈퍼관리자";
      case 2: return "일반관리자";
      case 3: return "일반참가자";
      default: return "알 수 없음";
    }
  };

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="설정" 
        showBack 
        onBack={() => setLocation("/")}
        rightActions={
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => logoutMutation.mutate()}
            className="text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        }
      />
      
      <main className="pb-20 px-4 py-6">
        <Tabs defaultValue="password" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="password">비밀번호</TabsTrigger>
            <TabsTrigger value="labels">위치 라벨</TabsTrigger>
            {currentUser.role === 1 && (
              <TabsTrigger value="users">참가자 관리</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>비밀번호 변경</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>비밀번호 변경</DialogTitle>
                    </DialogHeader>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>현재 비밀번호</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>새 비밀번호</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>새 비밀번호 확인</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                          {changePasswordMutation.isPending ? "변경 중..." : "변경"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labels">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>위치 라벨 관리</CardTitle>
                  <Dialog open={isLabelDialogOpen} onOpenChange={(open) => {
                    setIsLabelDialogOpen(open);
                    if (!open) {
                      setEditingLabel(null);
                      labelForm.reset();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        라벨 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingLabel ? "라벨 수정" : "라벨 추가"}</DialogTitle>
                      </DialogHeader>
                      <Form {...labelForm}>
                        <form onSubmit={labelForm.handleSubmit((data) => labelMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={labelForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>라벨명</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={labelForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>색상</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={labelMutation.isPending}>
                            {labelMutation.isPending ? "저장 중..." : "저장"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {labelsLoading ? (
                  <p>로딩 중...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {labels?.map((label) => (
                      <div key={label.id} className="flex items-center justify-between p-2 border rounded">
                        <Badge style={{ backgroundColor: 'white', color: 'black', borderColor: label.color }} className="border-2 rounded-sm min-w-[4rem] px-1 text-center justify-center">
                          {label.name}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLabel(label)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteLabelMutation.isPending}
                            onClick={() => deleteLabelMutation.mutate(label.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {currentUser.role === 1 && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>참가자 관리</CardTitle>
                    <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
                      setIsUserDialogOpen(open);
                      if (!open) {
                        setEditingUser(null);
                        userForm.reset();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          참가자 추가
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingUser ? "참가자 수정" : "참가자 추가"}</DialogTitle>
                        </DialogHeader>
                        <Form {...userForm}>
                          <form onSubmit={userForm.handleSubmit((data) => userMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={userForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이름</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={userForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>비밀번호</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={userForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>권한</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">슈퍼관리자</SelectItem>
                                      <SelectItem value="2">일반관리자</SelectItem>
                                      <SelectItem value="3">일반참가자</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" disabled={userMutation.isPending}>
                              {userMutation.isPending ? "저장 중..." : "저장"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <p>로딩 중...</p>
                  ) : (
                    <div className="space-y-2">
                      {users?.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{getRoleText(user.role)}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {user.id !== currentUser.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      
      <BottomNav />
    </div>
  );
}