# HelperJS Documentation

HelperJS is an ultra-lightweight UI library. Everything is contained within the `_` object returned by `Intl.helper()`.

## Router (`_.link`)
Handles URL-based routing and commands.
- `set(page, title)`: Navigate to a page.
- `add(cmd)` / `remove(cmd)`: Manage command flags in URL.
- `get()`: Process current URL and trigger actions/commands. Supports **dynamic routing** (e.g., `user/:id` will pass `id` as an argument to the action).

## Lazy Loader (`_.lazy`)
Loads scripts on demand.
- `load(url)`: Load a script and return a Promise.
- `register(script, funcs)`: Create proxy functions that load the script when called.

## Localization (`_.lang`)
Simple but powerful translation system.
- `addr`: Path to translation JSONs.
- `replace(lang)`: Load a language pack and update elements with `data-trans` attribute.
- `from(key)`: Get a raw translation string.

## Hotkeys (`_.hotkeys`)
Keyboard combination management.
- `on(combo, press, release)`: Bind a shortcut (e.g., `ShiftLeft+KeyZ`).
- `off(combo)`: Unbind a shortcut.

## Window Engine (`_.win`)
Dynamic window management system.
- `open(name, content, attrs)`: Open a new window.
- `setTitle(winId, title)`: Change window title.
- `close(winId)` / `hide(winId)` / `show(winId)`: Control window state.

## HTTP Client (`_.http`)
XHR-based client with upload progress.
- `req(method, url, data, headers, progressElem)`: Generic request.
- `get(url)` / `post(url, data)`: Shorthand methods.

## Utilities
- `_.$(selector)`: Alias for `querySelector`.
- `_.html`template``: Converts template strings to DOM elements.
- `_.storage`: Wrapper for `localStorage`/`sessionStorage`.
- `_.err.init()`: Initializes global error catching.
