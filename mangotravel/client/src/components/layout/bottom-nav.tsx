import { useLocation } from "wouter";
import { Home, Search, Bookmark, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "홈" },
    { path: "/new-plan", icon: Plus, label: "새여행" },
    { path: "/place-search", icon: Bookmark, label: "장소" },
    { path: "/settings", icon: User, label: "설정" },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2 pb-6">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center space-y-1 p-2 ${
                  isActive ? "text-primary-500" : "text-gray-400"
                }`}
              >
                <item.icon className="text-lg" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>


    </>
  );
}
