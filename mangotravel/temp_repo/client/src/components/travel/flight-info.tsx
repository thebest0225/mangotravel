import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plane, ChevronDown, ChevronUp, Ship, Train, Car } from "lucide-react";
import type { FlightInfo, TravelPlan } from "@shared/schema";

interface FlightInfoProps {
  flightInfo: FlightInfo | null;
  transportType?: string;
}

export function FlightInfoComponent({ flightInfo, transportType = "flight" }: FlightInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getTransportIcon = () => {
    switch (transportType) {
      case "ship": return <Ship className="mr-2 text-primary-500 w-4 h-4" />;
      case "train": return <Train className="mr-2 text-primary-500 w-4 h-4" />;
      case "car": return <Car className="mr-2 text-primary-500 w-4 h-4" />;
      default: return <Plane className="mr-2 text-primary-500 w-4 h-4" />;
    }
  };
  
  const getTransportTitle = () => {
    switch (transportType) {
      case "ship": return "선박 정보";
      case "train": return "기차 정보";
      case "car": return "자동차 정보";
      default: return "항공편 정보";
    }
  };

  if (!flightInfo) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 py-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  {getTransportIcon()}
                  {getTransportTitle()}
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="py-2">
              <p className="text-gray-500 text-center py-2">
                {getTransportTitle()}가 없습니다.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 py-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                {getTransportIcon()}
                {getTransportTitle()}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 py-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {flightInfo.departure.airport}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(flightInfo.departure.time).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 text-sm">
                  {flightInfo.departure.airline}
                </p>
                <p className="text-xs text-gray-600">
                  {flightInfo.departure.flightNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {flightInfo.return.airport}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(flightInfo.return.time).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {flightInfo.return.airline}
                </p>
                <p className="text-sm text-gray-600">
                  {flightInfo.return.flightNumber}
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
