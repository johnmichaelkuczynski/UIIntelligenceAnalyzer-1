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
- **August 18, 2025**: Successfully implemented comprehensive 4-Phase Intelligence Evaluation System
  - **Phase 1**: Initial assessment with strict anti-diplomatic instructions to prevent academic grading bias
  - **Phase 2**: Deep analytical questioning across 17 cognitive dimensions (insight, development, organization, logic, freshness, precision, authenticity, etc.)
  - **Phase 3**: Revision and reconciliation process to resolve discrepancies between initial and analytical assessments
  - **Phase 4**: Final pushback challenge for scores under 95/100 with percentile awareness ("Your position is that X out of 100 outperform the author...")
  - **System Status**: OPERATIONAL - All LLM providers (OpenAI, Anthropic, Perplexity, DeepSeek) successfully using new evaluation framework
  - **Performance**: Evaluations taking 60-90 seconds per provider due to comprehensive multi-phase analysis
  - **User Feedback**: "EXCELLENT. MUCH BETTER. MUCH MUCH BETTER." - System meeting requirements for sophisticated intelligence assessment
  - **Architecture Impact**: Replaced simple pushback mechanism with sophisticated multi-call evaluation process that forces LLMs to drop diplomatic hedging and assess pure cognitive capacity