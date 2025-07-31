import { 
  travelPlans, 
  scheduleItems, 
  savedPlaces,
  users,
  locationLabels,
  type TravelPlan, 
  type InsertTravelPlan,
  type ScheduleItem,
  type InsertScheduleItem,
  type SavedPlace,
  type InsertSavedPlace,
  type User,
  type InsertUser,
  type LocationLabel,
  type InsertLocationLabel
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Travel Plans
  getTravelPlans(): Promise<TravelPlan[]>;
  getTravelPlan(id: number): Promise<TravelPlan | undefined>;
  createTravelPlan(plan: InsertTravelPlan): Promise<TravelPlan>;
  updateTravelPlan(id: number, plan: Partial<InsertTravelPlan>): Promise<TravelPlan | undefined>;
  deleteTravelPlan(id: number): Promise<boolean>;

  // Schedule Items
  getScheduleItemsByPlan(planId: number): Promise<ScheduleItem[]>;
  getScheduleItemsByDate(planId: number, date: string): Promise<ScheduleItem[]>;
  createScheduleItem(item: InsertScheduleItem): Promise<ScheduleItem>;
  updateScheduleItem(id: number, item: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined>;
  deleteScheduleItem(id: number): Promise<boolean>;

  // Saved Places
  getSavedPlaces(): Promise<SavedPlace[]>;
  createSavedPlace(place: InsertSavedPlace): Promise<SavedPlace>;
  updateSavedPlace(id: number, updates: Partial<InsertSavedPlace>): Promise<SavedPlace | undefined>;
  deleteSavedPlace(id: number): Promise<boolean>;

  // Transport Schedule Integration
  createTransportScheduleItems(planId: number, plan: InsertTravelPlan): Promise<ScheduleItem[]>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Location Labels
  getLocationLabels(): Promise<LocationLabel[]>;
  createLocationLabel(label: InsertLocationLabel): Promise<LocationLabel>;
  updateLocationLabel(id: number, updates: Partial<InsertLocationLabel>): Promise<LocationLabel | undefined>;
  deleteLocationLabel(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getTravelPlans(): Promise<TravelPlan[]> {
    const plans = await db.select().from(travelPlans).orderBy(travelPlans.id);
    return plans;
  }

  async getTravelPlan(id: number): Promise<TravelPlan | undefined> {
    const [plan] = await db.select().from(travelPlans).where(eq(travelPlans.id, id));
    return plan || undefined;
  }

  async createTravelPlan(insertPlan: InsertTravelPlan): Promise<TravelPlan> {
    const [plan] = await db
      .insert(travelPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateTravelPlan(id: number, updates: Partial<InsertTravelPlan>): Promise<TravelPlan | undefined> {
    const [plan] = await db
      .update(travelPlans)
      .set(updates)
      .where(eq(travelPlans.id, id))
      .returning();
    return plan || undefined;
  }

  async deleteTravelPlan(id: number): Promise<boolean> {
    const result = await db.delete(travelPlans).where(eq(travelPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getScheduleItemsByPlan(planId: number): Promise<ScheduleItem[]> {
    const items = await db
      .select()
      .from(scheduleItems)
      .where(eq(scheduleItems.planId, planId))
      .orderBy(scheduleItems.date, scheduleItems.order);
    return items;
  }

  async getScheduleItemsByDate(planId: number, date: string): Promise<ScheduleItem[]> {
    const items = await db
      .select()
      .from(scheduleItems)
      .where(and(eq(scheduleItems.planId, planId), eq(scheduleItems.date, date)))
      .orderBy(scheduleItems.order);
    
    // 시간 순서로 정렬 - 출발/도착 일정의 특별 처리 포함
    return items.sort((a, b) => {
      // 출발 일정 (order가 -1 또는 출발 관련)은 항상 맨 처음
      if (a.order === -1 || (a.title && a.title.includes('출발'))) return -1;
      if (b.order === -1 || (b.title && b.title.includes('출발'))) return 1;
      
      // 복귀 일정 (order가 1000 또는 도착 관련)은 항상 맨 마지막
      if (a.order === 1000 || (a.title && a.title.includes('도착') && a.title.includes('인천'))) return 1;
      if (b.order === 1000 || (b.title && b.title.includes('도착') && b.title.includes('인천'))) return -1;
      
      // 시간 형식 정규화 (ISO 형식을 HH:MM으로 변환)
      const normalizeTime = (time: string) => {
        if (time.includes('T')) {
          // ISO 형식에서 시간 부분만 추출 (2025-09-03T09:55 -> 09:55)
          return time.split('T')[1].substring(0, 5);
        }
        return time || '00:00';
      };
      
      const timeA = normalizeTime(a.time || '00:00');
      const timeB = normalizeTime(b.time || '00:00');
      return timeA.localeCompare(timeB);
    });
  }

  async createScheduleItem(insertItem: InsertScheduleItem): Promise<ScheduleItem> {
    const [item] = await db
      .insert(scheduleItems)
      .values(insertItem)
      .returning();
    
    // 생성 후 같은 날짜의 모든 아이템들의 order를 시간순으로 재정렬
    await this.reorderItemsByTime(item.planId, item.date);
    
    return item;
  }

  async updateScheduleItem(id: number, updates: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined> {
    const [item] = await db
      .update(scheduleItems)
      .set(updates)
      .where(eq(scheduleItems.id, id))
      .returning();
    
    // 업데이트 후 같은 날짜의 모든 아이템들의 order를 시간순으로 재정렬
    if (item && (updates.time || updates.date)) {
      await this.reorderItemsByTime(item.planId, item.date);
    }
    
    return item || undefined;
  }

  private async reorderItemsByTime(planId: number, date: string): Promise<void> {
    const items = await db
      .select()
      .from(scheduleItems)
      .where(and(eq(scheduleItems.planId, planId), eq(scheduleItems.date, date)));
    
    // 시간순으로 정렬 - 출발/도착 일정을 위한 특별 처리
    const sortedItems = items.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      
      // 출발 일정 (order가 -1)은 항상 맨 처음
      if (a.order === -1) return -1;
      if (b.order === -1) return 1;
      
      // 복귀 일정 (order가 1000)은 항상 맨 마지막
      if (a.order === 1000) return 1;
      if (b.order === 1000) return -1;
      
      // 나머지는 시간순으로 정렬
      return timeA.localeCompare(timeB);
    });

    // order 값을 시간순으로 재설정 (특별 order 값은 유지)
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      let newOrder = i;
      
      // 출발/복귀 일정의 특별 order 값은 유지
      if (item.order === -1 || item.order === 1000) {
        newOrder = item.order;
      }
      
      await db
        .update(scheduleItems)
        .set({ order: newOrder })
        .where(eq(scheduleItems.id, item.id));
    }
  }

  async deleteScheduleItem(id: number): Promise<boolean> {
    const result = await db.delete(scheduleItems).where(eq(scheduleItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSavedPlaces(): Promise<SavedPlace[]> {
    const places = await db.select().from(savedPlaces).orderBy(savedPlaces.name);
    return places;
  }

  async createSavedPlace(insertPlace: InsertSavedPlace): Promise<SavedPlace> {
    const [place] = await db
      .insert(savedPlaces)
      .values(insertPlace)
      .returning();
    return place;
  }

  async updateSavedPlace(id: number, updates: Partial<InsertSavedPlace>): Promise<SavedPlace | undefined> {
    const [place] = await db
      .update(savedPlaces)
      .set(updates)
      .where(eq(savedPlaces.id, id))
      .returning();
    return place || undefined;
  }

  async deleteSavedPlace(id: number): Promise<boolean> {
    const result = await db.delete(savedPlaces).where(eq(savedPlaces.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createTransportScheduleItems(planId: number, plan: InsertTravelPlan): Promise<ScheduleItem[]> {
    const scheduleItemsToCreate: InsertScheduleItem[] = [];
    

    
    // 교통수단이 자동차가 아닌 경우에만 일정 추가
    if (plan.transportType !== "car" && plan.flightInfo) {
      const flightInfo = plan.flightInfo as any;
      
      // 출발 일정 추가
      if (flightInfo.departure) {
        let title = "";
        let location = "";
        
        switch (plan.transportType) {
          case "flight":
            title = `✈️ ${flightInfo.departure.airline} ${flightInfo.departure.flightNumber} 출발`;
            location = flightInfo.departure.airport;
            break;
          case "ship":
            title = `🚢 ${flightInfo.departure.company || ''} ${flightInfo.departure.transportNumber || ''} 출발`;
            location = flightInfo.departure.location;
            break;
          case "train":
            title = `🚄 ${flightInfo.departure.company || ''} ${flightInfo.departure.transportNumber || ''} 출발`;
            location = flightInfo.departure.location;
            break;
        }
        
        scheduleItemsToCreate.push({
          planId,
          date: plan.startDate,
          time: flightInfo.departure.time || "09:00",
          title,
          location,
          memo: `${plan.transportType} 출발 일정`,
          order: -1  // 출발 일정을 맨 처음으로 설정
        });
      }
      
      // 도착 일정 추가 (return 정보가 있는 경우)
      if (flightInfo.return) {
        let title = "";
        let location = "";
        
        switch (plan.transportType) {
          case "flight":
            title = `✈️ ${flightInfo.return.airline} ${flightInfo.return.flightNumber} 도착`;
            location = flightInfo.return.airport;
            break;
          case "ship":
            title = `🚢 ${flightInfo.return.company || ''} ${flightInfo.return.transportNumber || ''} 도착`;
            location = flightInfo.return.location;
            break;
          case "train":
            title = `🚄 ${flightInfo.return.company || ''} ${flightInfo.return.transportNumber || ''} 도착`;
            location = flightInfo.return.location;
            break;
        }
        
        scheduleItemsToCreate.push({
          planId,
          date: plan.endDate,
          time: flightInfo.return.time || "18:00",
          title,
          location,
          memo: `${plan.transportType} 복귀 일정`,
          order: 1000  // 복귀 일정을 마지막으로 설정
        });
      }
    }
    
    // 일정 항목들을 데이터베이스에 생성
    const createdItems: ScheduleItem[] = [];
    for (const item of scheduleItemsToCreate) {
      const [created] = await db
        .insert(scheduleItems)
        .values(item)
        .returning();
      createdItems.push(created);
    }
    
    return createdItems;
  }

  // 숙소 기반 일정 자동 생성
  async createAccommodationSchedules(planId: number): Promise<ScheduleItem[]> {
    // 여행 계획 정보 가져오기
    const [plan] = await db.select().from(travelPlans).where(eq(travelPlans.id, planId));
    if (!plan) return [];

    // 첫날의 모든 일정 가져오기
    const firstDaySchedules = await db
      .select()
      .from(scheduleItems)
      .where(and(
        eq(scheduleItems.planId, planId),
        eq(scheduleItems.date, plan.startDate)
      ));

    // 첫날에 숙소 관련 일정이 있는지 확인 (제목에 '숙소'가 포함되거나 특정 주소)
    const accommodationItem = firstDaySchedules.find(item => 
      item.title.toLowerCase().includes('숙소') ||
      (item.location && item.location.includes('3331-1 Yamada, Onna, Kunigami District, Okinawa'))
    );

    // 숙소 위치 설정 (발견된 아이템이 있으면 그것을 사용, 없으면 기본값 사용)
    let accommodationLocation = '3331-1 Yamada, Onna, Kunigami District, Okinawa 904-0416 일본';
    
    if (accommodationItem) {
      console.log('Found accommodation item:', accommodationItem);
      accommodationLocation = accommodationItem.location || accommodationLocation;
    } else {
      console.log('No accommodation item found in first day schedules, using default location');
    }

    // 여행 기간의 모든 날짜 계산 (첫날 제외)
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const dates: string[] = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr !== plan.startDate) { // 첫날 제외
        dates.push(dateStr);
      }
    }

    // 각 날짜에 대해 숙소 출발 일정 추가
    const createdItems: ScheduleItem[] = [];
    for (const date of dates) {
      // 해당 날짜에 이미 06:00 숙소 일정이 있는지 확인
      const existingSchedule = await db
        .select()
        .from(scheduleItems)
        .where(and(
          eq(scheduleItems.planId, planId),
          eq(scheduleItems.date, date),
          eq(scheduleItems.time, "06:00"),
          eq(scheduleItems.title, "숙소 출발")
        ));

      if (existingSchedule.length === 0) {
        const [created] = await db
          .insert(scheduleItems)
          .values({
            planId,
            date,
            time: "06:00",
            title: "숙소 출발",
            location: accommodationLocation,
            memo: "숙소에서 출발",
            order: -1 // 하루의 시작으로 설정
          })
          .returning();
        
        createdItems.push(created);
      }
    }

    return createdItems;
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByName(name: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Location Labels methods
  async getLocationLabels(): Promise<LocationLabel[]> {
    return await db.select().from(locationLabels);
  }

  async createLocationLabel(insertLabel: InsertLocationLabel): Promise<LocationLabel> {
    const [label] = await db.insert(locationLabels).values(insertLabel).returning();
    return label;
  }

  async updateLocationLabel(id: number, updates: Partial<InsertLocationLabel>): Promise<LocationLabel | undefined> {
    const [label] = await db.update(locationLabels)
      .set(updates)
      .where(eq(locationLabels.id, id))
      .returning();
    return label || undefined;
  }

  async deleteLocationLabel(id: number): Promise<boolean> {
    const result = await db.delete(locationLabels).where(eq(locationLabels.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
