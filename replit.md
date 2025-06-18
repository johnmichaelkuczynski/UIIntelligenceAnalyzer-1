# Cognitive Analysis Platform

## Overview

This is a sophisticated cognitive analysis platform built with React, Node.js, and PostgreSQL. The application specializes in analyzing written text to assess the intelligence level and cognitive fingerprint of authors through multi-model AI evaluation. The platform offers document analysis, AI detection, text rewriting, translation services, and comprehensive cognitive profiling capabilities.

## System Architecture

The application follows a monorepo structure with clear separation between client and server components:

- **Frontend**: React with TypeScript, TailwindCSS, and shadcn/ui components
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend bundling, esbuild for server compilation
- **Deployment**: Replit-optimized with autoscale deployment target

## Key Components

### Frontend Architecture
- **React SPA** with wouter for routing
- **Component Library**: shadcn/ui with Radix UI primitives
- **State Management**: React Query for server state, local state with hooks
- **Styling**: TailwindCSS with custom design system
- **Charts**: Chart.js for data visualization

### Backend Architecture
- **Express.js** API server with TypeScript
- **Multi-LLM Integration**: OpenAI (GPT-4), Anthropic (Claude), Perplexity AI
- **Document Processing**: PDF, DOCX, image OCR via Mathpix
- **Speech-to-Text**: AssemblyAI integration
- **Email Services**: SendGrid for notifications

### Database Schema
- **Users**: Email-based user system (no authentication)
- **Documents**: Stores analyzed content with metadata
- **Analyses**: Intelligence evaluation results
- **Cognitive Profiles**: User behavior and writing pattern analysis
- **Rewrite History**: Document modification tracking

### Core Services
- **Intelligence Evaluation**: Multi-model cognitive assessment system
- **Document Comparison**: Side-by-side analysis capabilities  
- **Text Rewriting**: AI-powered content enhancement
- **Translation**: Multi-language document translation
- **OCR**: Mathematical notation extraction from images

## Data Flow

1. **Document Input**: Users upload files or paste text
2. **Content Extraction**: Text extracted from various file formats
3. **Multi-Model Analysis**: Parallel evaluation across AI providers
4. **Cognitive Profiling**: Intelligence scoring and pattern recognition
5. **Results Aggregation**: Comprehensive analysis report generation
6. **Optional Enhancement**: Rewriting, translation, or research integration

## External Dependencies

### AI Service Providers
- **OpenAI API**: GPT-4 for primary analysis
- **Anthropic API**: Claude for secondary evaluation
- **Perplexity API**: Research and fact-checking
- **DeepSeek API**: Alternative model support

### Supporting Services
- **Mathpix OCR**: Mathematical notation extraction
- **AssemblyAI**: Speech-to-text transcription
- **SendGrid**: Email delivery
- **Google Custom Search**: Web research capabilities

### Database & Infrastructure
- **Neon/PostgreSQL**: Primary data storage
- **Drizzle ORM**: Type-safe database operations
- **Replit**: Hosting and development environment

## Deployment Strategy

The application is configured for Replit's autoscale deployment with:
- **Development**: `npm run dev` (port 5000)
- **Production Build**: Vite frontend build + esbuild server compilation
- **Environment**: Node.js 20 with PostgreSQL 16
- **Auto-scaling**: Configured for traffic-based scaling

Build process:
1. Frontend assets compiled to `dist/public`
2. Server compiled to `dist/index.js`
3. Static assets served from Express in production

## Changelog

- June 18, 2025. Initial setup
- June 18, 2025. DeepSeek LLM Integration Complete:
  - Added DeepSeek API as fourth AI provider option
  - Updated all LLM selection interfaces to include DeepSeek
  - Integrated DeepSeek into document analysis, chat dialog, and rewrite modals
  - Backend routes configured for DeepSeek API calls
  - API status monitoring includes DeepSeek availability
- June 18, 2025. Semantic Density Analysis System:
  - Implemented comprehensive text segmentation and density computation
  - Created interactive visualizations with line and bar charts
  - Added PDF export functionality for analysis results
  - Integrated into main document workflow
- June 18, 2025. Intelligence Assessment Calibration Fix:
  - Fixed broken intelligence scoring with proper anchor points
  - Set computational theory of mind text as 98-100 anchor
  - Set superficial academic mimicry as 40/100 low-end anchor
  - Removed markup formatting from AI responses
  - Calibrated system to properly score sophisticated academic content

## User Preferences

Preferred communication style: Simple, everyday language.