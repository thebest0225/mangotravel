import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Star, Clock, Bookmark, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertSavedPlace, LocationLabel, SavedPlace } from "@shared/schema";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
  };
}

interface PlaceSearchProps {
  onSelectPlace: (place: PlaceResult) => void;
  buttonText?: string;
  className?: string;
}

export function PlaceSearch({ onSelectPlace, buttonText = "장소 검색", className = "" }: PlaceSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: labels } = useQuery<LocationLabel[]>({
    queryKey: ['/api/location-labels'],
  });

  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "검색 오류",
        description: "장소 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const savePlaceMutation = useMutation({
    mutationFn: async (place: PlaceResult) => {
      if (!selectedLabel) {
        throw new Error("라벨을 선택해주세요");
      }

      const saveData: InsertSavedPlace = {
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry.location.lat.toString(),
        longitude: place.geometry.location.lng.toString(),
        googlePlaceId: place.place_id,
        rating: place.rating?.toString(),
        labelId: parseInt(selectedLabel),
        placeTypes: place.types,
        photos: [], // 초기에는 빈 배열로 설정, 사용자가 직접 업로드해야 함
        region: extractRegionFromAddress(place.formatted_address),
        openingHours: place.opening_hours ? { open_now: place.opening_hours.open_now } : undefined
      };

      const response = await apiRequest("POST", "/api/saved-places", saveData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-places'] });
      toast({
        title: "장소 저장 완료",
        description: "장소가 성공적으로 저장되었습니다.",
      });
      setSelectedLabel("");
      setSelectedPlace(null);
      setIsOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message || "장소 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handlePlaceClick = (place: PlaceResult) => {
    setSelectedPlace(place);
  };

  const handleSavePlace = () => {
    if (selectedPlace) {
      savePlaceMutation.mutate(selectedPlace);
    }
  };

  function extractRegionFromAddress(address: string | undefined): string | undefined {
    if (!address) return undefined;
    
    if (address.includes('오키나와') || address.includes('Okinawa')) {
      return '오키나와';
    }
    
    const koreanRegions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
    for (const region of koreanRegions) {
      if (address.includes(region)) {
        return region;
      }
    }
    
    if (address.includes('일본') || address.includes('Japan')) {
      return '일본';
    }
    
    return undefined;
  }

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className={className}>
          <MapPin className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">장소 검색</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="장소, 주소, 또는 키워드를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 선택된 장소 및 저장 섹션 */}
          {selectedPlace && (
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-3 space-y-3">
              <div>
                <h4 className="font-semibold text-blue-900 text-sm mb-1">선택된 장소</h4>
                <p className="text-sm text-blue-800">{selectedPlace.name}</p>
                <p className="text-xs text-blue-600">{selectedPlace.formatted_address}</p>
              </div>
              
              {/* 라벨 선택 */}
              {labels && labels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    라벨 선택 (선택사항)
                  </label>
                  <Select onValueChange={setSelectedLabel} value={selectedLabel}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="라벨 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">라벨 없음</SelectItem>
                      {labels.map((label) => (
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
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSavePlace}
                  disabled={savePlaceMutation.isPending}
                  size="sm"
                  className="flex-1"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  {savePlaceMutation.isPending ? "저장 중..." : "장소 저장"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedPlace(null)}
                  className="px-3"
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[450px] w-full">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">검색 중...</div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((place) => (
                  <Card key={place.place_id} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div 
                        className={`cursor-pointer ${selectedPlace?.place_id === place.place_id ? 'bg-blue-50 border-blue-200' : ''}`}
                        onClick={() => handlePlaceClick(place)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{place.name}</h3>
                              {selectedPlace?.place_id === place.place_id && (
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{place.formatted_address}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {place.rating && (
                                <div className="flex items-center">
                                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                                  <span>{place.rating}</span>
                                </div>
                              )}
                              {place.opening_hours && (
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>{place.opening_hours.open_now ? "영업중" : "영업종료"}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-2">
                              <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                {place.types[0]?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">검색 결과가 없습니다.</div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">장소를 검색해보세요.</div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}