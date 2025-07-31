import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // PWA 환경 감지 및 디버깅
  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    console.log("PWA 환경 감지:", isPWA);
    console.log("Display mode:", window.matchMedia('(display-mode: standalone)').matches);
    console.log("Navigator standalone:", (window.navigator as any).standalone);
  }, []);
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      toast({
        title: "로그인 성공",
        description: `${data.user.name}님 환영합니다!`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "로그인 실패",
        description: error.message || "이름 또는 비밀번호가 올바르지 않습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">MangoTravel</CardTitle>
          <p className="text-gray-500">로그인해주세요</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이름을 입력해주세요" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          console.log("Name input onChange:", e.target.value);
                          field.onChange(e);
                        }}
                        autoComplete="username"
                        inputMode="text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="비밀번호를 입력해주세요" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          console.log("Password input onChange:", e.target.value);
                          field.onChange(e);
                        }}
                        autoComplete="current-password"
                        inputMode="text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}