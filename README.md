# Requiety

Requiety is a modern, open-source API client for testing REST APIs, built with Electron, React, and TypeScript. It is designed to be a lightweight and highly performant alternative for developers who need a reliable tool for API development and testing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## Features

-   **Intuitive Interface**: A clean and modern UI built with TailwindCSS for a seamless user experience.
-   **Request Management**: Easily create, organize, and save HTTP requests.
-   **Collections & Folders**: Organize your requests into hierarchical collections and folders.
-   **Environment Variables**: Manage variables across different environments (Development, Staging, Production) to streamline testing.
-   **Authentication Support**: Built-in support for various authentication methods (Basic Auth, Bearer Token, etc.).
-   **Request History**: Keep track of your past requests and easily re-run them.
-   **Offline Support**: Uses a local NeDB database to ensure your data is always accessible.
-   **Templating**: Support for dynamic values in requests using Nunjucks.

## Tech Stack

-   **Core**: [Electron](https://www.electronjs.org/)
-   **UI Framework**: [React](https://reactjs.org/)
-   **Styling**: [TailwindCSS](https://tailwindcss.com/)
-   **Bundler**: [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database**: [NeDB](https://github.com/louischatriot/nedb)
-   **Testing**: [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/)

## Getting Started

### Prerequisites

Ensure you have Node.js installed on your system.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/tiomoreno/requiety.git
    cd requiety
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Application

To start the application in development mode:

```bash
npm start
```

This will launch the Electron app window with hot-reloading enabled.

### Building for Production

To create a distributable package for your OS:

```bash
npm run make
```

This command uses Electron Forge to generate the executable files.

## Development

-   **Linting**: `npm run lint` - Runs ESLint to check for code quality issues.
-   **Unit Tests**: `npm run test` - Runs unit tests using Vitest.
-   **E2E Tests**: `npm run test:e2e` - Runs end-to-end tests using Playwright.

## Project Structure

-   `src/main`: Electron main process code (database, IPC handlers).
-   `src/preload`: Preload scripts for secure communication between main and renderer.
-   `src/renderer`: React application (components, hooks, contexts).
-   `src/shared`: Shared types and utilities.
-   `src/renderer/components`: UI Components.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Tio Moreno**
-   Email: hugoleodev@gmail.com
