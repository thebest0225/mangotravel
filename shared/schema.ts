
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const travelPlans = pgTable("travel_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  participants: jsonb("participants").notNull().default([]), // array of selected participants
  status: text("status").notNull().default("planning"), // planning, active, completed
  transportType: text("transport_type").notNull().default("car"), // car, flight, ship, train
  flightInfo: jsonb("flight_info"),
  essentialItems: jsonb("essential_items").default([]),
});

export const scheduleItems = pgTable("schedule_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  memo: text("memo"),
  order: integer("order").notNull().default(0),
});

export const savedPlaces = pgTable("saved_places", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  category: text("category"),
  rating: text("rating"),
  description: text("description"),
  googlePlaceId: text("google_place_id"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  country: text("country"), // 국가
  region: text("region"), // 도/현/주
  city: text("city"), // 시/구
  placeTypes: jsonb("place_types").default([]), // Google Places API types
  photos: jsonb("photos").default([]), // 사진 URL 배열
  openingHours: jsonb("opening_hours"), // 영업시간 정보
  website: text("website"), // 웹사이트 URL
  links: jsonb("links").default([]), // 관련 링크 배열 (제목, URL)
  phoneNumber: text("phone_number"), // 전화번호
  customLabel: text("custom_label"), // 사용자 지정 라벨
  labelId: integer("label_id"), // 위치 라벨 ID (locationLabels 테이블 참조)
  createdAt: timestamp("created_at").defaultNow(),
});

// 사용자 및 인증 테이블
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: integer("role").notNull().default(3), // 1=슈퍼관리자, 2=일반관리자, 3=일반참가자
  createdAt: timestamp("created_at").defaultNow(),
});

// 위치 라벨 관리 테이블
export const locationLabels = pgTable("location_labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").default("#3B82F6"), // 라벨 색상
  createdAt: timestamp("created_at").defaultNow(),
});

// Transport info schema - unified for all transport types
export const transportInfoSchema = z.object({
  type: z.enum(["car", "flight", "ship", "train"]),
  departure: z.object({
    location: z.string(), // airport, port, station, or address for car
    time: z.string(),
    company: z.string().optional(), // airline, ship company, train company
    transportNumber: z.string().optional(), // flight number, ship name, train number
  }),
  return: z.object({
    location: z.string(),
    time: z.string(),
    company: z.string().optional(),
    transportNumber: z.string().optional(),
  }).optional(),
});

// Legacy flight info schema for backward compatibility
export const flightInfoSchema = z.object({
  departure: z.object({
    airport: z.string(),
    time: z.string(),
    airline: z.string(),
    flightNumber: z.string(),
  }),
  return: z.object({
    airport: z.string(),
    time: z.string(),
    airline: z.string(),
    flightNumber: z.string(),
  }),
});

// Essential item schema
export const essentialItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  checked: z.boolean().default(false),
  attachedImages: z.array(z.string()).default([]), // Array of image file paths/URLs
});

export const participantSchema = z.object({
  name: z.string(),
  role: z.enum(["leader", "member"]).default("member"),
});

export const linkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

// Insert schemas
export const insertTravelPlanSchema = createInsertSchema(travelPlans).omit({ id: true });
export const insertScheduleItemSchema = createInsertSchema(scheduleItems).omit({ id: true });
export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertLocationLabelSchema = createInsertSchema(locationLabels).omit({ id: true });

// Types
export type TravelPlan = typeof travelPlans.$inferSelect;
export type InsertTravelPlan = z.infer<typeof insertTravelPlanSchema>;
export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type InsertScheduleItem = z.infer<typeof insertScheduleItemSchema>;
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertSavedPlace = z.infer<typeof insertSavedPlaceSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LocationLabel = typeof locationLabels.$inferSelect;
export type InsertLocationLabel = z.infer<typeof insertLocationLabelSchema>;
export type TransportInfo = z.infer<typeof transportInfoSchema>;
export type FlightInfo = z.infer<typeof flightInfoSchema>;
export type EssentialItem = z.infer<typeof essentialItemSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Link = z.infer<typeof linkSchema>;
