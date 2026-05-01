# HelperJS History

HelperJS is a fork of [newHelper.js](https://github.com/MIOBOMB/newHelper-js), an ultra-lightweight library for building administrative panels and UI components.

## Fork Details
- **Original Project**: [newHelper.js](https://github.com/MIOBOMB/newHelper-js)
- **Original Author**: MIOBOMB

---

## Versions

### 2.1.8 (Current)
- **Transition to HelperJS**: Completed renaming and project rebranding.
- **English Translation**: All source code comments and documentation fully translated to English.
- **Code Refactoring**:
    - `tables.render()` refactored to use modern `map()` and `join()` methods for better performance and readability.
    - `pipe` and `pipeAsync` simplified using the `reduce()` pattern.
    - Minor logic improvements and cleanup throughout the core.
- **Project Structure**: Consolidated documentation and removed legacy project mentions.

### 2.1.5 (Original)
- The last state of the original **newHelper.js** project before forking.
- This version featured the core "modular monolith" architecture, including:
    - Advanced window engine.
    - Custom hotkeys system.
    - Router and lazy loading modules.
    - Lightweight i18n and XHR-based HTTP client.
- Original project by [MIOBOMB](https://github.com/MIOBOMB).