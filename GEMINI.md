# Gemini Project Context: Requiety

This document provides essential context for the Requiety project, an open-source, cross-platform desktop API client similar to Insomnia or Postman.

## 1. Project Overview

-   **Core Functionality:** Requiety is a tool for developers and QAs to create, organize, and send HTTP requests, manage environments, and inspect responses.
-   **Goal:** To provide a free, fast, intuitive, and offline-first alternative to existing API clients.
-   **Platform:** Desktop application built with Electron for Windows, macOS, and Linux.

## 2. Tech Stack

-   **Framework:** Electron
-   **Frontend:** React (with TypeScript), Vite
-   **Styling:** TailwindCSS
-   **State Management:** React Contexts and Hooks
-   **HTTP Client:** Axios
-   **Database:** NeDB (local, embedded NoSQL database)
-   **Testing:**
    -   **E2E:** Playwright
    -   **Unit/Integration:** Vitest

## 3. Architecture

-   **Electron Main Process:** Handles window management, business logic, database operations, and all Node.js-level APIs (e.g., HTTP client, file system).
-   **Electron Renderer Process:** Renders the UI using React. All interactions with the backend (Main process) are done via IPC (Inter-Process Communication).
-   **Preload Script:** Acts as a secure bridge for IPC, exposing specific functions from the Main process to the Renderer process (e.g., `window.api.*`).
-   **Data Persistence:** All data (workspaces, requests, environments) is stored locally in a NeDB database file.

## 4. Key Features & Roadmap

### MVP Features (`PRD.md`)

-   **Workspaces & Folders:** Organize requests.
-   **HTTP Requests:** Full support for GET, POST, PUT, PATCH, DELETE, including custom headers and bodies (JSON, Form, etc.).
-   **Environments:** Manage variables for different contexts (dev, staging, prod) using `{{variable}}` syntax.
-   **Authentication:** Basic Auth and Bearer Token.
-   **Response History:** View past responses for a given request.
-   **Import/Export:** Basic support for sharing workspaces via JSON.

### Next Features (`PRD_NEXT.md`)

The project is planned to evolve with more advanced features:

-   **In-Request Testing:** Add assertions (e.g., status code, JSONPath) to requests.
-   **Test Runner:** Execute entire folders/collections of requests sequentially.
-   **Pre/Post-request Scripts:** Use JavaScript to manipulate data before or after a request is sent.
-   **Expanded Protocol Support:**
    -   GraphQL (with introspection)
    -   WebSocket
    -   gRPC
-   **Advanced Auth:** Full OAuth 2.0 support.
-   **Collaboration:** Git Sync and optional Cloud Sync.
-   **Mock Server:** Simple built-in mocking capabilities.

## 5. Testing Strategy

The project follows a standard testing pyramid:

-   **Unit Tests (Vitest):** For utilities, services, and pure functions.
-   **Integration Tests (Vitest + Testing Library):** For components with hooks, IPC handlers, and database interactions.
-   **E2E Tests (Playwright):** For critical user flows, ensuring the entire application works as expected from a user's perspective. The list of E2E tests is derived from the PRD documents.
