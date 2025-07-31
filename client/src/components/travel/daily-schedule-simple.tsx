import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, MapPin, Route } from 'lucide-react';
import { ScheduleItem } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface DailyScheduleProps {
  scheduleItems: ScheduleItem[];
  onEditItem?: (item: ScheduleItem) => void;
  date?: string;
  planId?: number;
}

export function DailySchedule({ 
  scheduleItems, 
  onEditItem,
  date,
  planId 
}: DailyScheduleProps) {
  const { data: savedPlaces } = useQuery({
    queryKey: ['/api/saved-places']
  });

  const { data: travelPlan } = useQuery({
    queryKey: ['/api/travel-plans', planId],
    enabled: !!planId
  });

  const handleRouteView = () => {
    const filteredItems = scheduleItems.filter(item => {
      if (!item.location || item.location.trim() === '') return false;
      
      const location = item.location.toLowerCase();
      const title = item.title.toLowerCase();
      
      // 인천공항만 제외
      const isIncheonAirport = ['인천', 'incheon'].some(keyword => 
        location.includes(keyword) || title.includes(keyword)
      );
      
      return !isIncheonAirport;
    });

    if (filteredItems.length === 0) {
      alert('위치가 설정된 일정이 없습니다.');
      return;
    }

    let routeLocations: string[] = [];
    
    // 첫날인지 확인
    const isFirstDay = travelPlan && date ? date === travelPlan.startDate : false;
    
    // 숙소 위치 찾기
    const hotelLocation = '3331-1 Yamada, Onna, Kunigami District, Okinawa 904-0416 일본';
    
    console.log('Date check:', { 
      startDate: travelPlan?.startDate, 
      currentDate: date, 
      isAfterFirstDay: !isFirstDay 
    });
    
    if (filteredItems.length === 1) {
      const singleLocation = filteredItems[0].location!;
      const isNahaAirport = singleLocation.toLowerCase().includes('나하') || 
                           singleLocation.toLowerCase().includes('naha');
      
      if (isNahaAirport) {
        alert('나하공항만 있는 경우 경로를 표시할 수 없습니다.');
        return;
      } else {
        // 첫날이면 나하공항에서, 둘째날부터는 숙소에서 시작
        const startLocation = isFirstDay ? '나하공항' : hotelLocation;
        routeLocations = [startLocation, singleLocation];
      }
    } else {
      const firstItem = filteredItems[0];
      const isFirstNaha = firstItem.location!.toLowerCase().includes('나하') || 
                         firstItem.location!.toLowerCase().includes('naha');
      
      if (!isFirstNaha) {
        // 첫날이면 나하공항에서, 둘째날부터는 숙소에서 시작
        const startLocation = isFirstDay ? '나하공항' : hotelLocation;
        routeLocations.push(startLocation);
        console.log('Setting hotel location:', startLocation);
      }
      
      routeLocations.push(...filteredItems.map(item => item.location!));
    }

    if (routeLocations.length < 2) {
      alert('경로를 표시하려면 최소 2개 이상의 지점이 필요합니다.');
      return;
    }

    // 저장된 장소에서 Google Place ID를 찾는 함수
    const findPlaceId = (location: string): string | null => {
      if (!savedPlaces) return null;
      
      const exactMatch = savedPlaces.find((place: any) => 
        place.name === location || place.address === location
      );
      if (exactMatch?.googlePlaceId) {
        return exactMatch.googlePlaceId;
      }
      
      const partialMatch = savedPlaces.find((place: any) => {
        const placeName = place.name.toLowerCase();
        const placeAddress = place.address?.toLowerCase() || '';
        const searchLocation = location.toLowerCase();
        
        return placeName.includes(searchLocation) || 
               searchLocation.includes(placeName) ||
               placeAddress.includes(searchLocation) ||
               searchLocation.includes(placeAddress);
      });
      
      return partialMatch?.googlePlaceId || null;
    };
    
    // Place ID 또는 간단한 주소로 변환
    const convertLocationForMaps = (location: string): string => {
      const placeId = findPlaceId(location);
      if (placeId) {
        return `place_id:${placeId}`;
      }
      
      // Place ID가 없는 경우 간단한 주소로 변환
      if (location.includes('나하') || location.includes('Naha')) {
        return 'Naha Airport, Okinawa';
      }
      if (location.includes('자탄조') || location.includes('Chatan')) {
        return 'Chatan, Okinawa, Japan';
      }
      if (location.includes('나고') || location.includes('Nago')) {
        return 'Nago, Okinawa, Japan';
      }
      if (location.includes('온나') || location.includes('Onna')) {
        return 'Onna Village, Okinawa, Japan';
      }
      
      return location.includes('오키나와') || location.includes('Okinawa') 
        ? location 
        : `${location}, Okinawa, Japan`;
    };
    
    const convertedLocations = routeLocations.map(convertLocationForMaps);
    
    // 경로 안내 URL 생성
    const routeUrl = `https://www.google.com/maps/dir/${convertedLocations.map(loc => encodeURIComponent(loc)).join('/')}?travelmode=driving`;
    
    console.log('Route locations:', routeLocations);
    console.log('Converted locations:', convertedLocations);
    console.log('Route URL:', routeUrl);
    
    // 지도 열기
    window.open(routeUrl, '_blank', 'noopener,noreferrer');
  };

  // 동선 표시 가능한 일정 개수 확인
  const locationsCount = scheduleItems.filter(item => {
    if (!item.location || item.location.trim() === '') return false;
    
    const location = item.location.toLowerCase();
    const title = item.title.toLowerCase();
    
    const isIncheonAirport = ['인천', 'incheon'].some(keyword => 
      location.includes(keyword) || title.includes(keyword)
    );
    
    return !isIncheonAirport;
  }).length;

  return (
    <div className="space-y-4">
      {/* 동선보기 버튼 */}
      {locationsCount >= 1 && (
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRouteView}
            className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Route className="w-4 h-4" />
            <span>오늘 일정 경로 안내</span>
          </Button>
        </div>
      )}

      {scheduleItems.map((item, index) => (
        <div key={item.id}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-sm font-semibold text-primary-500">
                    {item.time || "시간미정"}
                  </div>
                  <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${item.time ? 'bg-primary-500' : 'bg-orange-400'}`}></div>
                  {index < scheduleItems.length - 1 && (
                    <div className="w-0.5 h-16 bg-gray-200 mx-auto mt-1"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    {onEditItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditItem(item)}
                        className="text-gray-400 hover:text-gray-600 h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {item.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  
                  {item.memo && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-2">
                      <p className="text-sm text-gray-700">{item.memo}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}