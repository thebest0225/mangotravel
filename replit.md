# MangoTravel

## Overview

MangoTravel is a family-focused travel planning application built with React, Express, and TypeScript. The app allows families to create, manage, and track travel plans with features including flight information, daily schedules, essential item checklists, and place recommendations with Google Maps integration for travel time calculations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon serverless PostgreSQL
- **Validation**: Zod schemas shared between client and server
- **Session Management**: Express sessions with PostgreSQL store

### Project Structure
- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared TypeScript types and schemas
- `migrations/` - Database migration files

## Key Components

### Database Schema
The application uses three main entities:
- **Travel Plans**: Core planning entity with title, dates, participants, status, flight info, and essential items
- **Schedule Items**: Daily schedule entries linked to travel plans with time, location, duration details
- **Saved Places**: User-saved locations with categories, ratings, and descriptions

### API Structure
RESTful API with the following main endpoints:
- `/api/travel-plans` - CRUD operations for travel plans
- `/api/travel-plans/:id/schedule` - Schedule management for specific plans
- `/api/saved-places` - Place management and search functionality

### Storage Layer
- **Interface**: `IStorage` interface defining all data operations
- **Implementation**: `DatabaseStorage` class using PostgreSQL with Drizzle ORM
- **Database**: PostgreSQL with Neon serverless provider for persistent data storage

### UI Components
- **Layout Components**: Header with navigation, bottom navigation with floating action button
- **Travel Components**: Plan cards, flight info display, daily schedule management, essentials checklist
- **Form Components**: Comprehensive form handling for plan creation and editing

## Data Flow

1. **User Interaction**: User interacts with React components
2. **State Management**: TanStack Query manages API calls and caching
3. **API Communication**: HTTP requests to Express server endpoints
4. **Validation**: Zod schemas validate data on both client and server
5. **Storage**: Data persisted through storage interface (memory or database)
6. **Response**: Data flows back through the same path with automatic UI updates

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Router via Wouter)
- Express.js for server framework
- TypeScript for type safety across the stack

### Database and ORM
- Drizzle ORM for database operations
- Drizzle Kit for migrations and schema management
- @neondatabase/serverless for PostgreSQL connectivity

### UI and Styling
- Radix UI primitives for accessible components
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography

### Development Tools
- Vite for fast development and building
- ESBuild for server-side bundling
- TSX for TypeScript execution in development

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: TSX for direct TypeScript execution
- **Database**: In-memory storage for quick development iteration

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: PostgreSQL with connection via DATABASE_URL environment variable

### Environment Configuration
- Development mode uses Vite middleware for frontend serving
- Production mode serves static files from Express
- Database connection automatically switches based on environment
- Replit-specific optimizations for cloud deployment

The application is designed to be easily deployable on Replit with automatic environment detection and configuration.

## Recent Changes (July 15, 2025)

### Transportation Selection Feature
- Added `transportType` field to travel plans schema (car, flight, ship, train)
- Implemented conditional form fields in new plan creation based on transport type
- Added transport-specific information sections:
  - Flight: departure/arrival airports, times, airlines, flight numbers
  - Ship: departure/arrival ports, ship company, ship name
  - Train: departure/arrival stations, train company, train number
- Updated plan detail view to hide flight information when "car" is selected
- Reduced font sizes for flight info and essentials sections for better visual hierarchy
- Reorganized plan detail layout with schedule management as primary focus

### Automatic Transport Schedule Integration
- Created new `transportInfoSchema` for unified transport information handling
- Implemented `createTransportScheduleItems` method in storage layer to automatically add transport schedules
- Added automatic schedule creation for departure and return transport when creating new travel plans
- Added API endpoint `/api/travel-plans/:id/transport-schedule` for adding transport schedules to existing plans
- Transport schedules automatically include:
  - Departure schedule on start date with appropriate icon (✈️ flight, 🚢 ship, 🚄 train)
  - Return schedule on end date (when return information is available)
  - Proper location and timing information based on transport type
- Successfully applied to existing "오키나와 가족여행" plan with 진에어 flight schedules

### Enhanced Essential Items with Image Attachments (July 15, 2025)
- Enhanced essential items schema to support image attachments with `attachedImages` array field
- Implemented file upload and camera capture functionality for essential items
- Added image preview and management interface with delete capability
- Created separate dialog for viewing and managing attached files per essential item
- Enhanced essential items checklist component with attachment buttons showing count

### Automatic Travel Time Calculation (July 15, 2025)
- Removed manual duration and travel_time fields from schedule items schema
- Implemented Google Maps Directions API integration for automatic travel time calculation
- Added travel time display between consecutive schedule items showing duration and distance
- Created weather information display using OpenWeather API integration
- Added weather data (temperature, description) display next to location information in schedules
- Enhanced daily schedule component to show real-time travel times and weather conditions

### Saved Places Management Enhancement (July 15, 2025)
- Added inline editing capability for saved place names with keyboard shortcuts (Enter/Escape)
- Simplified categorization system from detailed subcategories to region/province level grouping
- Implemented region-based grouping: 오키나와 as separate category, other Japanese regions as "일본", Korean regions by province
- Added "지도로 보기" tab with interactive Google Maps displaying all saved places with markers
- Enhanced map view with place list overlay, individual place markers with name labels, and navigation controls
- Added direct Google Maps integration buttons for directions and opening in Maps app
- Temporarily hidden import functionality while preserving code for future use
- Updated API with PATCH endpoint for place name updates and database storage layer

### Daily Schedule Route Visualization (July 15, 2025)
- Added "오늘 일정별 동선보기" button to daily schedule component
- Implemented automatic route planning for daily itineraries with multiple locations
- Integrated Google Maps Directions API to show optimal routes between schedule locations
- Added waypoint support for multi-stop itineraries (origin → waypoints → destination)
- Automatic filtering of schedules with valid locations (minimum 2 required)
- Route visualization opens in new Google Maps window with turn-by-turn directions
- Enhanced travel planning workflow with visual route confirmation

### Related Links Management for Places (July 16, 2025)
- Added `links` JSONB field to saved_places database table for flexible link storage
- Implemented link schema with id, title, url, and optional description fields
- Created simplified link management UI with URL-only input for easy addition
- Added icon-only link display (no titles) with click-to-open functionality
- Implemented link addition, deletion, and viewing with confirmation dialogs
- Links display as compact external link icons next to each saved place
- Enhanced place management with website URLs, booking links, and review links storage

### Database Schema Migration and Google Maps Legacy Marker Configuration (July 18, 2025)
- Fixed database schema migration issue where participants column needed conversion from text to jsonb
- Successfully migrated existing travel plan data during column type conversion
- Applied database push with proper schema synchronization
- Updated all Google Maps API integrations to use legacy markers instead of AdvancedMarkerElement
- Added use_legacy_marker=true parameter to Google Maps API loading
- Implemented console warning suppression for deprecation messages
- Ensured backward compatibility with existing marker functionality in place-search and daily-schedule components

### Enhanced Plan Edit Form and Removed Manual Accommodation Scheduling (July 18, 2025)
- Removed manual "숙소일정생성" button as accommodation schedules now automatically generate when adding new itinerary items
- Enhanced plan edit form to include comprehensive editing capabilities for all travel plan data:
  - Travel plan details (title, dates, transport type)
  - Participant management with add/remove functionality
  - Flight information (airports, times, airline, flight numbers) - shown only for flight transport type
  - Essential items management with add/remove functionality
- Implemented pre-populated form data loading for easy modification of existing travel plans
- Updated form validation and data handling to support all travel plan components
- Improved user experience by consolidating all plan editing features into single comprehensive dialog