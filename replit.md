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
  - Fixed broken intelligence scoring with seven-point calibration system
  - Ultra-high anchor (100): "The Will to Project" - maximum theoretical construction
  - High-end anchor (98-100): Computational theory of mind - conceptual sophistication
  - High competence anchor (80): Sleeping Beauty Problem - logical rigor within established boundaries
  - Mid-high anchor (75): Ancient philosophy dreams - scholarly competence without depth
  - Mid-range anchor (70): Dispositions philosophy - competent but unoriginal
  - Low-end anchor (40): Superficial academic mimicry - empty signposting
  - Mid-low anchor (30): Pseudo-intellectual mimicry - conceptual incoherence masked by jargon
  - Removed markup formatting from AI responses
  - System now properly distinguishes between genuine insight and academic mimicry
- June 18, 2025. Cognitive Assessment Logic Overhaul:
  - Refocused system to assess mind rather than prose quality
  - Rewards conceptual force over verbal polish
  - Ignores writing quality except as evidence of cognition
  - Punishes inauthentic simulation rather than authentic failure
  - High scores for messy text with deep inference/novel abstraction
  - Moderate scores for fluent but cognitively shallow academic mimicry
  - System now properly identifies authentic intellectual struggle vs midwit simulation
- June 18, 2025. Backend Intelligence Analysis Fixes:
  - Added response parsing to extract intelligence scores from AI model outputs
  - Fixed undefined score issues in PDF reports
  - Enhanced semantic density PDF exports with comprehensive statistics and interpretation
  - Structured data now properly flows from backend to frontend
  - Intelligence reports now display actual scores instead of undefined values
- June 18, 2025. Enhanced Dimension Analysis System:
  - Added seven comprehensive cognitive dimensions: Conceptual Depth, Inferential Control, Semantic Compression, Novel Abstraction, Cognitive Risk, Authenticity, Symbolic Manipulation
  - Fixed PDF dimension score display - now shows actual numeric ratings instead of dashes
  - Updated data structure mapping between backend response parser and frontend PDF generator
  - Enhanced score extraction with multiple patterns to handle varied AI response formats
  - Dimensions now properly reflect cognitive assessment focus rather than prose quality
  - PDF exports include detailed breakdown of each cognitive dimension with scores and descriptions
  - System rewards genuine intellectual risk-taking over polished academic simulation
- June 18, 2025. Comprehensive Intelligence Report Structure Implementation:
  - Implemented percentile ranking interpretation: scores represent how many people the author outperforms in cognitive ability
  - Added psychiatric-style intelligence report format with six cognitive dimensions (0-10 scale each)
  - Enhanced response parsing to extract structured report components: Summary Diagnosis, Cognitive Breakdown, Comparative Placement, Final Assessment
  - Updated AI prompts to generate comprehensive intelligence profiles rather than simple scores
  - System now provides detailed cognitive profiles with narrative assessments of intelligence flavor and psychological tone
  - Reports include comparative placement relative to undergraduate, graduate, journal authors, and canonical thinkers
- June 18, 2025. Critical Calibration Fix for Doctoral-Level Theoretical Work:
  - Fixed catastrophic under-scoring of high-level epistemological and theoretical texts
  - Added explicit 96-98/100 calibration anchor for systematic framework construction
  - Implemented mandatory calibration check for doctoral-level theoretical sophistication
  - Enhanced dimension scoring for high-scoring texts to properly reflect cognitive capacity
  - System now correctly identifies that only 2-4 people out of 100 can produce doctoral-level theoretical work
  - Fixed Kuczynski epistemological text calibration from incorrect 85/100 to proper 96-98/100 range
- June 22, 2025. Complete Evaluation Engine Restructure Around Actual Intelligence Markers:
  - Rebuilt evaluation system to focus on cognitive markers instead of surface-level heuristics
  - Implemented six core intelligence dimensions: Semantic Compression, Inferential Continuity, Semantic Topology, Cognitive Asymmetry, Epistemic Resistance, Metacognitive Awareness
  - Added tiered evaluation system (rapid, standard, comprehensive) with manual override capabilities
  - Created cognitive evaluation API endpoint (/api/cognitive-evaluate) with real variance scoring
  - Replaced generic 80-90% clustering with actual cognitive diversity measurements
  - Enhanced all LLM analysis pipelines to include cognitive marker assessment as primary score
  - System now measures information density, conceptual connectivity, and epistemic friction rather than vocabulary complexity or paragraph count
- June 22, 2025. Complete Statistical Proxy Elimination and Evidence-Based Report System:
  - Permanently removed all broken statistical proxy calculations (concept/word ratios, coherence metrics, token entropy)
  - Created clean response parser that extracts only from LLM narrative assessments
  - Updated comprehensive LLM prompt to generate 2000+ word evidence-based reports with extensive quotations
  - Redesigned frontend with professional card-based layout for detailed cognitive dimension analysis
  - Each dimension assessment now includes direct quotes and detailed justifications
  - Added comprehensive sections: Executive Summary, Comparative Intelligence Placement, Final Verdict
  - System now displays properly formatted intelligence reports with quotation highlighting and structured analysis
  - Eliminated all "NaN" scores and meaningless statistical calculations throughout the platform

## User Preferences

Preferred communication style: Simple, everyday language.