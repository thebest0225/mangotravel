import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PlaceSearch } from "@/components/travel/place-search";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Star, Tag, Clock, Plus, Bookmark, Trash2, Map, Upload, Globe, Filter, Edit2, Check, X, ChevronUp, ChevronDown, Copy, Navigation, Camera, Image, Eye, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SavedPlace, Link } from "@shared/schema";

export default function PlaceSearchPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingPlace, setEditingPlace] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLabel, setEditingLabel] = useState<string>("");
  const [editingMemo, setEditingMemo] = useState("");
  const [mapCategory, setMapCategory] = useState<string>("all");
  const [showPlacesList, setShowPlacesList] = useState<boolean>(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [activeMarker, setActiveMarker] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("places");
  const mapRef = useRef<HTMLDivElement>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<number | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<SavedPlace | null>(null);
  const [editingLinks, setEditingLinks] = useState<number | null>(null);
  const [newLink, setNewLink] = useState({ url: "" });

  const { data: savedPlaces } = useQuery<SavedPlace[]>({
    queryKey: ["/api/saved-places"],
  });

  const { data: labels } = useQuery({
    queryKey: ["/api/location-labels"],
  });

  const deletePlaceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/saved-places/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-places"] });
      toast({
        title: "장소 삭제 완료",
        description: "저장된 장소가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Delete place error:", error);
      toast({
        title: "삭제 실패",
        description: "장소 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const importPlacesMutation = useMutation({
    mutationFn: async (places: any[]) => {
      const response = await apiRequest("POST", "/api/saved-places/import", { places });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-places"] });
      toast({
        title: "가져오기 완료",
        description: `${data.imported}개의 장소를 가져왔습니다.`,
      });
    },
    onError: (error) => {
      console.error("Import places error:", error);
      toast({
        title: "가져오기 실패",
        description: "파일을 읽는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updatePlaceMutation = useMutation({
    mutationFn: async ({ id, name, labelId, memo }: { id: number; name: string; labelId?: number; memo?: string }) => {
      const response = await apiRequest("PATCH", `/api/saved-places/${id}`, { name, labelId, description: memo });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-places"] });
      setEditingPlace(null);
      setEditingName("");
      setEditingMemo("");
      toast({
        title: "수정 완료",
        description: "장소 정보가 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Update place error:", error);
      toast({
        title: "수정 실패",
        description: "장소 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ id, photos }: { id: number; photos: string[] }) => {
      console.log("Uploading photos for place:", id, "photos count:", photos.length);
      const response = await apiRequest("PATCH", `/api/saved-places/${id}`, { photos });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-places"] });
      setUploadingPhotos(null);
      toast({
        title: "사진 업로드 완료",
        description: "장소 사진이 업로드되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Upload photos error:", error);
      toast({
        title: "사진 업로드 실패",
        description: `사진 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive",
      });
      setUploadingPhotos(null);
    },
  });

  const updateLinksMutation = useMutation({
    mutationFn: async ({ id, links }: { id: number; links: Link[] }) => {
      const response = await apiRequest("PATCH", `/api/saved-places/${id}`, { links });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-places"] });
      setEditingLinks(null);
      setNewLink({ title: "", url: "", description: "" });
      toast({
        title: "링크 수정 완료",
        description: "관련 링크가 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Update links error:", error);
      toast({
        title: "링크 수정 실패",
        description: `링크 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive",
      });
    },
  });

  const handleDeletePlace = (id: number) => {
    deletePlaceMutation.mutate(id);
  };

  const handleStartEdit = (place: SavedPlace) => {
    setEditingPlace(place.id);
    setEditingName(place.name);
    setEditingLabel(place.labelId ? place.labelId.toString() : "none");
    // Google Places ID가 포함된 description은 메모로 사용하지 않음
    const memo = place.description && place.description.includes('Google Places ID:') ? "" : (place.description || "");
    setEditingMemo(memo);
  };

  const handleSaveEdit = () => {
    if (editingPlace && editingName.trim()) {
      // 메모가 비어있거나 Google Places ID 정보만 있는 경우 빈 문자열로 저장
      const cleanMemo = editingMemo.trim();
      const finalMemo = cleanMemo.includes('Google Places ID:') ? "" : cleanMemo;
      
      updatePlaceMutation.mutate({ 
        id: editingPlace, 
        name: editingName.trim(),
        labelId: editingLabel === "none" ? undefined : parseInt(editingLabel) || undefined,
        memo: finalMemo
      });
    }
  };

  const handlePhotoUpload = async (placeId: number, files: FileList) => {
    if (!files || files.length === 0) return;

    const place = savedPlaces?.find(p => p.id === placeId);
    if (!place) return;

    setUploadingPhotos(placeId);
    
    try {
      const currentPhotos = Array.isArray(place.photos) ? place.photos : [];
      const newPhotos: string[] = [];

      // 최대 10장까지만 업로드
      const filesToUpload = Math.min(files.length, 10 - currentPhotos.length);
      
      console.log("Processing", filesToUpload, "files for place", placeId);
      
      for (let i = 0; i < filesToUpload; i++) {
        const file = files[i];
        if (file && file.type.startsWith('image/')) {
          console.log("Processing file:", file.name, "size:", file.size);
          try {
            const base64 = await convertToBase64(file);
            console.log("Successfully converted file to base64, length:", base64.length);
            newPhotos.push(base64);
          } catch (fileError) {
            console.error("Error converting file:", file.name, fileError);
            throw new Error(`파일 변환 실패: ${file.name}`);
          }
        }
      }

      if (newPhotos.length > 0) {
        const updatedPhotos = [...currentPhotos, ...newPhotos].slice(0, 10);
        console.log("Uploading", updatedPhotos.length, "photos total");
        uploadPhotosMutation.mutate({ id: placeId, photos: updatedPhotos });
      } else {
        setUploadingPhotos(null);
        toast({
          title: "업로드할 이미지 없음",
          description: "유효한 이미지 파일을 선택해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      setUploadingPhotos(null);
      toast({
        title: "사진 업로드 실패",
        description: `사진을 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive",
      });
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 파일 크기 체크 (2MB 제한)
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error(`파일이 너무 큽니다: ${(file.size / 1024 / 1024).toFixed(1)}MB (최대 2MB)`));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) {
            reject(new Error('파일을 읽을 수 없습니다'));
            return;
          }

          // 파일 크기가 작으면 그대로 사용
          if (file.size < 500 * 1024) { // 500KB 이하
            console.log(`Small file, using original: ~${(file.size / 1024).toFixed(1)}KB`);
            resolve(dataUrl);
            return;
          }

          // 큰 파일만 압축
          const img = new Image();
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                // Canvas 실패 시 원본 사용
                console.log('Canvas not available, using original');
                resolve(dataUrl);
                return;
              }

              // 간단한 크기 조정
              const maxSize = 400;
              let { width, height } = img;
              
              if (width > maxSize || height > maxSize) {
                if (width > height) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                } else {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
              console.log(`Compressed: ${width}x${height}`);
              resolve(compressedDataUrl);
            } catch (error) {
              console.log('Compression failed, using original');
              resolve(dataUrl);
            }
          };
          
          img.onerror = () => {
            console.log('Image load failed, using original');
            resolve(dataUrl);
          };
          
          img.src = dataUrl;
        } catch (error) {
          reject(new Error('파일 처리 실패'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('파일 읽기 실패'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePhoto = (placeId: number, photoIndex: number) => {
    const place = savedPlaces?.find(p => p.id === placeId);
    if (!place || !Array.isArray(place.photos)) return;

    const updatedPhotos = place.photos.filter((_, index) => index !== photoIndex);
    uploadPhotosMutation.mutate({ id: placeId, photos: updatedPhotos });
  };

  const handleAddLink = (placeId: number) => {
    if (!newLink.url) {
      toast({
        title: "입력 오류",
        description: "URL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const place = savedPlaces?.find(p => p.id === placeId);
    if (!place) return;

    const currentLinks = Array.isArray(place.links) ? place.links : [];
    const newLinkWithId = {
      id: Date.now().toString(),
      title: "링크",
      url: newLink.url,
    };
    
    const updatedLinks = [...currentLinks, newLinkWithId];
    updateLinksMutation.mutate({ id: placeId, links: updatedLinks });
  };

  const handleDeleteLink = (placeId: number, linkId: string) => {
    const place = savedPlaces?.find(p => p.id === placeId);
    if (!place || !Array.isArray(place.links)) return;

    const updatedLinks = place.links.filter((link: any) => link.id !== linkId);
    updateLinksMutation.mutate({ id: placeId, links: updatedLinks });
  };

  const handleCancelEdit = () => {
    setEditingPlace(null);
    setEditingName("");
    setEditingLabel("");
    setEditingMemo("");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        // Google Takeout의 Saved Places 형식 파싱
        if (jsonData.features) {
          // GeoJSON 형식
          const places = jsonData.features.map((feature: any) => ({
            name: feature.properties.Title || feature.properties.name || 'Unknown Place',
            address: feature.properties.Location?.Address || '',
            description: feature.properties.Description || '',
            latitude: feature.geometry?.coordinates?.[1]?.toString() || '',
            longitude: feature.geometry?.coordinates?.[0]?.toString() || '',
            category: feature.properties.Category || 'imported',
            googlePlaceId: feature.properties.Google_Maps_URL?.match(/place_id=([^&]+)/)?.[1] || null,
          }));
          importPlacesMutation.mutate(places);
        } else if (Array.isArray(jsonData)) {
          // 일반적인 배열 형식
          importPlacesMutation.mutate(jsonData);
        } else {
          throw new Error('지원하지 않는 파일 형식입니다.');
        }
      } catch (error) {
        console.error('Parse error:', error);
        toast({
          title: "파일 오류",
          description: "올바른 JSON 파일을 선택해주세요.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // 라벨별 장소 그룹화
  const groupedPlaces = savedPlaces?.reduce((acc, place) => {
    if (place.labelId && labels) {
      const label = labels.find((l: any) => l.id === place.labelId);
      if (label) {
        const labelName = label.name;
        if (!acc[labelName]) {
          acc[labelName] = [];
        }
        acc[labelName].push(place);
      }
    } else {
      // 라벨이 없는 장소들
      if (!acc['라벨없음']) {
        acc['라벨없음'] = [];
      }
      acc['라벨없음'].push(place);
    }
    return acc;
  }, {} as Record<string, SavedPlace[]>) || {};

  const categories = ['all', ...Object.keys(groupedPlaces)];
  const filteredPlaces = selectedCategory === 'all' ? 
    savedPlaces || [] : 
    groupedPlaces[selectedCategory] || [];
  
  // 지도용 필터링된 장소들
  const mapFilteredPlaces = mapCategory === 'all' ? 
    savedPlaces || [] : 
    groupedPlaces[mapCategory] || [];

  // Google Maps API 로드 및 초기화
  const loadGoogleMaps = async () => {
    if (window.google?.maps?.Map) {
      console.log('Google Maps API 이미 로드됨');
      return window.google;
    }

    console.log('Google Maps API 로드 시작');
    
    // 기존 스크립트가 있다면 제거
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q&libraries=places&loading=async&use_legacy_marker=true`;
    script.async = true;
    script.defer = true;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        // 경고 메시지 억제를 위한 콘솔 필터링
        const originalWarn = console.warn;
        console.warn = function(...args) {
          const message = args.join(' ');
          if (!message.includes('deprecated') && !message.includes('AdvancedMarkerElement')) {
            originalWarn.apply(console, args);
          }
        };
        
        // 모바일에서 더 긴 대기 시간
        const checkGoogleMaps = () => {
          if (window.google?.maps?.Map) {
            console.log('Google Maps API 로드 완료');
            resolve(window.google);
          } else {
            setTimeout(checkGoogleMaps, 200);
          }
        };
        // 초기 지연 시간 추가 (모바일 지원)
        setTimeout(checkGoogleMaps, 100);
      };
      script.onerror = (error) => {
        console.error('Google Maps API 로드 실패:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  };

  // 지도 초기화
  const initializeMap = async () => {
    if (!mapRef.current) {
      console.log('지도 컨테이너가 없음');
      return;
    }

    try {
      console.log('지도 초기화 시작...');
      const google = await loadGoogleMaps();
      
      const validPlaces = mapFilteredPlaces.filter(place => place.latitude && place.longitude);
      if (validPlaces.length === 0) {
        console.log('표시할 장소가 없음');
        // 기존 마커들 제거
        markers.forEach(marker => marker.setMap(null));
        setMarkers([]);
        
        // 빈 상태 메시지 표시
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f9f9f9; padding: 20px; text-align: center;">
              <div style="font-size: 24px; color: #ddd; margin-bottom: 10px;">📍</div>
              <div style="font-size: 14px; color: #666; margin-bottom: 5px;">선택된 라벨에 해당하는 장소가 없습니다</div>
              <div style="font-size: 12px; color: #999;">다른 라벨을 선택해보세요</div>
            </div>
          `;
        }
        return;
      }

      // 오키나와 중심 좌표 (기본값)
      const center = validPlaces.length > 0 ? 
        { lat: parseFloat(validPlaces[0].latitude!), lng: parseFloat(validPlaces[0].longitude!) } :
        { lat: 26.2125, lng: 127.6792 };

      const map = new google.maps.Map(mapRef.current, {
        zoom: 8,
        center: center,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: google.maps.ControlPosition.RIGHT_TOP
        },
        fullscreenControl: false,
        gestureHandling: 'auto', // 모바일 제스처 지원
        disableDefaultUI: false,
        clickableIcons: true
      });

      console.log('지도 생성 완료');
      setMapInstance(map);

      // 기존 마커 제거
      markers.forEach(marker => marker.setMap(null));
      
      // 새 마커 생성
      const newMarkers = validPlaces.map((place, index) => {
        const position = { lat: parseFloat(place.latitude!), lng: parseFloat(place.longitude!) };
        
        // 라벨 정보 가져오기
        const placeLabel = labels?.find((l: any) => l.id === place.labelId);
        const labelColor = placeLabel?.color || '#3B82F6'; // 기본값: 파란색
        const labelName = placeLabel?.name || '라벨없음';
        
        // 라벨에 따른 깃발 색상 선택
        let flagColor = 'blue';
        if (placeLabel) {
          // 숙소 라벨은 항상 노란색
          if (labelName === '숙소') {
            flagColor = 'yellow';
          } else {
            // 기타 라벨들은 라벨 색상에 따라 깃발 색상 매핑
            const colorHex = placeLabel.color.toLowerCase();
            if (colorHex.includes('red') || colorHex.includes('#ff') || colorHex.includes('#f') || colorHex.includes('e53e3e')) {
              flagColor = 'red';
            } else if (colorHex.includes('green') || colorHex.includes('#38a169') || colorHex.includes('#00ff')) {
              flagColor = 'green';
            } else if (colorHex.includes('yellow') || colorHex.includes('#d69e2e') || colorHex.includes('#ff0')) {
              flagColor = 'yellow';
            } else if (colorHex.includes('purple') || colorHex.includes('#805ad5') || colorHex.includes('#9f7aea')) {
              flagColor = 'purple';
            }
          }
        }

        const marker = new google.maps.Marker({
          position: position,
          map: map,
          title: `${place.name}\n라벨: ${labelName}`,
          animation: google.maps.Animation.DROP,
          icon: {
            url: `https://maps.google.com/mapfiles/ms/icons/${flagColor}-pushpin.png`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(10, 32)
          },
          label: {
            text: labelName,
            color: '#000000',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        });

        // 정보창 생성 (장소명만 표시)
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #1a73e8;">
                ${place.name}
              </h3>
            </div>
          `
        });

        // 마커 클릭 이벤트
        marker.addListener('click', () => {
          // 기존 활성 마커 원래 크기로 복원
          if (activeMarker && activeMarker !== marker) {
            // 기존 마커의 flagColor 정보를 가져와서 복원
            const existingPlace = validPlaces.find(p => markers.find(m => m === activeMarker && m.placeId === p.id));
            let existingFlagColor = 'blue';
            if (existingPlace) {
              const existingLabel = labels?.find((l: any) => l.id === existingPlace.labelId);
              if (existingLabel) {
                // 숙소 라벨은 항상 노란색
                if (existingLabel.name === '숙소') {
                  existingFlagColor = 'yellow';
                } else {
                  const colorHex = existingLabel.color.toLowerCase();
                  if (colorHex.includes('red') || colorHex.includes('#ff') || colorHex.includes('#f') || colorHex.includes('e53e3e')) {
                    existingFlagColor = 'red';
                  } else if (colorHex.includes('green') || colorHex.includes('#38a169') || colorHex.includes('#00ff')) {
                    existingFlagColor = 'green';
                  } else if (colorHex.includes('yellow') || colorHex.includes('#d69e2e') || colorHex.includes('#ff0')) {
                    existingFlagColor = 'yellow';
                  } else if (colorHex.includes('purple') || colorHex.includes('#805ad5') || colorHex.includes('#9f7aea')) {
                    existingFlagColor = 'purple';
                  }
                }
              }
            }
            
            activeMarker.setIcon({
              url: `https://maps.google.com/mapfiles/ms/icons/${existingFlagColor}-pushpin.png`,
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(10, 32)
            });
          }

          // 현재 마커 확대
          marker.setIcon({
            url: `https://maps.google.com/mapfiles/ms/icons/${flagColor}-pushpin.png`,
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(15, 48)
          });

          setActiveMarker(marker);
          infoWindow.open(map, marker);
        });

        // 마커에 place ID 저장
        marker.placeId = place.id;

        return marker;
      });

      setMarkers(newMarkers);

      // 모든 마커가 보이도록 지도 뷰 조정
      if (newMarkers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        newMarkers.forEach(marker => bounds.extend(marker.getPosition()));
        map.fitBounds(bounds);
        
        // 너무 확대되지 않도록 제한
        setTimeout(() => {
          if (map.getZoom() > 10) {
            map.setZoom(10);
          }
        }, 100);
      }

    } catch (error) {
      console.error('Google Maps initialization error:', error);
      // 오류 메시지 표시
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; padding: 20px; text-align: center;">
            <div style="font-size: 18px; color: #666; margin-bottom: 10px;">🗺️</div>
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">지도를 불러올 수 없습니다</div>
            <div style="font-size: 12px; color: #999;">Google Maps API 연결에 문제가 있습니다</div>
          </div>
        `;
      }
    }
  };

  // 지도 업데이트 통합 useEffect
  useEffect(() => {
    console.log('지도 업데이트 useEffect 실행:', {
      activeTab,
      mapRefExists: !!mapRef.current,
      placesLength: mapFilteredPlaces.length,
      mapCategory,
      mapInstanceExists: !!mapInstance
    });
    
    // 지도 탭이 활성화되고 장소가 있을 때만 초기화
    if (activeTab === 'map' && mapRef.current && mapFilteredPlaces.length > 0) {
      if (!mapInstance) {
        console.log('지도 초기 생성');
        initializeMap();
      } else {
        console.log('지도 마커 업데이트, 카테고리:', mapCategory);
        initializeMap();
      }
    }
  }, [activeTab, mapCategory, mapFilteredPlaces.length]);

  // 모바일 터치 이벤트 지원 추가
  useEffect(() => {
    if (activeTab === 'map' && mapRef.current) {
      // 모바일에서 지도 컨테이너에 터치 이벤트 지원
      const mapContainer = mapRef.current;
      mapContainer.style.touchAction = 'pan-x pan-y';
      mapContainer.style.webkitTouchCallout = 'none';
      mapContainer.style.webkitUserSelect = 'none';
      mapContainer.style.webkitTapHighlightColor = 'transparent';
    }
  }, [activeTab]);

  // 리스트 항목 클릭 시 지도 위치 이동
  const handleListItemClick = (place: SavedPlace) => {
    if (mapInstance && place.latitude && place.longitude) {
      const position = {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude)
      };
      
      // 지도 중심 이동 및 확대
      mapInstance.setCenter(position);
      mapInstance.setZoom(10);
      
      // 해당 마커 찾기 및 활성화
      const marker = markers.find(m => m.placeId === place.id);
      if (marker) {
        // 기존 활성 마커 원래 크기로 복원
        if (activeMarker && activeMarker !== marker) {
          // 기존 마커의 원래 색상 복원
          const existingPlace = validPlaces.find(p => markers.find(m => m === activeMarker && m.placeId === p.id));
          let existingFlagColor = 'blue';
          if (existingPlace) {
            const existingLabel = labels?.find((l: any) => l.id === existingPlace.labelId);
            if (existingLabel) {
              const colorHex = existingLabel.color.toLowerCase();
              if (colorHex.includes('red') || colorHex.includes('#ff') || colorHex.includes('#f') || colorHex.includes('e53e3e')) {
                existingFlagColor = 'red';
              } else if (colorHex.includes('green') || colorHex.includes('#38a169') || colorHex.includes('#00ff')) {
                existingFlagColor = 'green';
              } else if (colorHex.includes('yellow') || colorHex.includes('#d69e2e') || colorHex.includes('#ff0')) {
                existingFlagColor = 'yellow';
              } else if (colorHex.includes('purple') || colorHex.includes('#805ad5') || colorHex.includes('#9f7aea')) {
                existingFlagColor = 'purple';
              }
            }
          }
          
          activeMarker.setIcon({
            url: `https://maps.google.com/mapfiles/ms/icons/${existingFlagColor}-pushpin.png`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(10, 32)
          });
        }
        
        // 현재 마커 확대 - 현재 place의 색상 사용
        const currentLabel = labels?.find((l: any) => l.id === place.labelId);
        let currentFlagColor = 'blue';
        if (currentLabel) {
          const colorHex = currentLabel.color.toLowerCase();
          if (colorHex.includes('red') || colorHex.includes('#ff') || colorHex.includes('#f') || colorHex.includes('e53e3e')) {
            currentFlagColor = 'red';
          } else if (colorHex.includes('green') || colorHex.includes('#38a169') || colorHex.includes('#00ff')) {
            currentFlagColor = 'green';
          } else if (colorHex.includes('yellow') || colorHex.includes('#d69e2e') || colorHex.includes('#ff0')) {
            currentFlagColor = 'yellow';
          } else if (colorHex.includes('purple') || colorHex.includes('#805ad5') || colorHex.includes('#9f7aea')) {
            currentFlagColor = 'purple';
          }
        }
        
        marker.setIcon({
          url: `https://maps.google.com/mapfiles/ms/icons/${currentFlagColor}-pushpin.png`,
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(15, 48)
        });
        
        setActiveMarker(marker);
        
        // 정보창 표시
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #1a73e8;">
                ${place.name}
              </h3>
            </div>
          `
        });
        
        infoWindow.open(mapInstance, marker);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="저장한 장소" showBack />
      
      <main className="pb-20">
        <Tabs defaultValue="places" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="places" className="flex items-center space-x-2">
              <Bookmark className="w-4 h-4" />
              <span>저장된 장소</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center space-x-2">
              <Map className="w-4 h-4" />
              <span>지도로 보기</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>장소 추가</span>
            </TabsTrigger>
            {/* 가져오기 탭 임시 숨김 - 나중에 사용할 수 있도록 주석 처리 */}
            {false && (
              <TabsTrigger value="import" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>가져오기</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="places" className="px-4 py-6">
            <div className="space-y-4">
              {/* Label Filter */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  <Button
                    key="all"
                    variant={selectedCategory === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="whitespace-nowrap"
                  >
                    전체 ({savedPlaces?.length || 0})
                  </Button>
                  {categories.filter(cat => cat !== 'all').map((category) => {
                    const label = labels?.find((l: any) => l.name === category);
                    const isNoLabel = category === '라벨없음';
                    
                    return (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="whitespace-nowrap flex items-center space-x-1"
                        style={
                          selectedCategory === category && !isNoLabel && label
                            ? { 
                                backgroundColor: label.color + '20',
                                borderColor: label.color,
                                color: label.color
                              }
                            : {}
                        }
                      >
                        {!isNoLabel && label && (
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: label.color }}
                          />
                        )}
                        <span>
                          {category} ({groupedPlaces[category]?.length || 0})
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Bookmark className="mr-2 text-primary-500" />
                {selectedCategory === 'all' ? '전체 장소' : selectedCategory} ({filteredPlaces.length})
              </h2>
              
              {filteredPlaces.length > 0 ? (
                <div className="space-y-2">
                  {filteredPlaces.map((place) => (
                    <Card key={place.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingPlace === place.id ? (
                                <div className="flex-1 mr-2 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="text-sm flex-1"
                                      placeholder="장소 이름"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit();
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit();
                                        }
                                      }}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={updatePlaceMutation.isPending}
                                      className="text-green-500 hover:text-green-600"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      className="text-gray-500 hover:text-gray-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  {labels && labels.length > 0 && (
                                    <Select onValueChange={setEditingLabel} value={editingLabel}>
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="라벨 선택 (선택사항)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">라벨 없음</SelectItem>
                                        {labels.map((label: any) => (
                                          <SelectItem key={label.id} value={label.id.toString()}>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: label.color }}
                                              />
                                              {label.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <Input
                                    placeholder="메모 (선택사항)"
                                    value={editingMemo}
                                    onChange={(e) => setEditingMemo(e.target.value)}
                                    className="text-sm flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveEdit();
                                      } else if (e.key === 'Escape') {
                                        handleCancelEdit();
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-gray-900 truncate">{place.name}</h3>
                                    {place.labelId && labels && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs h-5 shrink-0"
                                        style={{ 
                                          backgroundColor: labels?.find((l: any) => l.id === place.labelId)?.color + '20',
                                          color: labels?.find((l: any) => l.id === place.labelId)?.color 
                                        }}
                                      >
                                        {labels?.find((l: any) => l.id === place.labelId)?.name}
                                      </Badge>
                                    )}
                                  </div>
                                  {place.description && place.description.trim() && !place.description.includes('Google Places ID:') && (
                                    <p className="text-sm text-gray-600 italic">{place.description}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* 액션 버튼들 */}
                            <div className="flex items-center space-x-1 ml-2 shrink-0">
                              {editingPlace !== place.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(place)}
                                  className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                  title="이름, 라벨, 메모 수정"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (place.latitude && place.longitude) {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
                                    
                                    // about:blank 방지를 위한 방법
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.target = '_blank';
                                    link.rel = 'noopener noreferrer';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                                className="text-green-500 hover:text-green-600 h-8 w-8 p-0"
                                title="구글 네비게이션"
                              >
                                <Navigation className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (place.latitude && place.longitude) {
                                    // Google Maps에서 장소 검색
                                    const lat = parseFloat(place.latitude);
                                    const lng = parseFloat(place.longitude);
                                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                    
                                    // about:blank 방지를 위한 방법
                                    const link = document.createElement('a');
                                    link.href = mapsUrl;
                                    link.target = '_blank';
                                    link.rel = 'noopener noreferrer';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                                className="text-blue-500 hover:text-blue-600 h-8 w-8 p-0"
                                title="Google Maps에서 보기"
                              >
                                <Map className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePlace(place.id)}
                                disabled={deletePlaceMutation.isPending}
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                title="장소 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                            
                            {place.address && (
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate" title={place.address.replace(/https?:\/\/[^\s]+/g, '').trim()}>
                                  {place.address.replace(/https?:\/\/[^\s]+/g, '').trim()}
                                </span>
                              </div>
                            )}
                            
                            {/* Place ID 또는 좌표 표시 및 복사 - 숨김 처리 */}
                            {false && (place.googlePlaceId || (place.latitude && place.longitude)) && (
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <div className="flex items-center space-x-2">
                                  {place.googlePlaceId ? (
                                    <>
                                      <span className="font-mono">Place ID: {place.googlePlaceId}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(place.googlePlaceId!);
                                          toast({
                                            title: "복사됨",
                                            description: "Place ID가 클립보드에 복사되었습니다.",
                                          });
                                        }}
                                        className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                                        title="Place ID 복사"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono">좌표: {place.latitude}, {place.longitude}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${place.latitude}, ${place.longitude}`);
                                          toast({
                                            title: "복사됨",
                                            description: "좌표가 클립보드에 복사되었습니다.",
                                          });
                                        }}
                                        className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                                        title="좌표 복사"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 별점, 사진, 링크를 한 줄에 배치 */}
                            <div className="flex items-center justify-between space-x-3 mb-1">
                              <div className="flex items-center space-x-3">
                                {place.rating && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                                    <span>{place.rating}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* 사진과 링크 버튼들 */}
                              <div className="flex items-center space-x-1">
                                {/* 사진 관리 */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.multiple = true;
                                    input.onchange = (e) => {
                                      const files = (e.target as HTMLInputElement).files;
                                      if (files) {
                                        handlePhotoUpload(place.id, files);
                                      }
                                    };
                                    input.click();
                                  }}
                                  disabled={uploadingPhotos === place.id}
                                  className="text-xs h-7"
                                >
                                  {uploadingPhotos === place.id ? (
                                    <span>업로드중...</span>
                                  ) : (
                                    <>
                                      <Camera className="w-3 h-3 mr-1" />
                                      사진 ({Array.isArray(place.photos) ? place.photos.length : 0})
                                    </>
                                  )}
                                </Button>

                                {Array.isArray(place.photos) && place.photos.length > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        onClick={() => setViewingPhotos(place)}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center justify-between">
                                          <span>{place.name} 사진</span>
                                          <span className="text-sm text-gray-500 font-normal">
                                            ({Array.isArray(place.photos) ? place.photos.length : 0}/10)
                                          </span>
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                                        {Array.isArray(place.photos) && place.photos.map((photo, index) => (
                                          <div key={index} className="relative group">
                                            <img
                                              src={photo}
                                              alt={`${place.name} 사진 ${index + 1}`}
                                              className="w-full h-auto rounded-lg border shadow-sm"
                                            />
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (window.confirm('이 사진을 삭제하시겠습니까?')) {
                                                    handleDeletePhoto(place.id, index);
                                                  }
                                                }}
                                                className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 shadow-lg"
                                                title="사진 삭제"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                              {index + 1} / {Array.isArray(place.photos) ? place.photos.length : 0}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex justify-between items-center pt-4 border-t">
                                        <div className="text-sm text-gray-500">
                                          마우스를 올리면 삭제 버튼이 나타납니다
                                        </div>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = true;
                                            input.onchange = (e) => {
                                              const files = (e.target as HTMLInputElement).files;
                                              if (files) {
                                                handlePhotoUpload(place.id, files);
                                              }
                                            };
                                            input.click();
                                          }}
                                          disabled={Array.isArray(place.photos) && place.photos.length >= 10}
                                          className="text-sm"
                                        >
                                          <Camera className="w-4 h-4 mr-2" />
                                          사진 추가
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}

                                {/* 관련 링크 관리 */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingLinks(editingLinks === place.id ? null : place.id)}
                                  className="text-xs h-7"
                                >
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  링크 ({Array.isArray(place.links) ? place.links.length : 0})
                                </Button>

                                {Array.isArray(place.links) && place.links.length > 0 && place.links.map((link: any) => (
                                  <Button
                                    key={link.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(link.url, '_blank')}
                                    className="text-xs h-7 w-7 p-0"
                                    title={link.url}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* 링크 편집 영역 */}
                            {editingLinks === place.id && (
                              <div className="border rounded-lg p-3 mb-2 bg-gray-50">
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">관련 링크 관리</div>
                                  
                                  {/* 기존 링크 목록 */}
                                  {Array.isArray(place.links) && place.links.length > 0 && (
                                    <div className="space-y-1">
                                      {place.links.map((link: any) => (
                                        <div key={link.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                          <div className="flex-1">
                                            <div className="text-xs text-gray-500 truncate">{link.url}</div>
                                          </div>
                                          <div className="flex space-x-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => window.open(link.url, '_blank')}
                                              className="h-6 w-6 p-0"
                                              title="링크 열기"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (window.confirm('이 링크를 삭제하시겠습니까?')) {
                                                  handleDeleteLink(place.id, link.id);
                                                }
                                              }}
                                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                              title="링크 삭제"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 새 링크 추가 */}
                                  <div className="space-y-2 pt-2 border-t">
                                    <div className="text-xs text-gray-600">새 링크 추가</div>
                                    <div className="space-y-2">
                                      <Input
                                        placeholder="URL (https://...)"
                                        value={newLink.url}
                                        onChange={(e) => setNewLink({ url: e.target.value })}
                                        className="text-sm w-full"
                                      />
                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddLink(place.id)}
                                          disabled={updateLinksMutation.isPending}
                                          className="text-xs"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          추가
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingLinks(null);
                                            setNewLink({ url: "" });
                                          }}
                                          className="text-xs"
                                        >
                                          취소
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {selectedCategory === 'all' ? '아직 저장된 장소가 없습니다.' : '이 라벨에 저장된 장소가 없습니다.'}
                  </p>
                  <p className="text-sm text-gray-400">장소 검색 탭에서 새로운 장소를 찾아보세요.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="map" className="p-0">
            <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* 라벨 선택 */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="space-y-2">
                <select
                  value={mapCategory}
                  onChange={(e) => setMapCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm w-full"
                >
                  <option value="all">전체 라벨 ({savedPlaces?.length || 0})</option>
                  {Object.keys(groupedPlaces).map((labelName) => {
                    const label = labels?.find((l: any) => l.name === labelName);
                    return (
                      <option key={labelName} value={labelName}>
                        {labelName === '라벨없음' ? '🏷️' : '🏷️'} {labelName} ({groupedPlaces[labelName].length})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            {/* 지도 영역 */}
            <div id="map-container" className="flex-1 relative overflow-hidden" style={{ touchAction: 'pan-x pan-y' }}>
              {savedPlaces && savedPlaces.length > 0 ? (
                <>
                  <div
                    ref={mapRef}
                    id="saved-places-map"
                    className="w-full h-full"
                    style={{ 
                      minHeight: '600px',
                      touchAction: 'pan-x pan-y',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none'
                    }}
                  />
                  
                  {/* 지도 컨트롤 버튼들 */}
                  <div className="absolute top-4 right-4 z-20">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const validPlaces = mapFilteredPlaces.filter(p => p.latitude && p.longitude);
                          if (validPlaces.length > 0) {
                            const coords = validPlaces.map(p => `${p.latitude},${p.longitude}`).join('|');
                            const url = `https://www.google.com/maps/dir/${coords}`;
                            window.open(url, '_blank');
                          }
                        }}
                        className="bg-white shadow-lg text-xs"
                        title="길찾기"
                      >
                        길찾기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const validPlaces = mapFilteredPlaces.filter(p => p.latitude && p.longitude);
                          if (validPlaces.length > 0) {
                            const centerLat = validPlaces.reduce((sum, p) => sum + p.latitude!, 0) / validPlaces.length;
                            const centerLng = validPlaces.reduce((sum, p) => sum + p.longitude!, 0) / validPlaces.length;
                            const url = `https://www.google.com/maps/@${centerLat},${centerLng},15z`;
                            window.open(url, '_blank');
                          }
                        }}
                        className="bg-white shadow-lg text-xs"
                        title="Google Maps에서 열기"
                      >
                        앱에서 열기
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">저장된 장소가 없습니다</p>
                    <p className="text-sm text-gray-400">장소를 저장하면 지도에서 확인할 수 있습니다</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 장소 목록 영역 */}
            {savedPlaces && savedPlaces.length > 0 && (
              <div className="border-t bg-white">
                <div className="p-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-sm flex items-center">
                    <Map className="w-4 h-4 mr-1 text-blue-500" />
                    {mapCategory === 'all' ? '전체 장소' : mapCategory} ({mapFilteredPlaces.filter(p => p.latitude && p.longitude).length})
                  </h3>
                </div>
                <div className="p-3 h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {mapFilteredPlaces.filter(p => p.latitude && p.longitude).map((place, index) => (
                      <div key={place.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 group cursor-pointer"
                           onClick={() => handleListItemClick(place)}>
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {place.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block truncate">
                              {place.name.length > 12 ? `${place.name.substring(0, 12)}...` : place.name}
                            </span>
                            <span className="text-xs text-gray-500 block truncate">
                              {place.address && place.address.replace(/https?:\/\/[^\s]+/g, '').trim().length > 25 
                                ? `${place.address.replace(/https?:\/\/[^\s]+/g, '').trim().substring(0, 25)}...` 
                                : place.address?.replace(/https?:\/\/[^\s]+/g, '').trim()
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (place.latitude && place.longitude) {
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
                                window.open(url, '_blank');
                              }
                            }}
                            className="text-green-500 hover:text-green-600"
                            title="구글 네비게이션"
                          >
                            <Navigation className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleListItemClick(place);
                            }}
                            className="text-blue-500 hover:text-blue-600"
                            title="지도에서 보기"
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="p-0">
            <div className="px-4 py-4 bg-primary-50 border-b">
              <PlaceSearch
                onSelectPlace={(place) => {
                  toast({
                    title: "장소 저장됨",
                    description: `${place.name}이(가) 저장되었습니다.`,
                  });
                }}
                buttonText="새로운 장소 찾기"
                className="w-full h-12 text-base font-medium bg-primary-500 hover:bg-primary-600 text-white"
              />
              <p className="text-sm text-gray-600 text-center mt-3">
                Google Maps에서 새로운 장소를 찾아 저장하세요
              </p>
            </div>
            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">사용 팁</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 정확한 장소명으로 검색하면 더 정확한 결과를 얻을 수 있습니다</li>
                  <li>• 저장된 장소는 지도에서 확인할 수 있습니다</li>
                  <li>• 라벨을 설정하여 장소를 분류할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="px-4 py-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Google 저장된 장소 가져오기</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Google Takeout에서 다운로드한 "Saved Places" JSON 파일을 업로드하여 
                  저장된 장소를 일괄 가져올 수 있습니다.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importPlacesMutation.isPending}
                  className="mb-2"
                >
                  {importPlacesMutation.isPending ? '업로드 중...' : 'JSON 파일 선택'}
                </Button>
                <p className="text-sm text-gray-500">
                  .json 파일만 지원됩니다
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Google Takeout 사용 방법:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Google Takeout (takeout.google.com) 방문</li>
                  <li>"Maps (your places)" 선택</li>
                  <li>"Saved Places.json" 파일 다운로드</li>
                  <li>위 버튼을 클릭하여 파일 업로드</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}