import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertTravelPlanSchema, insertScheduleItemSchema, insertSavedPlaceSchema, insertUserSchema, insertLocationLabelSchema } from "@shared/schema";
import { z } from "zod";
import { Client } from "@googlemaps/google-maps-services-js";

// Express 세션 타입 확장
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      name: string;
      role: number;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 세션 설정
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mangogo-travel-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // development에서는 false
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
  }));
  // Travel Plans
  app.get("/api/travel-plans", async (req, res) => {
    try {
      const plans = await storage.getTravelPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch travel plans" });
    }
  });

  app.get("/api/travel-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const plan = await storage.getTravelPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch travel plan" });
    }
  });

  app.post("/api/travel-plans", async (req, res) => {
    try {
      const validatedData = insertTravelPlanSchema.parse(req.body);
      const plan = await storage.createTravelPlan(validatedData);
      
      // 교통수단 정보가 있으면 자동으로 일정에 추가
      if (plan.transportType !== "car" && plan.flightInfo) {
        await storage.createTransportScheduleItems(plan.id, validatedData);
      }
      
      // 여행 계획 생성 후 자동으로 숙소 출발 일정 생성 시도 (숙소 일정이 있을 경우)
      try {
        setTimeout(async () => {
          await storage.createAccommodationSchedules(plan.id);
          console.log("Auto-generated accommodation schedules checked/created for new plan");
        }, 1000); // 1초 후 실행하여 다른 일정들이 먼저 생성되도록 함
      } catch (accommodationError) {
        console.log("Failed to auto-generate accommodation schedules for new plan:", accommodationError);
      }
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create travel plan" });
    }
  });

  app.patch("/api/travel-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const validatedData = insertTravelPlanSchema.partial().parse(req.body);
      const plan = await storage.updateTravelPlan(id, validatedData);
      
      if (!plan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update travel plan" });
    }
  });

  // Update essential items for a travel plan
  app.patch("/api/travel-plans/:id/essential-items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const { essentialItems } = req.body;
      if (!Array.isArray(essentialItems)) {
        return res.status(400).json({ message: "Essential items must be an array" });
      }

      const plan = await storage.updateTravelPlan(id, { essentialItems });
      
      if (!plan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to update essential items" });
    }
  });

  app.delete("/api/travel-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const deleted = await storage.deleteTravelPlan(id);
      if (!deleted) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete travel plan" });
    }
  });

  // 기존 여행 계획에 교통수단 일정 추가
  app.post("/api/travel-plans/:id/transport-schedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const plan = await storage.getTravelPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      // 교통수단 정보가 있으면 자동으로 일정에 추가
      if (plan.transportType !== "car" && plan.flightInfo) {
        const planData = {
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
          participants: plan.participants as any,
          status: plan.status,
          transportType: plan.transportType,
          flightInfo: plan.flightInfo as any,
          essentialItems: plan.essentialItems as any
        };
        const scheduleItems = await storage.createTransportScheduleItems(plan.id, planData);
        res.json({ 
          message: "Transport schedule items created successfully", 
          items: scheduleItems 
        });
      } else {
        res.json({ 
          message: "No transport information found or transport type is car",
          items: [] 
        });
      }
    } catch (error) {
      console.error("Error creating transport schedule:", error);
      res.status(500).json({ message: "Failed to create transport schedule" });
    }
  });

  // Add accommodation schedules to existing travel plan
  app.post("/api/travel-plans/:id/accommodation-schedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const plan = await storage.getTravelPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }

      // 숙소 기반 일정 자동 생성
      const scheduleItems = await storage.createAccommodationSchedules(plan.id);
      res.json({ 
        message: "Accommodation schedule items created successfully", 
        items: scheduleItems 
      });
    } catch (error) {
      console.error("Error creating accommodation schedule:", error);
      res.status(500).json({ message: "Failed to create accommodation schedule" });
    }
  });

  // Schedule Items
  app.get("/api/travel-plans/:planId/schedule", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const date = req.query.date as string;
      const scheduleItems = date 
        ? await storage.getScheduleItemsByDate(planId, date)
        : await storage.getScheduleItemsByPlan(planId);

      res.json(scheduleItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule items" });
    }
  });

  app.post("/api/travel-plans/:planId/schedule", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      console.log("Creating schedule item for plan:", planId);
      console.log("Request body:", req.body);

      const scheduleData = { ...req.body, planId };
      console.log("Schedule data before validation:", scheduleData);
      
      const validatedData = insertScheduleItemSchema.parse(scheduleData);
      console.log("Validated data:", validatedData);
      
      const item = await storage.createScheduleItem(validatedData);
      console.log("Created item:", item);
      
      // 새 일정이 추가된 후 자동으로 숙소 출발 일정 생성 시도
      try {
        await storage.createAccommodationSchedules(planId);
        console.log("Auto-generated accommodation schedules checked/created");
      } catch (accommodationError) {
        console.log("Failed to auto-generate accommodation schedules:", accommodationError);
        // 숙소 일정 생성 실패는 메인 일정 생성에 영향주지 않도록 에러 무시
      }
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Schedule creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schedule item", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/schedule-items", async (req, res) => {
    try {
      const validatedData = insertScheduleItemSchema.parse(req.body);
      const item = await storage.createScheduleItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schedule item" });
    }
  });

  app.patch("/api/schedule-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule item ID" });
      }

      const validatedData = insertScheduleItemSchema.partial().parse(req.body);
      const item = await storage.updateScheduleItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Schedule item not found" });
      }

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schedule item" });
    }
  });

  app.delete("/api/schedule-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule item ID" });
      }

      const deleted = await storage.deleteScheduleItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule item not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule item" });
    }
  });

  // Saved Places
  app.get("/api/saved-places", async (req, res) => {
    try {
      const places = await storage.getSavedPlaces();
      res.json(places);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved places" });
    }
  });

  app.post("/api/saved-places", async (req, res) => {
    try {
      const validatedData = insertSavedPlaceSchema.parse(req.body);
      const place = await storage.createSavedPlace(validatedData);
      res.status(201).json(place);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create saved place" });
    }
  });

  app.post("/api/saved-places/import", async (req, res) => {
    try {
      const { places } = req.body;
      if (!Array.isArray(places)) {
        return res.status(400).json({ message: "Places must be an array" });
      }

      let imported = 0;
      let errors = 0;

      for (const placeData of places) {
        try {
          // 기본 필드 매핑 및 지역 정보 추출
          const processedPlace = {
            name: placeData.name || placeData.title || 'Unknown Place',
            address: placeData.address || placeData.location?.address || '',
            category: placeData.category || 'imported',
            rating: placeData.rating?.toString() || '',
            description: placeData.description || placeData.note || '',
            googlePlaceId: placeData.googlePlaceId || placeData.place_id || '',
            latitude: placeData.latitude?.toString() || '',
            longitude: placeData.longitude?.toString() || '',
            country: placeData.country || extractCountryFromAddress(placeData.address),
            region: placeData.region || extractRegionFromAddress(placeData.address),
            city: placeData.city || extractCityFromAddress(placeData.address),
            placeTypes: placeData.place_types || placeData.types || [],
            photos: [], // Google 사진은 자동 포함하지 않음, 사용자가 직접 업로드해야 함
            openingHours: placeData.opening_hours || placeData.openingHours,
            website: placeData.website || placeData.url || '',
            phoneNumber: placeData.phone_number || placeData.phoneNumber || '',
          };

          const validatedData = insertSavedPlaceSchema.parse(processedPlace);
          await storage.createSavedPlace(validatedData);
          imported++;
        } catch (error) {
          console.error('Error importing place:', placeData, error);
          errors++;
        }
      }

      res.json({ 
        message: `Import completed: ${imported} places imported, ${errors} errors`,
        imported,
        errors 
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ message: "Failed to import places" });
    }
  });

  app.patch("/api/saved-places/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid place ID" });
      }

      console.log("Updating saved place:", id, "with data:", Object.keys(req.body));
      const updates = req.body;
      
      // photos 배열 로깅 (길이만)
      if (updates.photos) {
        console.log("Photos array length:", updates.photos.length);
      }
      
      const updatedPlace = await storage.updateSavedPlace(id, updates);
      
      if (!updatedPlace) {
        return res.status(404).json({ message: "Saved place not found" });
      }

      console.log("Successfully updated place:", id);
      res.json(updatedPlace);
    } catch (error) {
      console.error("Update saved place error:", error);
      res.status(500).json({ message: "Failed to update saved place", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/saved-places/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid place ID" });
      }

      const deleted = await storage.deleteSavedPlace(id);
      if (!deleted) {
        return res.status(404).json({ message: "Saved place not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete saved place" });
    }
  });

  // 일회성 데이터 정리 API - Google Places ID가 포함된 description 정리
  app.post("/api/saved-places/cleanup-descriptions", async (req, res) => {
    try {
      const places = await storage.getSavedPlaces();
      let updatedCount = 0;
      
      for (const place of places) {
        if (place.description && place.description.includes('Google Places ID:')) {
          await storage.updateSavedPlace(place.id, { description: null });
          updatedCount++;
        }
      }
      
      res.json({ 
        message: `Cleaned up ${updatedCount} places with Google Places ID in description`,
        updatedCount 
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ message: "Failed to cleanup descriptions" });
    }
  });

  // Helper functions for extracting location info from address
  function extractCountryFromAddress(address: string | undefined): string | undefined {
    if (!address) return undefined;
    
    const countryPatterns = [
      /일본|Japan/i,
      /한국|Korea/i,
      /중국|China/i,
      /미국|USA|United States/i,
      /프랑스|France/i,
      /이탈리아|Italy/i,
      /스페인|Spain/i,
      /독일|Germany/i,
      /영국|UK|United Kingdom/i,
    ];

    for (const pattern of countryPatterns) {
      const match = address.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return undefined;
  }

  function extractRegionFromAddress(address: string | undefined): string | undefined {
    if (!address) return undefined;
    
    // 일본 지역 패턴 - 오키나와는 별도 처리
    if (address.match(/오키나와|Okinawa/i)) {
      return '오키나와';
    }
    
    // 기타 일본 지역들은 일본으로 통합
    const japanRegions = address.match(/(도쿄|오사카|교토|후쿠오카|나고야|센다이|삿포로)/i);
    if (japanRegions || address.match(/일본|Japan/i)) return '일본';
    
    // 한국 도/시 패턴
    const koreaRegions = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
    if (koreaRegions) return koreaRegions[1];
    
    // 한국으로 명시된 경우
    if (address.match(/한국|Korea/i)) return '한국';
    
    return undefined;
  }

  function extractCityFromAddress(address: string | undefined): string | undefined {
    if (!address) return undefined;
    
    // 시/구/군 패턴
    const cityMatch = address.match(/([가-힣]+(?:시|구|군))/);
    return cityMatch ? cityMatch[1] : undefined;
  }

  // Google Places API
  const googleMapsClient = new Client({});
  
  app.post("/api/places/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      console.log("Searching for:", query);
      
      const response = await googleMapsClient.textSearch({
        params: {
          query: query,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: 'ko' as any,
          region: 'KR'
        }
      });

      console.log("Google API Response status:", response.data.status);
      
      if (response.data.status === 'REQUEST_DENIED') {
        console.error("API Key restriction error:", response.data.error_message);
        return res.status(403).json({ 
          message: "API key restriction error", 
          error: response.data.error_message 
        });
      }

      res.json(response.data);
    } catch (error) {
      console.error("Google Places API error:", error);
      res.status(500).json({ 
        message: "Failed to search places", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/places/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;
      
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: 'ko' as any,
          fields: ['name', 'formatted_address', 'geometry', 'rating', 'reviews', 'opening_hours']
        }
      });

      res.json(response.data);
    } catch (error) {
      console.error("Google Places Details API error:", error);
      res.status(500).json({ message: "Failed to fetch place details" });
    }
  });

  // Travel time calculation API
  app.post("/api/travel-time", async (req, res) => {
    try {
      const { origin, destination, mode = 'driving' } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ message: "Origin and destination are required" });
      }

      if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      console.log(`Calculating travel time from ${origin} to ${destination}`);
      
      const response = await googleMapsClient.directions({
        params: {
          origin,
          destination,
          mode: mode as any,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: 'ko' as any,
          region: 'KR'
        }
      });
      
      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        
        res.json({
          duration: leg.duration,
          distance: leg.distance,
          steps: leg.steps?.length || 0
        });
      } else {
        res.status(404).json({ message: "No route found" });
      }
    } catch (error) {
      console.error("Error calculating travel time:", error);
      res.status(500).json({ 
        message: "Failed to calculate travel time",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Weather API endpoint
  app.post("/api/weather", async (req, res) => {
    try {
      const { location, date } = req.body;
      
      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }

      if (!process.env.OPENWEATHER_API_KEY) {
        return res.status(500).json({ message: "OpenWeather API key not configured" });
      }

      // Use predefined coordinates for common locations to avoid geocoding issues
      const locationCoordinates: { [key: string]: { lat: number; lon: number } } = {
        '인천공항': { lat: 37.4602, lon: 126.4407 },
        '나하 공항': { lat: 26.1958, lon: 127.6458 },
        '나하공항': { lat: 26.1958, lon: 127.6458 },
        'okinawa': { lat: 26.2124, lon: 127.6792 },
        'onna': { lat: 26.5031, lon: 127.8014 },
        '온나': { lat: 26.5031, lon: 127.8014 },
        '야마다': { lat: 26.4307, lon: 127.7796 }
      };

      let lat, lon;
      
      // Check if we have predefined coordinates
      const locationKey = Object.keys(locationCoordinates).find(key => 
        location.toLowerCase().includes(key.toLowerCase())
      );
      
      if (locationKey) {
        ({ lat, lon } = locationCoordinates[locationKey]);
        console.log(`Using predefined coordinates for ${locationKey}: ${lat}, ${lon}`);
      } else {
        // Try geocoding as fallback
        try {
          const geocodeResponse = await fetch(
            `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent('Okinawa, Japan')}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
          );
          
          if (geocodeResponse.ok) {
            const geoData = await geocodeResponse.json();
            if (geoData.length > 0) {
              ({ lat, lon } = geoData[0]);
              console.log(`Using geocoded coordinates for Okinawa: ${lat}, ${lon}`);
            } else {
              // Default to Okinawa coordinates if geocoding fails
              lat = 26.2124;
              lon = 127.6792;
              console.log(`Using default Okinawa coordinates: ${lat}, ${lon}`);
            }
          } else {
            lat = 26.2124;
            lon = 127.6792;
            console.log(`Using default Okinawa coordinates due to geocoding error: ${lat}, ${lon}`);
          }
        } catch (error) {
          // Default to Okinawa coordinates
          lat = 26.2124;
          lon = 127.6792;
          console.log(`Using default Okinawa coordinates due to exception: ${lat}, ${lon}`);
        }
      }
      
      // Get current weather
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=kr`
      );
      
      if (!weatherResponse.ok) {
        throw new Error("Failed to get weather data");
      }
      
      const weatherData = await weatherResponse.json();
      
      res.json({
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        humidity: weatherData.main.humidity,
        feels_like: Math.round(weatherData.main.feels_like)
      });
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ 
        message: "Failed to get weather data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      if (!name || !password) {
        return res.status(400).json({ message: "Name and password are required" });
      }

      const user = await storage.getUserByName(name);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // 세션에 사용자 정보 저장
      req.session.user = { id: user.id, name: user.name, role: user.role };
      res.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Logout failed" });
      } else {
        res.json({ message: "Logged out successfully" });
      }
    });
  });

  app.get("/api/auth/session", (req, res) => {
    const user = req.session.user;
    if (user) {
      res.json({ user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Users management
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // 비밀번호는 응답에서 제외
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      // 비밀번호는 응답에서 제외
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 비밀번호는 응답에서 제외
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Location Labels management
  app.get("/api/location-labels", async (req, res) => {
    try {
      const labels = await storage.getLocationLabels();
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location labels" });
    }
  });

  app.post("/api/location-labels", async (req, res) => {
    try {
      const validatedData = insertLocationLabelSchema.parse(req.body);
      const label = await storage.createLocationLabel(validatedData);
      res.status(201).json(label);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create location label" });
    }
  });

  app.patch("/api/location-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid label ID" });
      }

      const validatedData = insertLocationLabelSchema.partial().parse(req.body);
      const label = await storage.updateLocationLabel(id, validatedData);
      
      if (!label) {
        return res.status(404).json({ message: "Location label not found" });
      }

      res.json(label);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update location label" });
    }
  });

  app.delete("/api/location-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid label ID" });
      }

      const success = await storage.deleteLocationLabel(id);
      if (!success) {
        return res.status(404).json({ message: "Location label not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location label" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
