# HelperJS

Hey! Welcome to **HelperJS**. This is a super lightweight library I'm working on to help build admin panels and cool web interfaces without all the heavy stuff like React or complex builders.

It's basically a "modular monolith" - everything you need is in one place, but you only use what you want. The whole thing is tiny (only about 13KB minified!), so it's perfect if you want your site to load fast.

## Why I made this?
I wanted something simple. No npm install (unless you want to), no webpack, no complicated stuff. Just a simple script that gives you windows, routing, hotkeys, and translations out of the box.

## Cool stuff included:
- **Windows Engine**: Real windows you can drag, resize, and minimize!
- **Hotkeys**: Easy shortcuts for your web app.
- **Router**: Simple page navigation using the URL.
- **Lazy Loading**: Load only the code you need, when you need it.
- **i18n**: Translate your app on the fly.
- **HTTP Client**: A simple way to talk to your backend with upload progress.

## How to use it?
Just include `helper.js` in your HTML:

```html
<script src="helper.js"></script>
<script>
  // Initialize the helper
  const _ = Intl.helper();
  
  // Open a window just to see it work!
  _.win.open('Hello', '<h1>Welcome to my app!</h1>');
</script>
```

## Documentation
- [Full API Docs](docs.md)
- [Project History](history.md)

## License
This project is licensed under the **BSD 2-Clause License**. It means you can use it for whatever you want, just keep my name in the license file!

## Credits

Special thanks to the people who made this project possible:

Huge thanks to the original creator for the amazing foundation! ❤️

<div align="left">
  <br />
  <table>
    <tr>
      <!-- Card MIOBOMB -->
      <td width="260" align="left">
        <img src="https://github.com/MIOBOMB.png" width="70" align="left" style="margin-right: 15px; border: 1px solid #ddd; border-radius: 10px;" />
        <a href="https://github.com/MIOBOMB"><b>MIOBOMB</b></a>
        <br /><br />
        <sub>Original Creator</sub>
      </td>
      <td width="20"></td>
      <!-- Card Prosto_Kust -->
      <td width="260" align="left">
        <img src="https://github.com/prostokust.png" width="70" align="left" style="margin-right: 15px; border: 1px solid #ddd; border-radius: 10px;" />
        <a href="https://github.com/prostokust"><b>Prosto_Kust</b></a>
        <br /><br />
        <sub>Lead Developer</sub>
      </td>
    </tr>
  </table>
  <br />
</div>

---
*Note: This is a fork of the original newHelper.js project, updated and polished for better use.*