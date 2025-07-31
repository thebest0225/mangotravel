import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Star, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedPlace } from "@shared/schema";

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

interface SchedulePlaceSearchProps {
  onSelectPlace: (place: PlaceResult | SavedPlace) => void;
  buttonText?: string;
  className?: string;
}

export function SchedulePlaceSearch({ onSelectPlace, buttonText = "장소 검색", className = "" }: SchedulePlaceSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPlaceQuery, setSavedPlaceQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("google");
  const { toast } = useToast();

  const { data: savedPlaces } = useQuery<SavedPlace[]>({
    queryKey: ['/api/saved-places'],
  });

  const { data: locationLabels } = useQuery({
    queryKey: ['/api/location-labels'],
  });

  // 저장된 장소 필터링 함수
  const filteredSavedPlaces = savedPlaces?.filter(place => 
    !savedPlaceQuery || 
    place.name.toLowerCase().includes(savedPlaceQuery.toLowerCase()) ||
    place.address?.toLowerCase().includes(savedPlaceQuery.toLowerCase()) ||
    place.region?.toLowerCase().includes(savedPlaceQuery.toLowerCase())
  ) || [];

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

  // 실시간 검색을 위한 useEffect (디바운싱 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && activeTab === "google") {
        searchPlaces(searchQuery);
      } else if (!searchQuery.trim()) {
        setSearchResults([]);
      }
    }, 300); // 300ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab]);

  const handleDirectSelect = (place: PlaceResult) => {
    console.log("handleDirectSelect called with:", place);
    onSelectPlace(place);
    handleCloseDialog();
  };

  const handleSavedPlaceSelect = (place: SavedPlace) => {
    // SavedPlace를 PlaceResult 형태로 변환
    const convertedPlace: PlaceResult = {
      place_id: place.googlePlaceId || place.name,
      name: place.name,
      formatted_address: place.address || '',
      rating: place.rating ? parseFloat(place.rating) : undefined,
      types: place.placeTypes as string[] || [],
      geometry: {
        location: {
          lat: place.latitude ? parseFloat(place.latitude) : 0,
          lng: place.longitude ? parseFloat(place.longitude) : 0,
        }
      }
    };
    console.log("handleSavedPlaceSelect called with:", convertedPlace);
    onSelectPlace(convertedPlace);
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setSearchQuery("");
    setSavedPlaceQuery("");
    setSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center space-x-2 ${className}`}
          onClick={() => setIsOpen(true)}
        >
          <Search className="w-4 h-4" />
          <span>{buttonText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>장소 검색</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">새로운 장소 찾기</TabsTrigger>
              <TabsTrigger value="saved">저장된 장소</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google" className="space-y-4 mt-4">
              {/* 검색 입력 */}
              <div className="flex space-x-2">
                <Input
                  placeholder="장소를 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchPlaces(searchQuery);
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={() => searchPlaces(searchQuery)}
                  disabled={isSearching}
                  className="shrink-0"
                >
                  {isSearching ? "검색중..." : "검색"}
                </Button>
              </div>

              {/* 검색 결과 */}
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {searchResults.map((place) => (
                    <Card 
                      key={place.place_id} 
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{place.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {place.formatted_address}
                            </p>
                            
                            <div className="flex items-center mt-2 space-x-2">
                              {place.rating && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  <span>{place.rating}</span>
                                </div>
                              )}
                              {place.opening_hours && (
                                <Badge variant={place.opening_hours.open_now ? "default" : "secondary"} className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {place.opening_hours.open_now ? "영업중" : "영업종료"}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              {place.types.slice(0, 3).map((type, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDirectSelect(place)}
                            >
                              선택
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {searchResults.length === 0 && searchQuery && !isSearching && (
                    <div className="text-center text-gray-500 py-8">
                      검색 결과가 없습니다.
                    </div>
                  )}
                  
                  {searchResults.length === 0 && !searchQuery && (
                    <div className="text-center text-gray-500 py-8">
                      장소를 검색해보세요.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="saved" className="space-y-4 mt-4">
              {/* 저장된 장소 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="저장된 장소 검색..."
                  value={savedPlaceQuery}
                  onChange={(e) => setSavedPlaceQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 저장된 장소 목록 */}
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredSavedPlaces.map((place) => (
                    <Card 
                      key={place.id} 
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => handleSavedPlaceSelect(place)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{place.name}</h3>
                            {place.address && (
                              <p className="text-sm text-gray-600 flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1" />
                                {place.address}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2">
                              {place.labelId && locationLabels && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                  style={{ 
                                    backgroundColor: locationLabels.find((label: any) => label.id === place.labelId)?.color + '20',
                                    color: locationLabels.find((label: any) => label.id === place.labelId)?.color 
                                  }}
                                >
                                  {locationLabels.find((label: any) => label.id === place.labelId)?.name}
                                </Badge>
                              )}
                              {place.region && (
                                <Badge variant="outline" className="text-xs">
                                  {place.region}
                                </Badge>
                              )}
                              {place.rating && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  <span>{place.rating}</span>
                                </div>
                              )}
                            </div>
                            
                            {place.description && (
                              <p className="text-xs text-gray-500 mt-2">{place.description}</p>
                            )}
                          </div>
                          
                          <div className="ml-4">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredSavedPlaces.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      {savedPlaceQuery ? "검색 결과가 없습니다." : "저장된 장소가 없습니다."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}