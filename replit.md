# Cognitive Analysis Platform

## Overview
This platform analyzes written text to assess the intelligence and cognitive fingerprint of authors using multi-model AI. It offers document analysis, AI detection, text rewriting, translation, and comprehensive cognitive profiling. The project aims to provide deep insights into textual content and author cognition, serving a market need for advanced analytical tools.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is structured as a monorepo with distinct client and server components.

**Frontend:**
-   **Technology:** React with TypeScript, Vite for bundling.
-   **UI/UX:** TailwindCSS for styling, shadcn/ui and Radix UI for components, Chart.js for data visualization.
-   **State Management:** React Query for server state, React hooks for local state.
-   **Routing:** wouter.

**Backend:**
-   **Technology:** Express.js with TypeScript, esbuild for compilation.
-   **Core Functionality:** Integrates multiple LLMs (OpenAI, Anthropic, Perplexity AI, DeepSeek), handles document processing (PDF, DOCX, image OCR), and speech-to-text.
-   **Services:** Provides intelligence evaluation, document comparison, text rewriting, translation, and OCR for mathematical notation.
-   **Data Flow:** Documents are uploaded, content is extracted, analyzed in parallel across AI providers, leading to cognitive profiling and comprehensive reports. Optional enhancements include rewriting and translation.

**Database:**
-   **Technology:** PostgreSQL with Drizzle ORM.
-   **Schema:** Stores user information (email-based), analyzed documents, analysis results, cognitive profiles, and rewrite history.

**System Design Choices:**
-   **Monorepo Structure:** Ensures clear separation and management of client and server.
-   **Multi-Model AI Integration:** Leverages diverse AI capabilities for robust analysis.
-   **Cognitive Focus:** System is designed to assess cognitive markers (e.g., Semantic Compression, Inferential Continuity, Semantic Topology, Cognitive Asymmetry, Epistemic Resistance, Metacognitive Awareness) rather than surface-level prose quality. It also includes specific genre-aware assessments (e.g., philosophical arguments, fiction).
-   **Iframe Embedding Support:** Configured for cross-origin embedding, enabling integration into external platforms like Wix.

## External Dependencies
-   **AI Service Providers:**
    -   OpenAI API (GPT-4)
    -   Anthropic API (Claude)
    -   Perplexity API
    -   DeepSeek API
-   **Supporting Services:**
    -   Mathpix OCR (mathematical notation extraction)
    -   AssemblyAI (speech-to-text)
    -   SendGrid (email delivery)
    -   Google Custom Search (web research)
-   **Database & Infrastructure:**
    -   Neon/PostgreSQL
    -   Drizzle ORM
    -   Replit (hosting and development environment)