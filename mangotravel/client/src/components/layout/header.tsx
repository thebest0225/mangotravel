import { useLocation } from "wouter";
import { ArrowLeft, Settings, Plane, Edit, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import mangoTravelLogo from "@assets/mangotravle_logo_1752588018438.png";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

export function Header({ title, showBack, onBack, rightActions }: HeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocation("/");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between relative">
          {/* Left side */}
          <div className="flex items-center space-x-2 w-20">
            {showBack ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="p-1 -ml-1"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </Button>
            ) : (
              <div className="flex items-center">
                <img 
                  src={mangoTravelLogo} 
                  alt="MangoTravel" 
                  className="h-8 w-auto"
                />
              </div>
            )}
          </div>
          
          {/* Center title */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-semibold text-gray-900">{title === 'MangoTravel' ? '우리가족 여행 플래너' : title}</h1>
          </div>
          
          {/* Right side */}
          <div className="flex items-center justify-end w-20">
            {rightActions || (
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-1"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
