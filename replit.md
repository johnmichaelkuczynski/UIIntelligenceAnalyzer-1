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
- **System Design**: Focuses on comprehensive cognitive assessment, including seven cognitive dimensions (Conceptual Depth, Inferential Control, Semantic Compression, Novel Abstraction, Cognitive Risk, Authenticity, Symbolic Manipulation). It includes genre-aware assessment for various document types (philosophical, empirical, technical, fiction) and a robust system to differentiate genuine insight from superficial academic mimicry. The system also supports detailed case assessment for arguments and comprehensive intelligence reports with percentile rankings and evidence-based analysis.
- **UI/UX**: Utilizes shadcn/ui for components, TailwindCSS for styling, and provides detailed card-based layouts for analysis reports, supporting PDF and text downloads.

## External Dependencies
- **AI Service Providers**: OpenAI API (GPT-4), Anthropic API (Claude), Perplexity AI, DeepSeek API.
- **Supporting Services**: Mathpix OCR, AssemblyAI, SendGrid, Google Custom Search.
- **Database & Infrastructure**: Neon/PostgreSQL, Drizzle ORM, Replit (hosting and development environment).