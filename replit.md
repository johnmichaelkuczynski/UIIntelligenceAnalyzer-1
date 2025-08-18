# Cognitive Analysis Platform

## Overview
This platform analyzes written text to assess the intelligence and cognitive fingerprint of authors using multi-model AI evaluation. It offers document analysis, AI detection, text rewriting, translation, and comprehensive cognitive profiling. The project aims to provide deep insights into cognitive abilities and thought processes from written content.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is structured as a monorepo, separating client and server components.
- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui, wouter for routing, React Query for server state, and Chart.js for data visualization.
- **Backend**: Express.js with TypeScript, integrating multiple LLMs (OpenAI, Anthropic, Perplexity AI, DeepSeek), document processing via Mathpix OCR, and speech-to-text with AssemblyAI. Email services are handled by SendGrid.
- **Database**: PostgreSQL with Drizzle ORM, storing user, document, analysis, cognitive profile, and rewrite history data.
- **Core Services**: Includes multi-model intelligence evaluation, document comparison, AI-powered text rewriting, multi-language translation, and OCR for mathematical notation.
- **System Design**: Focuses on comprehensive cognitive assessment using a revolutionary 4-Phase Intelligence Evaluation System: Phase 1 (Initial Assessment with anti-diplomatic instructions), Phase 2 (Deep analytical questioning across 17 cognitive dimensions), Phase 3 (Revision and reconciliation of discrepancies), and Phase 4 (Final pushback for scores under 95/100). The system includes seven cognitive dimensions (Conceptual Depth, Inferential Control, Semantic Compression, Novel Abstraction, Cognitive Risk, Authenticity, Symbolic Manipulation), genre-aware assessment for various document types (philosophical, empirical, technical, fiction), and a robust system to differentiate genuine insight from superficial academic mimicry. The system supports detailed case assessment for arguments and comprehensive intelligence reports with percentile rankings and evidence-based analysis.
- **UI/UX**: Utilizes shadcn/ui for components, TailwindCSS for styling, and provides detailed card-based layouts for analysis reports, supporting PDF and text downloads.

## External Dependencies
- **AI Service Providers**: OpenAI API (GPT-4), Anthropic API (Claude), Perplexity AI, DeepSeek API.
- **Supporting Services**: Mathpix OCR, AssemblyAI, SendGrid, Google Custom Search.
- **Database & Infrastructure**: Neon/PostgreSQL, Drizzle ORM, Replit (hosting and development environment).

## Recent Progress Updates
- **August 18, 2025**: MAJOR ARCHITECTURAL OVERHAUL - Implemented Strict 3-Phase Intelligence Protocol
  - **CRITICAL REQUIREMENT**: ALL intelligence evaluations must follow the exact 3-phase methodology specified by user
  - **Phase 1**: Send LLM specific questions (18 intelligence questions) with exact wording, qualifications, and scoring interpretation
  - **Phase 2**: Push back if scores < 95/100 with specific challenge format ("YOUR POSITION IS THAT X/100 OUTPERFORM THE AUTHOR..."), ask questions de novo
  - **Phase 3**: Accept and report what the LLM says (no further modification)
  - **Implementation**: Created new `strictIntelligenceProtocol.ts` service replacing all previous evaluation systems
  - **Coverage**: Both single document analysis (/api/analyze) and dual document comparison (/api/intelligence-compare) now use strict protocol
  - **Fixed Issues**: Resolved plugin errors in two-document mode by updating ComparativeResults component to handle different data structures
  - **System Status**: OPERATIONAL - Strict protocol enforced for all intelligence evaluations
  - **User Satisfaction**: System now follows the exact evaluation methodology as specified and required
  - **Architecture Impact**: Complete replacement of previous 4-phase system with user-specified 3-phase protocol, ensuring compliance with exact evaluation standards