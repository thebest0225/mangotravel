import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, MapPin, Car, Edit, Cloud, Navigation, Route, X } from "lucide-react";
import type { ScheduleItem } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface DailyScheduleProps {
  scheduleItems: ScheduleItem[];
  onEditItem?: (item: ScheduleItem) => void;
  date?: string;
}

interface TravelTimeInfo {
  duration: {
    text: string;
    value: number;
  };
  distance: {
    text: string;
    value: number;
  };
}

interface WeatherInfo {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  feels_like: number;
}

function WeatherDisplay({ location, date }: { location: string; date: string }) {
  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather', location, date],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/weather", {
        location,
        date
      });
      return response.json() as Promise<WeatherInfo>;
    },
    enabled: !!location,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const handleNavigate = () => {
    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
    window.open(googleMapsUrl, '_blank');
  };

  if (!location || isLoading) {
    return null;
  }

  if (!weather) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <span>날씨 정보 없음</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNavigate}
          className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
        >
          <Navigation className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <Cloud className="w-3 h-3" />
        <span>{weather.temperature}°C</span>
        <span className="text-gray-400">•</span>
        <span>{weather.description}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNavigate}
        className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
        title="구글 네비게이션으로 안내"
      >
        <Navigation className="w-3 h-3" />
      </Button>
    </div>
  );
}

function TravelTimeDisplay({ origin, destination }: { origin: string; destination: string }) {
  const { data: travelTime, isLoading } = useQuery({
    queryKey: ['travel-time', origin, destination],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/travel-time", {
        origin,
        destination,
        mode: 'driving'
      });
      return response.json() as Promise<TravelTimeInfo>;
    },
    enabled: !!origin && !!destination && origin !== destination,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  if (!origin || !destination || origin === destination) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center space-x-2 text-gray-500 text-sm">
          <Car className="w-4 h-4 animate-pulse" />
          <span>이동시간 계산 중...</span>
        </div>
      </div>
    );
  }

  if (!travelTime) {
    return null;
  }

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center space-x-2 text-gray-600 text-sm bg-gray-50 px-3 py-1 rounded-full">
        <Car className="w-4 h-4 text-blue-500" />
        <span>{travelTime.duration.text}</span>
        <span className="text-gray-400">•</span>
        <span>{travelTime.distance.text}</span>
      </div>
    </div>
  );
}

export function DailySchedule({ 
  scheduleItems, 
  onEditItem,
  date 
}: DailyScheduleProps) {
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [routeMapUrl, setRouteMapUrl] = useState('');
  const [routeLocations, setRouteLocations] = useState<string[]>([]);

  const { data: savedPlaces } = useQuery({
    queryKey: ['/api/saved-places']
  });

  const handleViewRoute = () => {
    console.log('handleViewRoute called');
    console.log('Current scheduleItems:', scheduleItems);
    
    // 모든 일정을 시간 순으로 정렬
    const sortedItems = [...scheduleItems].sort((a, b) => a.time.localeCompare(b.time));
    
    // 인천공항 제외, 나하공항은 조건부 포함
    const filteredItems = sortedItems.filter(item => {
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
      alert('동선을 표시할 일정이 없습니다.');
      return;
    }

    // 동선 생성 로직 - 당일 일정만 연결
    let routeLocations: string[] = [];
    
    if (filteredItems.length === 1) {
      // 일정이 1개뿐일 때 - 나하공항에서 해당 장소까지만
      const singleLocation = filteredItems[0].location!;
      const isNahaAirport = singleLocation.toLowerCase().includes('나하') || 
                           singleLocation.toLowerCase().includes('naha');
      
      if (isNahaAirport) {
        alert('나하공항만 있는 경우 동선을 표시할 수 없습니다.');
        return;
      } else {
        // 나하공항 → 일정 (돌아오는 경로는 제외)
        routeLocations = ['나하공항', singleLocation];
      }
    } else {
      // 일정이 2개 이상일 때 - 당일 일정들만 순서대로 연결
      const firstItem = filteredItems[0];
      const isFirstNaha = firstItem.location!.toLowerCase().includes('나하') || 
                         firstItem.location!.toLowerCase().includes('naha');
      
      // 시작점 결정 - 첫 일정이 나하공항이 아니면 나하공항부터 시작
      if (!isFirstNaha) {
        routeLocations.push('나하공항');
      }
      
      // 모든 일정 추가 (당일 일정만)
      routeLocations.push(...filteredItems.map(item => item.location!));
      
      // 마지막에 나하공항으로 돌아가는 경로는 추가하지 않음
    }

    if (routeLocations.length < 2) {
      alert('경로를 표시하려면 최소 2개 이상의 지점이 필요합니다.');
      return;
    }

    // 경유지 마커가 포함된 Google Maps URL 생성
    const origin = encodeURIComponent(routeLocations[0]);
    const destination = encodeURIComponent(routeLocations[routeLocations.length - 1]);
    
    // 저장된 장소에서 Google Place ID를 찾는 함수
    const findPlaceId = (location: string): string | null => {
      if (!savedPlaces) {
        console.log('No saved places available');
        return null;
      }
      
      console.log(`Looking for Place ID for location: "${location}"`);
      console.log('Available saved places:', savedPlaces.map((p: any) => ({ name: p.name, address: p.address, googlePlaceId: p.googlePlaceId })));
      
      // 정확한 이름 매칭 우선
      const exactMatch = savedPlaces.find((place: any) => 
        place.name === location || place.address === location
      );
      if (exactMatch?.googlePlaceId) {
        console.log(`Found exact match for "${location}": ${exactMatch.googlePlaceId}`);
        return exactMatch.googlePlaceId;
      }
      
      // 부분 매칭
      const partialMatch = savedPlaces.find((place: any) => {
        const placeName = place.name.toLowerCase();
        const placeAddress = place.address?.toLowerCase() || '';
        const searchLocation = location.toLowerCase();
        
        const match = placeName.includes(searchLocation) || 
               searchLocation.includes(placeName) ||
               placeAddress.includes(searchLocation) ||
               searchLocation.includes(placeAddress);
        
        console.log(`Checking "${place.name}" against "${location}": ${match}`);
        return match;
      });
      if (partialMatch?.googlePlaceId) {
        console.log(`Found partial match for "${location}": ${partialMatch.googlePlaceId}`);
        return partialMatch.googlePlaceId;
      }
      
      console.log(`No Place ID found for "${location}"`);
      return null;
    };
    
    // Place ID 또는 간단한 주소로 변환하는 함수
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
    
    // Place ID 또는 간단한 주소로 변환
    const convertedLocations = routeLocations.map(convertLocationForMaps);
    
    // 방법 1: 각 장소를 번호와 함께 표시 (Place ID 또는 간단한 주소 사용)
    const numberedPlaces = convertedLocations.map((location, index) => {
      const originalLocation = routeLocations[index];
      return `${index + 1}. ${originalLocation}`;
    });
    
    // 방법 2: 방향 안내 URL (Place ID 우선, 없으면 간단한 주소로 경로 표시)
    const directionsUrl = `https://www.google.com/maps/dir/${convertedLocations.map(loc => encodeURIComponent(loc)).join('/')}?travelmode=driving`;
    
    // 방법 3: 번호가 매겨진 장소들을 검색
    const numberedSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(numberedPlaces.join(' | '))}`;
    
    // 방법 4: Place ID만 사용하는 URL (가장 정확)
    const placeIdOnlyLocations = convertedLocations.filter(loc => loc.startsWith('place_id:'));
    const placeIdUrl = placeIdOnlyLocations.length > 0 
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeIdOnlyLocations.join(' OR '))}` 
      : null;
    
    console.log('Original locations:', routeLocations);
    console.log('Converted locations (with Place IDs):', convertedLocations);
    console.log('Place ID only locations:', placeIdOnlyLocations);
    console.log('Directions URL:', directionsUrl);
    
    // 가장 정확한 방법으로 지도 열기 - Place ID 우선 사용
    const hasPlaceIds = placeIdOnlyLocations.length > 0;
    
    if (hasPlaceIds) {
      // Place ID가 있는 경우: 간단한 좌표 기반 URL로 변경
      // 저장된 장소에서 좌표 가져오기 (더 관대한 매칭)
      const placesWithCoords = routeLocations.map(location => {
        console.log('Looking for coordinates for location:', location);
        
        const savedPlace = savedPlaces?.find((place: any) => {
          const placeName = place.name.toLowerCase();
          const placeAddress = place.address?.toLowerCase() || '';
          const searchLocation = location.toLowerCase();
          
          // 더 관대한 매칭 조건들
          const nameMatch = placeName === searchLocation || 
                           placeName.includes(searchLocation) || 
                           searchLocation.includes(placeName);
          
          const addressMatch = placeAddress.includes(searchLocation) || 
                              searchLocation.includes(placeAddress);
          
          // 특별한 매칭 규칙들
          const specialMatches = [
            // 자탄조 매칭
            (searchLocation.includes('자탄조') || searchLocation.includes('chatan')) && 
            (placeName.includes('블루오션') || placeAddress.includes('chatan')),
            
            // 나고 매칭 
            searchLocation.includes('나고') && placeAddress.includes('nago'),
            
            // 온나 매칭
            (searchLocation.includes('온나') || searchLocation.includes('야마다')) && 
            (placeName.includes('숙소') || placeAddress.includes('onna'))
          ];
          
          const hasSpecialMatch = specialMatches.some(match => match);
          
          console.log(`Checking place "${place.name}" against "${location}":`, {
            nameMatch, addressMatch, hasSpecialMatch
          });
          
          return nameMatch || addressMatch || hasSpecialMatch;
        });
        
        if (savedPlace?.latitude && savedPlace?.longitude) {
          console.log(`Found coordinates for "${location}": ${savedPlace.latitude},${savedPlace.longitude} (from ${savedPlace.name})`);
          return `${savedPlace.latitude},${savedPlace.longitude}`;
        }
        
        console.log(`No coordinates found for "${location}"`);
        return null;
      }).filter(coord => coord !== null);
      
      if (placesWithCoords.length > 0) {
        // 선택지 제공: 방향 안내 또는 모든 핀 표시
        const choice = confirm(
          `지도 보기 방식을 선택하세요:\n\n` +
          `확인: 방향 안내 (경로 표시)\n` +
          `취소: 모든 장소에 핀 표시`
        );
        
        if (choice) {
          // 방향 안내 - 경로 표시
          const coordDirectionsUrl = `https://www.google.com/maps/dir/${placesWithCoords.join('/')}?travelmode=driving`;
          console.log('Opening directions with coordinates:', coordDirectionsUrl);
          window.open(coordDirectionsUrl, '_blank', 'noopener,noreferrer');
        } else {
          // 모든 핀 표시 - Place ID를 사용한 정확한 핀 표시
          const placeIds = routeLocations.map(location => {
            const placeId = findPlaceId(location);
            return placeId;
          }).filter(id => id !== null);
          
          if (placeIds.length > 0) {
            console.log('Found Place IDs:', placeIds);
            
            // 각 Place ID를 개별 창에서 정확한 핀으로 표시
            placeIds.forEach((placeId, index) => {
              // Google Maps의 정확한 Place ID URL 형식 사용
              const placeUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
              console.log(`Opening place ${index + 1}: ${placeUrl}`);
              
              // 0.5초 간격으로 각 창을 열어서 브라우저 팝업 차단 방지
              setTimeout(() => {
                window.open(placeUrl, `_place_${index}`, 'noopener,noreferrer');
              }, index * 500);
            });
            
            // 사용자에게 알림
            alert(`${placeIds.length}개의 장소를 각각 새 창에서 열어드립니다!`);
          } else {
            // Place ID가 없는 경우 좌표로 개별 핀 표시
            placesWithCoords.forEach((coord, index) => {
              const [lat, lng] = coord.split(',');
              const locationName = routeLocations[index];
              const coordUrl = `https://www.google.com/maps/@${lat},${lng},15z`;
              console.log(`Opening location ${index + 1} with coordinates:`, coordUrl);
              
              setTimeout(() => {
                window.open(coordUrl, '_blank', 'noopener,noreferrer');
              }, index * 500);
            });
          }
        }
      } else {
        // 좌표가 없으면 기본 방향 안내
        console.log('No coordinates found, using basic directions:', directionsUrl);
        window.open(directionsUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      // Place ID가 없는 경우: 방향 안내로 대체 (경로와 함께 경유지 표시)
      console.log('No Place IDs found, using directions URL:', directionsUrl);
      window.open(directionsUrl, '_blank', 'noopener,noreferrer');
    }
    
    setShowRouteDialog(false);
  };

  if (scheduleItems.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">
          이 날의 일정이 없습니다.
        </p>
      </div>
    );
  }

  // 동선 표시 가능한 일정 개수 확인 (인천공항만 제외)
  const locationsCount = scheduleItems.filter(item => {
    if (!item.location || item.location.trim() === '') return false;
    
    const location = item.location.toLowerCase();
    const title = item.title.toLowerCase();
    
    // 인천공항만 제외
    const isIncheonAirport = ['인천', 'incheon'].some(keyword => 
      location.includes(keyword) || title.includes(keyword)
    );
    
    return !isIncheonAirport;
  }).length;

  return (
    <div className="space-y-4">
      {/* 동선보기 버튼 - 1개 이상의 일정이 있으면 표시 */}
      {locationsCount >= 1 && (
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewRoute}
            className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            title="일정 장소들을 지도에서 확인 (정확한 핀 위치 또는 경로 안내)"
          >
            <Route className="w-4 h-4" />
            <span>🗺️ 일정별 동선보기</span>
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
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{item.location}</span>
                      </div>
                      {date && (
                        <div className="ml-6">
                          <WeatherDisplay location={item.location} date={date} />
                        </div>
                      )}
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
          
          {/* 다음 일정으로의 이동시간 표시 */}
          {index < scheduleItems.length - 1 && item.location && scheduleItems[index + 1].location && (
            <TravelTimeDisplay
              origin={item.location}
              destination={scheduleItems[index + 1].location}
            />
          )}
        </div>
      ))}
    </div>
  );
}
