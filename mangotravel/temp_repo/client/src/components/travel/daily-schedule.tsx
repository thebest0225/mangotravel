import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Edit, MapPin, Route, X, Cloud, Navigation, Car } from 'lucide-react';
import { ScheduleItem } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

// Google Maps API 타입 선언
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
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

  if (!location || isLoading) {
    return null;
  }

  if (!weather) {
    return (
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <span>날씨 정보 없음</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500">
      <Cloud className="w-3 h-3" />
      <span>{weather.temperature}°C</span>
      <span className="text-gray-400">•</span>
      <span>{weather.description}</span>
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
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [regularMapUrl, setRegularMapUrl] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentRouteLocations, setCurrentRouteLocations] = useState<string[]>([]);
  
  const { data: savedPlaces } = useQuery({
    queryKey: ['/api/saved-places']
  });

  // 주소를 장소명으로 변환하는 함수
  const getDisplayLocationName = (location: string): string => {
    if (!location) return '';
    
    // 먼저 저장된 장소에서 찾기
    if (savedPlaces) {
      const savedPlace = savedPlaces.find((place: any) => 
        place.address === location || place.name === location
      );
      if (savedPlace?.name) {
        return savedPlace.name;
      }
    }
    
    // 저장된 장소가 없으면 주소에서 핵심 장소명 추출
    if (location.includes('나하') || location.includes('Naha')) {
      return '나하공항';
    }
    if (location.includes('인천') || location.includes('Incheon')) {
      return '인천공항';
    }
    if (location.includes('Yamada') || location.includes('3331-1')) {
      return '숙소 (온나빌리지)';
    }
    if (location.includes('Sakimotobu') || location.includes('4246-1')) {
      return '오키나와 츄라우미 수족관';
    }
    if (location.includes('Yara') || location.includes('1026-3')) {
      return 'Tacobox';
    }
    
    // 일반적인 패턴으로 장소명 추출
    // 예: "123 Street Name, City, Country" -> "Street Name"
    const parts = location.split(',');
    if (parts.length >= 2) {
      const firstPart = parts[0].trim();
      // 숫자-주소 패턴이면 두 번째 부분 사용
      if (/^\d+/.test(firstPart)) {
        return parts[1]?.trim() || firstPart;
      }
      return firstPart;
    }
    
    // 길면 줄이기
    return location.length > 15 ? `${location.substring(0, 15)}...` : location;
  };

  // Google Maps API 스크립트 로드
  useEffect(() => {
    const loadGoogleMaps = () => {
      // 이미 로드되어 있는지 확인
      if (window.google?.maps) {
        setIsMapLoaded(true);
        return;
      }

      // 이미 스크립트가 로드 중인지 확인
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setIsMapLoaded(true);
        });
        return;
      }

      const script = document.createElement('script');
      const apiKey = 'AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q';
      console.log('Loading Google Maps with API Key:', apiKey);
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places&use_legacy_marker=true`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // 경고 메시지 억제를 위한 콘솔 필터링
        const originalWarn = console.warn;
        console.warn = function(...args) {
          const message = args.join(' ');
          if (!message.includes('deprecated') && !message.includes('AdvancedMarkerElement')) {
            originalWarn.apply(console, args);
          }
        };
        
        console.log('Google Maps API loaded successfully');
        setIsMapLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // 지도가 로드되고 경로 위치가 설정되면 지도 초기화
  useEffect(() => {
    if (isMapLoaded && showMapDialog && currentRouteLocations.length > 0) {
      setTimeout(() => initializeMap(currentRouteLocations), 100);
    }
  }, [isMapLoaded, showMapDialog, currentRouteLocations]);

  // 장소명을 지도용으로 변환하는 함수
  const convertLocationForMaps = (location: string): string => {
    if (!savedPlaces) return location;
    
    const savedPlace = savedPlaces.find((place: any) => 
      place.name === location || place.address === location
    );
    
    if (savedPlace && savedPlace.placeId) {
      return `place_id:${savedPlace.placeId}`;
    }
    
    // 장소명 정규화
    if (location.includes('나하') || location.includes('Naha')) {
      return 'Naha Airport, Okinawa, Japan';
    }
    if (location.includes('차탄') || location.includes('Chatan')) {
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

  // 마커와 직선 연결 함수
  const addMarkersWithLines = (map: any, locations: string[]) => {
    const bounds = new window.google.maps.LatLngBounds();
    const markerPositions: any[] = [];
    let completedMarkers = 0;
    
    // 원본 일정 데이터에서 제목 찾기
    const getOriginalPlaceName = (location: string, index: number) => {
      const filteredItems = scheduleItems.filter(item => {
        if (!item.location || item.location.trim() === '') return false;
        
        const itemLocation = item.location.toLowerCase();
        const title = item.title.toLowerCase();
        
        // 인천공항만 제외
        const isIncheonAirport = ['인천', 'incheon'].some(keyword => 
          itemLocation.includes(keyword) || title.includes(keyword)
        );
        
        return !isIncheonAirport;
      });
      
      return filteredItems[index]?.title || location;
    };
    
    locations.forEach((location, index) => {
      // 원본 장소명 가져오기
      const originalPlaceName = getOriginalPlaceName(location, index);
      
      // Geocoder를 사용하여 위치 가져오기
      const geocoder = new window.google.maps.Geocoder();
      
      // Place ID가 있는 경우와 일반 주소인 경우 구분
      let geocodeRequest: any;
      if (location.startsWith('place_id:')) {
        geocodeRequest = { placeId: location.replace('place_id:', '') };
      } else {
        geocodeRequest = { address: location };
      }
      
      geocoder.geocode(geocodeRequest, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const position = result.geometry.location;
          markerPositions[index] = position;
          
          // 순번이 표시된 마커 생성 (숫자 라벨)
          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            title: originalPlaceName,
            label: {
              text: `${index + 1}`,
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            },
            icon: {
              url: `https://maps.google.com/mapfiles/ms/icons/${index === 0 ? 'green' : index === locations.length - 1 ? 'red' : 'blue'}-dot.png`,
              scaledSize: new window.google.maps.Size(40, 40),
              labelOrigin: new window.google.maps.Point(20, 20)
            },
            animation: window.google.maps.Animation.DROP
          });
          
          // 정보창 생성 (원본 장소명 표시)
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 4px 6px; font-family: Arial, sans-serif;">
                <div style="font-size: 12px; font-weight: bold; color: #1a73e8; margin-bottom: 2px;">
                  ${index + 1}. ${originalPlaceName}
                </div>
                <div style="font-size: 10px; color: #888;">
                  ${index === 0 ? '시작지점' : index === locations.length - 1 ? '도착지점' : `경유지`}
                </div>
              </div>
            `
          });
          
          // 마커 클릭 이벤트
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
          
          bounds.extend(position);
          completedMarkers++;
          
          // 모든 마커가 완료되면 지도 뷰 조정 및 직선 연결
          if (completedMarkers === locations.length) {
            // 모든 마커가 보이도록 지도 뷰 조정
            if (bounds.isEmpty()) {
              map.setCenter({ lat: 26.2125, lng: 127.6792 });
              map.setZoom(10);
            } else {
              map.fitBounds(bounds);
              // 너무 확대되지 않도록 최대 줌 레벨 제한
              setTimeout(() => {
                if (map.getZoom() > 12) {
                  map.setZoom(12);
                }
              }, 100);
            }
            
            // 직선 연결 (순서대로)
            setTimeout(() => {
              drawStraightLines(map, markerPositions);
            }, 200);
          }
        } else {
          console.error('Geocoding failed:', status, location);
          completedMarkers++;
          
          // 실패한 경우에도 카운트해서 나머지 마커들이 처리되도록 함
          if (completedMarkers === locations.length) {
            if (!bounds.isEmpty()) {
              map.fitBounds(bounds);
              setTimeout(() => {
                if (map.getZoom() > 12) {
                  map.setZoom(12);
                }
              }, 100);
            }
            
            setTimeout(() => {
              drawStraightLines(map, markerPositions);
            }, 200);
          }
        }
      });
    });
  };

  // 마커 간 직선 연결 함수
  const drawStraightLines = (map: any, positions: any[]) => {
    // 유효한 위치만 필터링
    const validPositions = positions.filter(pos => pos && pos.lat && pos.lng);
    
    console.log('Drawing lines between positions:', validPositions.length);
    
    for (let i = 0; i < validPositions.length - 1; i++) {
      const line = new window.google.maps.Polyline({
        path: [validPositions[i], validPositions[i + 1]],
        geodesic: true,
        strokeColor: '#1a73e8',
        strokeOpacity: 0.8,
        strokeWeight: 3
      });
      
      line.setMap(map);
      console.log(`Connected line ${i + 1}: from`, validPositions[i], 'to', validPositions[i + 1]);
    }
  };

  // 지도 초기화 및 마커 표시
  const initializeMap = (locations: string[]) => {
    if (!window.google?.maps || !mapRef.current) {
      console.log('Google Maps not loaded or mapRef not available');
      return;
    }

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 26.2125, lng: 127.6792 }, // 오키나와 중심
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: ['roadmap', 'satellite']
        },
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        },
        streetViewControl: false,
        fullscreenControl: false
      });

      // 마커 표시
      addMarkersWithLines(map, locations);
      
      // 지도 컨트롤 스타일 조정
      const style = document.createElement('style');
      style.textContent = `
        .gm-style-mtc {
          font-size: 10px !important;
          height: 20px !important;
          margin: 2px !important;
        }
        .gm-style-mtc > div {
          font-size: 10px !important;
          line-height: 20px !important;
          padding: 0 4px !important;
          margin: 0 1px !important;
        }
        .gm-style .gm-style-cc {
          font-size: 8px !important;
        }
        .gm-style .gm-style-cc a {
          font-size: 8px !important;
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

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

    const routeLocations = filteredItems.map(item => item.location);
    
    // 저장된 장소에서 place_id 찾기
    const convertLocationForMaps = (location: string): string => {
      if (!savedPlaces) return location;
      
      const savedPlace = savedPlaces.find((place: any) => 
        place.name === location || place.address === location
      );
      
      if (savedPlace && savedPlace.placeId) {
        return `place_id:${savedPlace.placeId}`;
      }
      
      // 장소명 정규화
      if (location.includes('나하') || location.includes('Naha')) {
        return 'Naha Airport, Okinawa, Japan';
      }
      if (location.includes('차탄') || location.includes('Chatan')) {
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
    
    console.log('Route locations:', routeLocations);
    console.log('Converted locations:', convertedLocations);
    
    // JavaScript SDK를 사용한 지도 표시
    setCurrentRouteLocations(convertedLocations);
    setShowMapDialog(true);
    
    // 일반 Google Maps 링크 (새 창용)
    const origin = convertedLocations[0];
    const destination = convertedLocations[convertedLocations.length - 1];
    const waypoints = convertedLocations.slice(1, -1);
    
    let regularUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    if (waypoints.length > 0) {
      regularUrl += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }
    
    setRegularMapUrl(regularUrl);
    console.log('Opening JavaScript SDK map with locations:', convertedLocations);
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
            <span>오늘 일정별 동선보기</span>
          </Button>
        </div>
      )}

      {/* 지도 다이얼로그 */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>일정 경로 안내</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMapDialog(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              일정 장소들의 위치를 지도에서 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="h-96 w-full">
            {isMapLoaded ? (
              <div 
                ref={mapRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">지도를 로드하는 중...</p>
                </div>
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

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
                    <h4 className="font-semibold text-gray-900 truncate pr-2" title={item.title}>
                      {item.title.length > 12 ? `${item.title.substring(0, 12)}...` : item.title}
                    </h4>
                    <div className="flex items-center space-x-1">
                      {item.location && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const encodedLocation = encodeURIComponent(item.location);
                            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          title="구글 네비게이션으로 안내"
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      )}
                      {onEditItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate" title={item.location}>
                        {getDisplayLocationName(item.location)}
                      </span>
                    </div>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  {item.duration && (
                    <div className="text-sm text-gray-500">
                      예상 소요시간: {item.duration}분
                    </div>
                  )}
                  
                  {/* 날씨 정보 표시 */}
                  {item.location && date && (
                    <div className="mt-2">
                      <WeatherDisplay location={item.location} date={date} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 다음 일정과의 이동 시간 표시 */}
          {index < scheduleItems.length - 1 && scheduleItems[index + 1].location && (
            <TravelTimeDisplay 
              origin={item.location || ''} 
              destination={scheduleItems[index + 1].location || ''} 
            />
          )}
        </div>
      ))}
    </div>
  );
}