import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, MapPin, Route, X } from 'lucide-react';
import { ScheduleItem } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface DailyScheduleProps {
  scheduleItems: ScheduleItem[];
  onEditItem?: (item: ScheduleItem) => void;
  date?: string;
}

// Google Maps API 타입 선언
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function DailySchedule({ 
  scheduleItems, 
  onEditItem,
  date 
}: DailyScheduleProps) {
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const [regularMapUrl, setRegularMapUrl] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentRouteLocations, setCurrentRouteLocations] = useState<string[]>([]);
  
  const { data: savedPlaces } = useQuery({
    queryKey: ['/api/saved-places']
  });

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
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q';
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

  // 지도에 마커 추가 함수
  const addMarkersToMap = (map: any, locations: string[]) => {
    const bounds = new window.google.maps.LatLngBounds();
    
    locations.forEach((location, index) => {
      // Place ID를 사용하여 정확한 위치 가져오기
      const placeId = location.replace('place_id:', '');
      const request = {
        placeId: placeId,
        fields: ['geometry', 'name', 'formatted_address']
      };
      
      const service = new window.google.maps.places.PlacesService(map);
      service.getDetails(request, (place: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
          const position = place.geometry.location;
          
          // 마커 아이콘 설정 (순서에 따라 다른 색상)
          const markerIcon = {
            url: `https://maps.google.com/mapfiles/ms/icons/${index === 0 ? 'green' : index === locations.length - 1 ? 'red' : 'blue'}-dot.png`,
            scaledSize: new window.google.maps.Size(32, 32)
          };
          
          // 마커 생성
          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            title: place.name || location,
            icon: markerIcon,
            animation: window.google.maps.Animation.DROP
          });
          
          // 정보창 생성
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${place.name || '장소'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">${place.formatted_address || location}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">
                  ${index === 0 ? '시작지점' : index === locations.length - 1 ? '도착지점' : `경유지 ${index}`}
                </p>
              </div>
            `
          });
          
          // 마커 클릭 이벤트
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
          
          bounds.extend(position);
          
          // 마지막 마커 추가 후 지도 뷰 조정
          if (index === locations.length - 1) {
            map.fitBounds(bounds);
            map.setZoom(Math.min(map.getZoom(), 12)); // 최대 줌 레벨 제한
          }
        } else {
          console.error('Place details request failed:', status, location);
        }
      });
    });
  };

  // 지도 초기화 및 경로 표시
  const initializeMap = (locations: string[]) => {
    if (!window.google?.maps || !mapRef.current) {
      console.log('Google Maps not loaded or mapRef not available');
      return;
    }

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 26.2125, lng: 127.6792 }, // 오키나와 중심
        mapTypeId: 'roadmap'
      });

      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        map: map
      });

      // 경로 요청
      const origin = locations[0];
      const destination = locations[locations.length - 1];
      const waypoints = locations.slice(1, -1).map(location => ({
        location: location,
        stopover: true
      }));

      console.log('Requesting directions from:', origin, 'to:', destination, 'waypoints:', waypoints);

      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      }, (result: any, status: any) => {
        console.log('Directions API response:', status, result);
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed:', status);
          // 경로 표시 실패 시 개별 마커 표시
          addMarkersToMap(map, locations);
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  // 지도에 마커 추가 함수
  const addMarkersToMap = (map: any, locations: string[]) => {
    const bounds = new window.google.maps.LatLngBounds();
    
    locations.forEach((location, index) => {
      // Place ID를 사용하여 정확한 위치 가져오기
      const placeId = location.replace('place_id:', '');
      const request = {
        placeId: placeId,
        fields: ['geometry', 'name', 'formatted_address']
      };
      
      const service = new window.google.maps.places.PlacesService(map);
      service.getDetails(request, (place: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
          const position = place.geometry.location;
          
          // 마커 아이콘 설정 (순서에 따라 다른 색상)
          const markerIcon = {
            url: `https://maps.google.com/mapfiles/ms/icons/${index === 0 ? 'green' : index === locations.length - 1 ? 'red' : 'blue'}-dot.png`,
            scaledSize: new window.google.maps.Size(32, 32)
          };
          
          // 마커 생성
          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            title: place.name || location,
            icon: markerIcon,
            animation: window.google.maps.Animation.DROP
          });
          
          // 정보창 생성
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${place.name || '장소'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">${place.formatted_address || location}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">
                  ${index === 0 ? '시작지점' : index === locations.length - 1 ? '도착지점' : `경유지 ${index}`}
                </p>
              </div>
            `
          });
          
          // 마커 클릭 이벤트
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
          
          bounds.extend(position);
          
          // 마지막 마커 추가 후 지도 뷰 조정
          if (index === locations.length - 1) {
            map.fitBounds(bounds);
            map.setZoom(Math.min(map.getZoom(), 12)); // 최대 줌 레벨 제한
          }
        } else {
          console.error('Place details request failed:', status, location);
        }
      });
    });
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

    let routeLocations: string[] = [];
    
    if (filteredItems.length === 1) {
      const singleLocation = filteredItems[0].location!;
      const isNahaAirport = singleLocation.toLowerCase().includes('나하') || 
                           singleLocation.toLowerCase().includes('naha');
      
      if (isNahaAirport) {
        alert('나하공항만 있는 경우 경로를 표시할 수 없습니다.');
        return;
      } else {
        routeLocations = ['나하공항', singleLocation];
      }
    } else {
      const firstItem = filteredItems[0];
      const isFirstNaha = firstItem.location!.toLowerCase().includes('나하') || 
                         firstItem.location!.toLowerCase().includes('naha');
      
      if (!isFirstNaha) {
        routeLocations.push('나하공항');
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
    
    // Google Maps API를 사용한 정확한 경로 안내
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
            <span>오늘 일정 경로 안내</span>
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
          <div className="p-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(regularMapUrl, '_blank')}
              className="w-full"
            >
              새 창에서 열기
            </Button>
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