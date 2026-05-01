/*
 * You are looking at helper.js version 2.1.8. It is built on a factory
 * that starts with Intl.helper=function(){...};
 * The reason for using Intl.helper is quite simple:
 * Instead of polluting the global scope with a semi-flexible variable,
 * we avoid polluting the global scope entirely.
 * And yes, to initialize the helper you actually need to write:
 * yourVariable = Intl.helper()
 * 
 * Comment styles:
 * FIXME - strange behavior that should ideally be refactored
 * ??? - requires clarification
 * !!! - pay attention
 * See also - read to understand how it works
 * 
 * ???: consider switching to ES6 exports instead of injecting into Intl
 * 
 * New modules, preparing for release in 2.2
 * Their API might be slightly unstable:
 * tables - under refactoring
 * form
 * drag (ported from windows)
 * pipe/pipeAsync
 * In 2.2 plugins will appear, some core modules will be extracted into plugins:
 * win (in 2.2)
 * tables (might not be part of core, but useful in admin panels)
 * http (in 2.3)
 *
 * Modules with names reserved for 2.3++
 * do not use their namespaces for plugins:
 * toast
 * filezone
 * ikarus
 *
 * Plugins, a new pattern I want to legitimize in 2.2
 * This is not _.use(), not _.plugins, not prototype mutation.
 * Just a simple assignment: _.myPlugin = pluginFabric();
 * (where _ is already an initialized core factory)
 * How is it supposed to work? The same as Intl.helper()
 * A plugin factory returns an object, method, class, or whatever you need.
 * To connect a plugin, you just give it a namespace inside the core
 * And call the factory, that's it!
 */

Intl.helper = function () {
	let _ = {
		link: {
			/*
			 * LINKS MODULE
			 * 
			 * Works on the principle [page, commands...]
			 * Example: ?home&debug&lang=en
			 *          ^^^^ ^^^^^^^^^^^^^
			 *          page commands
			 * 
			 * During the development of the 2.0 core in Object hub, I realized
			 * that commands can be very useful for debugging.
			 * But in theory, all modal and other actions can be bound to them.
			 * 
			 * !!!: get() handles all routing, including nested pages
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/History_API
			 */
			basePage: () => { },
			defTitle: '',
			actions: {},
			commands: {},

			_i: true, // _i - blocks pushState in set()
			_pop() {
				/*
				 * Popstate engine
				 *
				 * Designed to preserve commands in history.
				 * This is a unique feature of helper.js.
				 *
				 * popstate triggers when:
				 * - user navigates back/forward in history
				 * - we call history.pushState (not replaceState)
				 * 
				 * _i distinguishes these cases:
				 * true = user navigated back
				 * false = page writes its address to the link
				 */
				// ???: some browsers might trigger popstate on replaceState as well
				if (!this._i) {
					// commands are transferred during popstate here
					// read _.link.get() if you want to know why
					let newUrl = '?' + [this.compile()[0], ...this._cmd].join('&');
					this._i = true;
					history.replaceState(null, null, newUrl);
					this.get();
				} else
					this._i = false;
			},
			_cmd: [],
			_popInit: false,
			_init() {
				if (!this._popInit) {
					window.addEventListener('popstate', () => this._pop());
					this._popInit = true;
				}
			},

			compile: () => location.search.replace('?', '').split('&'),
			set(page, title = this.defTitle) {
				if (title) document.title = title;
				if (!this._i) {
					let link = this.compile();
					link[0] = page;
					history.pushState(null, null, '?' + link.join('&'));
				}
				this._i = false;
			},
			add(cmd) {
				let link = this.compile();
				if (!link.includes(cmd)) {
					link.push(cmd);
					this._cmd.push(cmd);
					history.replaceState(null, null, '?' + link.join('&'));
				}
			},
			remove(cmd) {
				let link = this.compile();
				if (link.includes(cmd)) {
					let c = this._cmd;
					link.splice(link.indexOf(cmd), 1);
					c.splice(c.indexOf(cmd), 1);
					history.replaceState(null, null, '?' + link.join('&'));
				}
			},
			get() {
				this._init();
				/*
				 * Pages throw an error to invoke the base page.
				 * Commands, meanwhile, do not do this,
				 * because a broken command is not as fatal as a broken page.
				 * 
				 * On popstate, commands are taken from _cmd storage instead of the link itself.
				 * This is done to transfer commands during history jumps.
				 */
				let links = this.compile(),
					[firstKey, fisrtValue] = links[0].split('='),
					cmds = links.slice(1);
				try {
					let dirs = firstKey.split('/'),
						dir = this.actions,
						main = dir[firstKey];
					if (!firstKey.includes('/')) {
						main(fisrtValue);
					} else {
						for (let p of dirs) {
							let kDir = dir[p + '/'];
							if (kDir)
								dir = kDir;
							else {
								dir[p](fisrtValue);
								break;
							}
						}
					}
				} catch (e) {
					this.basePage();
					throw e;
				}
				this._cmd = cmds;
				cmds.forEach(cmdPre => {
					let [key, value] = cmdPre.split('=');
					let cmd = this.commands[key];
					if (cmd)
						cmd(value);
					else
						console.error(new Error(`command '${cmd}' doesn't exist!`))
				});
			},
		},
		lazy: {
			/*
			 * LAZY MODULE
			 * 
			 * Creates proxy functions in the global scope
			 * that trigger the loading of an external module script.
			 * Implemented via the global scope as it's much easier to create laziness.
			 * 
			 * !!!: Wrapper functions in register() must be attached to window,
			 *      Otherwise lazy._ will fall into a recursion of errors.
			 * 
			 * ???: Would it be easier to create laziness in legacy projects via ES6 imports?
			 *
			 * See also: 
			 * - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Window/window
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function (for lazy())
			 */
			loaded: {},
			load(url, ...args) {
				/*
				 * ...args are passed into Promise.resolve(args).
				 * This allows calling _.lazy.load('script.js', 'data', 'for', 'callback')
				 * and later receiving these arguments in .then((a,b,c)=>...).
				 * 
				 * Triple state of a script in lazy.loaded:
				 * - true: already loaded => resolve immediately
				 * - Promise: currently loading => wait for the same promise
				 * - undefined: not loaded yet => create a new promise
				 * 
				 * This protects against double loading of the same script.
				 */
				let key = url.split('?')[0], // trim parameters to avoid duplication
					state = this.loaded;
				if (state[key] === true)
					return Promise.resolve(args);
				if (state[key] instanceof Promise)
					return state[key].then(() => args);

				let promise = new Promise((resolve, reject) => {
					let scr = document.createElement('script');
					scr.src = url;
					scr.onload = () => {
						state[key] = true;
						resolve(args);
					};
					scr.onerror = () => {
						delete state[key];
						reject(new Error('Failed to load ' + url));
					};
					document.head.append(scr);
				});
				state[key] = promise;
				return promise;
			},
			register(script, funcs) {
				if (!Array.isArray(funcs))
					return new Error('Array required for register');

				for (let fn of funcs) {
					let fns = fn.split('.'),
						method = fns.pop(),
						path = window;
					for (let obj of fns) {
						if (path[obj] == undefined)
							path[obj] = {};
						path = path[obj];
					}
					path[method] = (...a) =>
						this.lazy(script, fn).then(f => f(...a));
				}
			},
			async lazy(scr, fn) {
				let get = path => path.split('.').reduce((obj, key) => obj?.[key], window),
					wrapper = get(fn);

				await this.load(scr); // await is shorter than Promise.then

				if (wrapper !== get(fn))
					return get(fn);
				throw new Error(`Function ${fn} not loaded from ${scr}`);
			},
		},
		lang: {
			/*
			 * TRANSLATION MODULE (l10n)
			 * 
			 * Rumor has it this module is better than many i18n implementations, and better than all l10n.
			 * That's because out of the box it can translate a page without reloading.
			 * 
			 * !!!: parse() processes keys from vars and substitutes their values.
			 *      Your +key+ becomes a value, and this value is dynamic.
			 *      It's more convenient to display dynamic data on websites this way.
			 *      For example, a user's nickname.
			 *
			 * !!!: This is l10n (localization), not i18n (internationalization).
			 *
			 *      i18n — code preparation: extracting strings to JSON, Unicode support,
			 *      flexible layouts. Done once.
			 * 
			 *      l10n - JSON translation and adaptation for a language/region.
			 * 
			 *      lang - loads JSON, substitutes +variables+,
			 *      provides reactive language switching on the page.
			 *
			 *      To bring lang closer to i18n, use Intl,
			 *      the native internationalization API (dates, numbers, currencies).
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
			 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset (data-trans attributes)
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
			 * - https://localizejs.com/articles/i18n-vs-l10n
			 */
			addr: '',
			vars: {},
			// FIXME: refactor main to a Map since it's internal API?
			//        or keep the original object API
			main: {},

			load: name => _.http.req('GET', _.lang.addr + name + '.json'),
			parse: (packet, vars = _.lang.vars) =>
				// ???: adapt for a generic syntax like {var}
				packet.replace(/\+([^+]+)\+/g, (match, key) => {
					let v = vars[key];
					return v !== undefined ? v : match;
				}),
			async replace(name) {
				const packet = await this.load(name);
				this.main = JSON.parse(this.parse(packet)); // translation cannot start without replacing the language

				for (let el of document.querySelectorAll('[data-trans]')) {
					let key = el.dataset.trans,
						text = this.main[key] || key,
						tag = el.tagName;

					if (tag === 'IMG')
						el.src = text;
					else if (['INPUT', 'TEXTAREA'].includes(tag))
						el[el.type === 'submit' ? 'value' : 'placeholder'] = text;
					else
						el.innerHTML = text;
				}
				// return for further packet processing, e.g., saving in _.storage
				return packet;
			},

			/*
			 * String getters from the package automatically generate HTML.
			 * This simplifies working with code significantly.
			 * Instead of specifying data-trans and lang.from separately,
			 * you can write `<h1${_.lang.text('yourKey')}/h1>`.
			 * Otherwise, you would write `<h1 data-trans="yourKey">${_.lang.from('yourKey')}</h1>`.
			 * It's shorter and more convenient, right?
			 * Don't repeat my mistakes and accept this as winning the lottery.
			 * 
			 * !!!: if the key is missing from the package, a warning will be thrown.
			 */
			attr: i => ` data-trans="${i}"`,
			from: i => _.lang.main[i] || console.warn(`_.lang> ${i} is undefined`) || i,

			text: i => _.lang.attr(i) + `>${_.lang.from(i)}<`,
			submit: i => _.lang.attr(i) + `value="${_.lang.from(i)}">`, // <input type=submit>
			input: i => _.lang.attr(i) + `placeholder="${_.lang.from(i)}">`,
			textarea: i => _.lang.attr(i) + `placeholder="${_.lang.from(i)}"><`,
			img: i => _.lang.attr(i) + `src="${_.lang.from(i)}"`,
			winTitle(i) {
				let text = this.from(i),
					dataTrans = this.attr(i);
				if (text == null || text == '') {
					text = i;
					dataTrans = '';
				}
				return `${dataTrans}>${text}<`;
			},
		},
		http: {
			/*
			 * HTTP CLIENT
			 * 
			 * A simple wrapper around XHR for fast requests.
			 * Using XHR instead of fetch
			 * because I need upload progress (fetch doesn't provide it).
			 * And you probably wouldn't mind having upload progress either.
			 * 
			 * In defaultHeaders you can set default headers.
			 * For example, Authorization: 'your token'
			 * ???: add ability to ignore default headers
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
			 * - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
			 */
			defaultHeaders: {},
			req(method, url, data = '', headers = {}, fileProgressElement = false) {
				return new Promise((resolve, reject) => {
					let xhr = new XMLHttpRequest();

					xhr.open(method, url);

					let allHeaders = { ...this.defaultHeaders, ...headers };
					for (let header in allHeaders)
						xhr.setRequestHeader(header, allHeaders[header]);

					// !!!: fileProgressElement expects a <progress> element without min/max
					// Because value goes from 0 to 1
					if (fileProgressElement)
						xhr.upload.onprogress = e => {
							if (e.lengthComputable) {
								let percentage = (e.loaded / e.total);
								fileProgressElement.setAttribute('value', percentage);
							}
						};

					xhr.onreadystatechange = () => {
						if (xhr.readyState === 4)
							if (xhr.status >= 200 && xhr.status < 300)
								resolve(xhr.response);
							else
								reject(new Error(`${xhr.status} - ${xhr.statusText}`), xhr);
					};
					xhr.onerror = () =>
						reject(new Error('Network error'), xhr);

					xhr.send(data);
				});
			},
			get: (url, headers = {}) =>
				_.http.req('GET', url, false, headers),
			post: (url, data = '', headers = {}, fileProgressElement = false) =>
				_.http.req('POST', url, data, headers, fileProgressElement)
		},
		html(strs, ...args) {
			/*
			 * Template strings into DOM
			 * 
			 * Allows writing _.html`<div>${content}</div>`
			 * and receiving an actual DOM element instead of a string.
			 * 
			 * Why via template?
			 * - Scripts are not executed (no XSS!)
			 * - You can create multiple elements at once
			 * - Faster than createElement for complex structures
			 * - Simply more convenient than createElement for complex trees
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker
			 */
			let fullStr = '',
				DOMs = [];
			for (let i = 0; i < args.length; i++) {
				fullStr += strs[i];
				let arg = args[i];
				if (arg && arg.nodeType) {
					fullStr += `<!--${DOMs.length}-->`;
					DOMs.push(arg);
				} else {
					fullStr += arg;
				}
			}
			fullStr += strs[strs.length - 1];

			const template = document.createElement('template');
			template.innerHTML = fullStr;
			const content = template.content;

			// to support nested HTML elements, we replace the placeholders <!--${DOMs.length}-->
			const it = document.createTreeWalker(
				content,
				NodeFilter.SHOW_COMMENT
			);
			let node, i = 0;
			for (; node = it.nextNode();)
				node.replaceWith(DOMs[i++]);

			if (content.children.length === 1)
				return content.firstChild;
			return content;
		},
		pipe: (data, ...fns) => fns.reduce((v, fn) => fn(v), data),
		pipeAsync: async (data, ...fns) => fns.reduce(async (v, fn) => fn(await v), await data),
		form: {
			/*
			 * AUTOSAVING FORMS
			 * 
			 * Allows saving form state in case
			 * the office suddenly loses power.
			 * 
			 * ???: maybe create a more comprehensive form module
			 *      with built-in validation or something else.
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement
			 * - https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
			 */
			read(form) {
				let data = {};
				new FormData(form).forEach((value, key) => {
					if (data[key] !== undefined) {
						if (!Array.isArray(data[key]))
							data[key] = [data[key]];
						else
							data[key].push(value);
					} else
						data[key] = value;
				});
				return data;
			},
			write(form, data) {
				Object.entries(data).forEach(([key, value]) => {
					let el = form.elements[key];
					if (!el)
						return;
					if (el.length)
						[...el].forEach((opt, i) => {
							let isCheckBox = 'selected';
							if (['checkbox', 'radio'].includes(opt.type))
								isCheckBox = 'checked';

							let select = false;
							if (Array.isArray(value)) {
								if (value.includes(opt.value))
									select = true;
							} else if (opt.value == value)
								select = true;

							opt[isCheckBox] = select;
						});
					else
						el.value = value;
				});
				return data;
			},
		},
		tables(elem, name, columns, raw, rowKey = 'ID') {
			/*
			 * AUTOTABLES MODULE
			 * 
			 * Allows quickly generating tables with special properties.
			 * 
			 * !!!: in columns, the mutate parameter acts as a value parser
			 * !!!: sort the data manually by mutating it, javascript can do that
			 *      or even sort it on the server side
			 * 
			 * ???: consider refactoring the API since the current implementation
			 *      is still not flexible enough
			 */
			if (!Array.isArray(raw))
				raw = Object.values(raw);
			let state = {
				name: name,
				columns: columns,
				raw: raw,
				rowKey: rowKey,
				data: raw,
				elem: elem,

				render() {
					this.elem.innerHTML = `<table><thead><tr>${this.columns.map(c => `<th>${c.title || c.key}</th>`).join('')
						}</tr></thead><tbody>${this.data.map(row => `<tr data-id="${row[this.rowKey]}">${this.columns.map(c => `<td>${(c.mutate ? c.mutate(row) : row[c.key]) ?? ''}</td>`).join('')
							}</tr>`).join('')
						}</tbody></table>`;
				}
			};
			return state;
		},
		storage: class {
			// See also:
			// - https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
			// - https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
			// - https://developer.mozilla.org/en-US/docs/Web/API/Storage
			constructor(storage, name) {
				this._ = storage;
				this.n = name;
			}
			get = key => this._.getItem(this.n + key);
			set = (key, value) => this._.setItem(this.n + key, value);
			remove = key => this._.removeItem(this.n + key);
			clear = () => Object.keys(this._)
				.filter(k => k.startsWith(this.n))
				.forEach(k => this._.removeItem(k));
		},
		err: {
			//See also:
			// - https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
			// - https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
			// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
			init() {
				window.addEventListener('error', _.err.handleGlobal);
				window.addEventListener('unhandledrejection', _.err.handleRejection);
			},
			print: (cnt, e) => console.error(e),

			errors: {},
			_c: 0,
			log(err) {
				_.err.print(_.err._c, err);
				_.err._c++;
				_.err.errors[_.err._c] = err;
			},
			handleGlobal(message, source, line, column, error) {
				console.error(message, source + ':' + line + ':' + column, error)
				_.err.log(message + `\n IN ${source} ON LINE ${line} IN COLUMN ${column}`);
			},
			handleRejection(e) {
				const err = e.reason || e;
				console.error(err);
				_.err.log(
					`PROMISE ERROR\n` +
					`${e.stack || e}`
				);
			},
		},
		hotkeys: {
			/*
			 * HOTKEYS
			 * 
			 * Implements a real press/release interface.
			 * According to the minifier, it weighs only 790 bytes after compression.
			 * 
			 * Object Hub already has a text editor for hotkeys
			 * based on this engine. Of course, providing a textarea with js code...
			 * Not the safest idea, but the customization is extremely broad.
			 * 
			 * _holds operates not on arrays but on new Set().
			 * Sets are much faster with large amounts of data.
			 * You don't want a thread with 100+ hotkeys to lag
			 * just because of typing, do you?
			 *
			 * FIXME: Consider alternatives to e.code due to issues
			 *        with OTG keyboards on mobile phones.
			 *
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
			 * - https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/keyup_event
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
			 */
			keys: new Map(),
			_holds: new Set(),
			_: false,

			_parse: combo => combo.split('+').map(k => k.trim()),
			_match(keys) {
				// Need to verify all keys, it's a COMBINATION, not separate pieces
				for (let k of keys) if (!this._holds.has(k)) return false;
				return true;
			},
			_init() {
				if (this._)
					return;
				document.addEventListener('keydown', e => {
					this._holds.add(e.code);// key depends on layout (on Qwerty 'KeyZ' is 'z', on JCUKEN is 'я')
					// code provides the physical key position, which is important for games and hotkeys, and is more universal

					for (let hotkey of this.keys.values()) {
						if (!this._match(hotkey.keys))
							continue;
						if (hotkey.press && !hotkey.active) {
							hotkey.active = true; // active protects against multiple triggers
							hotkey.press(e);
						}
					}
				});
				document.addEventListener('keyup', e => {
					this._holds.delete(e.code);

					for (let hotkey of this.keys.values()) {
						if (hotkey.active && !this._match(hotkey.keys)) {
							hotkey.active = false;
							hotkey.release(e);
						}
					}
				});
				window.addEventListener('blur', e => {
					/*
					 * When switching to another window, there is no automatic keyup.
					 * Therefore, we forcefully reset everything, just in case.
					 */
					for (let hotkey of this.keys.values()) {
						if (hotkey.active) {
							hotkey.active = false;
							hotkey.release();
						}
					}
					this._holds.clear();
				});
				this._ = true;
			},
			on(combo, press, release) {
				this._init();
				let keys = this._parse(combo);

				this.keys.set(combo, {
					keys,
					// press/release are empty functions by default to reduce syntax
					press: press || (() => { }),
					release: release || (() => { }),
					active: false
				});

				return this;
			},
			off(combo) {
				this.keys.delete(combo);
				return this;
			},
		},
		drag: {
			// See also:
			// - https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX
			// - https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientY
			// - https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
			// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
			// - https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
			// - https://developer.mozilla.org/en-US/docs/Web/API/Element/touchmove_event (why we need preventDefault)
			_i: false,
			active: new Map(),

			prevent: e => e.target.closest('button,input'),
			init(dragger, mover, onStart, onStop) {
				let start = e => {
					// Checking where they clicked. If we didn't check,
					// the dragger wouldn't let us click buttons or rename the window.
					if (this.prevent(e)) return;

					e.preventDefault();

					this.active.set(e.pointerId, {
						x: e.clientX,
						y: e.clientY,
						mover: mover,
						onStop: onStop
					});

					onStart?.(e);
				};
				if (!this._i) {
					document.addEventListener("pointermove", (e) => this.move(e));
					document.addEventListener("pointerup", (e) => this.stop(e));
					document.addEventListener("pointercancel", (e) => this.stop(e));
					this._i = true;
				}
				dragger.onpointerdown = start;
				// prevent touchmove event to avoid issues
				// while scrolling on mobile devices
				dragger.ontouchmove = e => e.preventDefault();
			},
			move(e) {
				let p = this.active.get(e.pointerId);
				if (!p) return;
				e.preventDefault();

				let dx = p.x - e.clientX,
					dy = p.y - e.clientY;

				p.x = e.clientX;
				p.y = e.clientY;

				let mov = p.mover;
				mov.style.top = (mov.offsetTop - dy) + "px";
				mov.style.left = (mov.offsetLeft - dx) + "px";
			},
			stop(e) {
				this.active.get(e.pointerId)?.onStop?.(e);
				this.active.delete(e.pointerId);
			},
		},
		win: {
			/* 
			 * WINDOWS MODULE
			 * If you ask why helper, I will answer:
			 * winBox.js is 35 kilobytes, here you get it in 25 kilobytes.
			 * And a more extensive window engine and documentation at the level of...
			 * Does anyone even have such detailed documentation on the web?
			 * 
			 * Implements a restricted-flexible window engine, features:
			 * - opening, maximizing to full screen, closing
			 * - minimizing to taskbar and restoring
			 * - native css-resize (resize:both)
			 * - ability to move windows (works on phones, I checked)
			 * - saving and loading windows of your choice
			 * 
			 * Now I need to remember if I refactored this code 4 times or 7 times.
			 *
			 * !!!: _opn() and toggleFull() can break your windows!
			 *      These functions calculate window coordinates and size taking padding into account.
			 *      Never apply transform:translate() to your windows!
			 * 
			 * !!!: _opn() opens the window in the center of the screen by default
			 *      If it's not restoring via write()
			 *
			 * ???: is it worth opening the window in the center, or better to provide a "default" positioning function
			 *
			 * FIXME: decouple lang.winTitle from translations to reduce code coupling
			 * 
			 * See also:
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
			 * - https://developer.mozilla.org/en-US/docs/Web/CSS/position
			 * - https://developer.mozilla.org/en-US/docs/Web/CSS/resize
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
			 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
			 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
			 * - html module
			 * - lang.winTitle function
			 * - drag module
			 */
			manager: false,
			hider: false,
			text: '',

			winAttrs: '',
			dragAttrs: '',
			titleAttrs: '',
			renameAttrs: '',
			btnAttrs: '',
			hiderAttrs: '',

			defBtns: [
				['–', w => w.hide()],
				['=', w => w.toggleFull()],
				['X', w => w.close()],
			],

			animOpen: '',
			animClose: '',
			animHide: '',
			animShow: '',
			animFullOn: '',
			animFullOff: '',

			_animate(elem, anim, actAfter = () => { }, actPre = () => { }) {
				if (anim) {
					elem.classList.add(anim);
					actPre();
					elem.addEventListener('animationend', () => {
						elem.classList.remove(anim);
						actAfter();
					}, { once: true });
				} else {
					actPre();
					actAfter();
				}
			},
			_ID() {
				let id;
				// Generating a random 6-character ID so it doesn't match every time
				// !!!: in theory, any ID can be set
				// ???: test at how many windows the generator starts lagging
				do id = Math.random().toString(36).substring(2, 8);
				while (_.wins.has(id));
				return id;
			},
			_winBtn(win, text, func) {
				let b = _.html`<button ${this.btnAttrs}>${text}</button>`;
				b.addEventListener('click', () => func(win));
				return b;
			},
			_hiderBtn(win) {
				let title = win.langs !== false ? _.lang.winTitle(_.win.text + win.langs) : `>${win.name}<`,
					b = _.html`<button id=hider${win.id} ${this.hiderAttrs}${title}/button>`;
				b.addEventListener('click', () => this.show(win));
				return b;
			},
			_initWin: winState =>
				_.drag.init(winState.drag, winState.elem, () => _.win.manager.appendChild(winState.elem)),
			open(name, content = '', customAttrs = '') {
				let winId = this._ID(),
					winState = {
						id: winId,
						name: name,
						langs: name,
						state: 'opened',
						full: false,
						inRename: false,
						// If the window is new, the coordinates are completely zero.
						// We need to check if a window is being created and set coordinates if so.
						onUnfull: { top: 0, left: 0, width: 0, height: 0 },
						attrs: customAttrs,
						elem: false,
						drag: false,
						content: false,
					};
				return this._opn(winState, content);
			},
			_opn(winState, content = '') {
				if (!this.manager || !this.hider) throw new Error('Window managers not inited');

				let wId = winState.id,
					html =
						_.html`<div id=${wId} ${this.winAttrs} ${winState.attrs}>
    				<div style="display:flex;justify-content:space-between;align-items:center"
    				${this.dragAttrs} id=DRAGGER${wId}>
    					<span ${this.titleAttrs} id=title${wId}${_.lang.winTitle(_.win.text + winState.name)}/span>
    					<div id=btns${wId}></div>
    				</div>
    				<div id=content${wId} style=overflow:auto;width:100%;height:100%>
    					${content.replace(/\{winId\}/g, wId)}
    				</div>
    			</div>`,
					btns = html.querySelector(`#btns${wId}`);
				for (let b of this.defBtns) btns.append(this._winBtn(winState, ...b));
				html.style.overflow = 'hidden';
				html.style.resize = 'both';

				this._animate(html, this.animOpen)

				winState.setTitle = nT => _.win.setTitle(winState, nT);
				winState.toggleFull = e => _.win.toggleFull(winState);
				winState.close = e => _.win.close(winState);
				winState.hide = e => _.win.hide(winState);
				winState.show = e => _.win.show(winState);
				this.manager.append(html);

				let win = winState.elem = document.getElementById(wId),
					contentRect = document.getElementById('content' + wId).getBoundingClientRect(),
					windowRect = win.getBoundingClientRect(),
					padX = windowRect.width - contentRect.width, padY = windowRect.height - contentRect.height;
				winState.drag = document.getElementById('DRAGGER' + wId);
				winState.content = document.getElementById('content' + wId);

				if (winState.onUnfull.width === 0) {
					// Coordinates are set here...
					// Clean code masters, please don't mess with my head
					// It works!!!
					if (!winState.attrs.includes('top')) {
						win.style.top = win.offsetTop - (win.offsetHeight / 2) + 'px';
						win.style.left = win.offsetLeft - (win.offsetWidth / 2) + 'px';
					}
					if (!winState.attrs.includes('width')) win.style.height = (win.offsetHeight - padX) + 'px';
					if (!winState.attrs.includes('height')) win.style.width = (win.offsetWidth - padY) + 'px';
				} else
					for (let pos in winState.onUnfull)
						win.style[pos] = winState.onUnfull[pos] + 'px'

				this._initWin(winState);
				winState.drag.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					if (e.target.closest('button')) return;
					let wT = document.getElementById('title' + wId);
					if (!winState.inRename) {
						wT.innerHTML = `<input ${this.renameAttrs} id=rename${wId} value="${wT.textContent}">`;
						winState.inRename = true;
					} else {
						this.setTitle(winState, document.getElementById('rename' + wId).value);
						winState.inRename = false;
					}
				});

				if (winState.state === 'hidened') winState.hide();

				_.wins.set(winState.id, winState);
				return winState;
			},
			setTitle(winState, newT) {
				winState.langs = false;
				winState.name = newT;
				let t = document.getElementById('title' + winState.id),
					h = document.getElementById('hider' + winState.id);
				t.innerHTML = newT;
				t.removeAttribute('data-trans');
				if (h) {
					h.innerHTML = newT;
					h.removeAttribute('data-trans');
				}
			},
			toggleFull(winState) {
				let wEl = winState.elem,
					ws = wEl.style,
					wc = wEl.classList,
					contentRect = document.getElementById('content' + winState.id).getBoundingClientRect(),
					windowRect = wEl.getBoundingClientRect(),
					padX = windowRect.width - contentRect.width,
					padY = windowRect.height - contentRect.height,
					aOn = this.animFullOn,
					aOff = this.animFullOff,
					fd = {
						top: windowRect.top, left: windowRect.left,
						width: contentRect.width, height: contentRect.height,
					},
					unful = () => {
						ws.top = old.top + 'px';
						ws.left = old.left + 'px';
						ws.width = old.width + 'px';
						ws.height = old.height + 'px';
					},
					doFul = () => {
						if (aOn) wc.remove(aOn);
						winState.full = true;
						winState.onUnfull = fd;
						ws.top = 0;
						ws.left = 0;
						ws.width = `calc(100% - ${padX}px)`;
						ws.height = `calc(100% - ${padY}px)`;
						winState.drag.onpointerdown = null;
					},
					doUnful = () => {
						if (aOff) wc.remove(aOff);
						unful();
						winState.full = false;
						this._initWin(winState);
					},
					old = winState.onUnfull;
				if (!winState.full)
					this._animate(wEl, this.animFullOn, doFul)
				else
					this._animate(wEl, this.animFullOff, doUnful, unful)
			},
			close(winState) {
				let w = winState.elem,
					remover = () => {
						let dr = winState.drag, D = document;
						dr.onpointerdown = dr.ontouchmove = null;
						// Removing event handlers attached to the document
						// If not removed, a memory leak will happen sooner or later
						// I don't know how I lived in the 2.0 era when the engine first appeared
						['move', 'up', 'cancel'].map(e => D['onpointer' + e] = null);
						w.remove();
						_.wins.delete(winState.id);
					};
				if (w.style.display == 'none') {
					document.getElementById('hider' + winState.id).remove();
					remover();
				} else
					this._animate(w, this.animClose, remover);

			},
			hide(winState) {
				let wEl = winState.elem,
					wc = wEl.classList,
					anim = this.animHide,
					hider = () => {
						wEl.style.display = 'none';
						if (anim) wc.remove(anim);
						winState.state = 'hidened';
						this.hider.append(this._hiderBtn(winState));
					}
				this._animate(wEl, this.animHide, hider);
			},
			show(winState) {
				let wEl = winState.elem,
					wc = wEl.classList,
					anim = this.animShow,
					hider = document.getElementById('hider' + winState.id),
					shower = () => {
						if (anim) wc.remove(anim);
						winState.state = 'opened';
					}
				wEl.style.display = '';
				hider.remove();
				this._animate(wEl, this.animShow, shower);
			},
			/*
			 * Oh yes, below is the coolest feature I'm preparing for 2.2
			 * 
			 * SAVING/RESTORING WINDOWS
			 * Remember auto-forms? I did better here.
			 * You can fully save windows. How? You decide.
			 * Instead of a callback, I now just use a one-time reader, it's much more flexible.
			 * Plus, I provide a one-time restorer that returns all windows.
			 * That is also much more flexible, maybe you had websockets in your windows that need to be restored.
			 * It's easier to record the result and then run a check on data-ws attributes.
			 * Or whatever else you come up with.
			 * 
			 * !!!: It works so flexibly that in theory you could create virtual desktops.
			 */
			read() {
				let store = {};
				for (let [winId, winPre] of _.wins) {
					let win = { ...winPre },
						size = win.onUnfull,
						wEl = win.elem,
						contentRect = win.content.getBoundingClientRect(),
						windowRect = wEl.getBoundingClientRect();
					win.realContent = win.content.innerHTML;
					size.top = windowRect.top;
					size.left = windowRect.left;
					size.height = wEl.offsetHeight - (windowRect.height - contentRect.height);
					size.width = wEl.offsetWidth - (windowRect.width - contentRect.width);
					delete win.elem;
					delete win.drag;
					delete win.content;
					store[winId] = win;
				}
				return store;
			},
			write(state) {
				for (let winId in state) {
					let win = state[winId],
						content = win.realContent;
					delete win.realContent;
					_.wins.set(winId, win);
					this._opn(win, content);
				}
				return _.wins;
			},
		},
		wins: new Map(),
	};

	return _
};