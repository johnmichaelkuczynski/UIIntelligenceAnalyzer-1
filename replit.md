# Cognitive Analysis Platform

## Overview
This platform analyzes written text to assess the intelligence and cognitive fingerprint of authors using multi-model AI evaluation. It offers document analysis, AI detection, text rewriting, translation, and comprehensive cognitive profiling. The project aims to provide deep insights into cognitive abilities and thought processes from written content.

## User Preferences
Preferred communication style: Simple, everyday language.
Default LLM Provider: DeepSeek (set as default for intelligence evaluation).

## System Architecture
The application is structured as a monorepo, separating client and server components.
- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui, wouter for routing, React Query for server state, and Chart.js for data visualization.
- **Backend**: Express.js with TypeScript, integrating multiple LLMs (OpenAI, Anthropic, Perplexity AI, DeepSeek), document processing via Mathpix OCR, and speech-to-text with AssemblyAI. Email services are handled by SendGrid.
- **Database**: PostgreSQL with Drizzle ORM, storing user, document, analysis, cognitive profile, and rewrite history data.
- **Core Services**: Includes multi-model intelligence evaluation, document comparison, AI-powered text rewriting, multi-language translation, and OCR for mathematical notation.
- **System Design**: Focuses on authentic intelligence assessment using a 4-Phase Intelligence Evaluation System: Phase 1 (Initial Assessment with anti-diplomatic instructions), Phase 2 (Deep analytical questioning using real cognitive evaluation criteria), Phase 3 (Revision and reconciliation of discrepancies), and Phase 4 (Final pushback for scores under 95/100). The system has been completely cleaned of fabricated cognitive dimensions (semantic compression, epistemic resistance, cognitive risk, inferential control) and now uses only legitimate intelligence evaluation methods including Abstract Reasoning, Logical Structure, Conceptual Precision, Analytical Depth, Intellectual Originality, and Complexity Handling. DeepSeek is the default provider for intelligence evaluation. **MAJOR BREAKTHROUGH (Jan 18, 2025)**: All rewrite interfaces (SelectiveChunkRewriter, SimpleRewriteModal, ChunkRewriteModal, ImmediateRewriteDialog) now use the 4-phase evaluation protocol with default Conditions A & B when no instructions are provided, eliminating system failures and achieving dramatic improvement in functionality. **TOKEN LIMIT FIX (Jan 19, 2025)**: Implemented intelligent chunked processing for large documents (>3000 chars) in 4-phase evaluation system, splitting texts into 2000-character segments with 10-second delays between processing, then amalgamating results into comprehensive reports - solving truncated report issues and enabling complete intelligence analysis of large documents.
- **UI/UX**: Utilizes shadcn/ui for components, TailwindCSS for styling, and provides detailed card-based layouts for analysis reports, supporting PDF and text downloads.

## External Dependencies
- **AI Service Providers**: OpenAI API (GPT-4), Anthropic API (Claude), Perplexity AI, DeepSeek API.
- **Supporting Services**: Mathpix OCR, AssemblyAI, SendGrid, Google Custom Search.
- **Database & Infrastructure**: Neon/PostgreSQL, Drizzle ORM, Replit (hosting and development environment).