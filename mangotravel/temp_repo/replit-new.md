# MangoTravel Assistant

## Overview

MangoTravel is a family-focused travel planning application built with React, Express, and TypeScript. The app allows families to create, manage, and track travel plans with features including flight information, daily schedules, essential item checklists, and place recommendations with Google Maps integration.

**AI Model**: Replit Assistant (cost-optimized)
**Target User**: Korean families planning Okinawa travel

## User Preferences

- Communication style: Simple, everyday Korean language
- Interface: Korean language
- Target destination: Okinawa, Japan
- Family-focused features preferred

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query)
- **UI Framework**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with Korean-friendly design
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Express sessions with PostgreSQL store

### Key Features Completed
- ✅ Travel plan CRUD operations
- ✅ Daily schedule management with time slots
- ✅ Google Maps integration (routes, places, navigation)
- ✅ Weather information display
- ✅ Essential items checklist with image attachments
- ✅ Participant management (age field removed)
- ✅ Flight information management
- ✅ Saved places with categories
- ✅ Place name display (instead of long addresses)
- ✅ Form auto-population for editing

### Database Schema
- **Travel Plans**: Core entity with transport info, participants, status
- **Schedule Items**: Time-based daily activities
- **Saved Places**: User-saved locations with categories and links
- **Essential Items**: Checklist with image attachments

## Recent Changes (January 2025)

### Form Enhancement & UI Improvements
- Removed age field from participant information for simplified data entry
- Enhanced plan edit form with comprehensive data pre-population
- Added form reset functionality for reliable data loading
- Fixed React rendering errors with participant display

### Location Display Optimization
- Implemented intelligent place name extraction from addresses
- Display readable names like "숙소 (온나빌리지)" instead of "3331-1 Yamada..."
- Added hover tooltips showing full addresses
- Integrated with saved places database for consistent naming

### Technical Improvements
- Enhanced error handling for form data parsing
- Improved data type handling for participant objects vs strings
- Optimized Google Maps API integration with legacy markers
- Added automatic accommodation schedule generation

## Development Guidelines
- Use Korean language for all user-facing text
- Prioritize family-friendly features
- Focus on Okinawa travel planning use cases
- Maintain simple, intuitive interface design
- Cost-optimized development with Assistant model

## External API Integration
- Google Maps API: Places, Directions, Geocoding
- OpenWeather API: Weather information for destinations
- Database: Neon PostgreSQL for persistent storage