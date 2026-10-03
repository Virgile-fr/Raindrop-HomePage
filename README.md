# Raindrop Homepage

A start page for the links you actually use. It brings your Raindrop favorites into a grid, puts the ones you open most near the top, and lets you search without reaching for the mouse.

[Open the homepage](https://virgile-fr.github.io/Raindrop-HomePage/)

I started this because I wanted a nicer way to browse my bookmarks. It has grown into a small workspace with search shortcuts, custom backgrounds and cards you can make your own.

You can use website icons, cover images or initials. Card colors come from the icons, with a choice of providers and a cache so they do not need to be worked out again on every visit. There is also a minimum-resolution setting to skip small icons.

Start typing to find a favorite. When nothing matches, choose a search engine. You can also type a letter and a space: `g` for Google, `y` for YouTube, `i` for Google Images, `b` for Brave, `h` for Hugging Face, `x` for X or `s` for Spotify. Engines can be added, edited, reordered or disabled, and there are buttons for mobile.

The appearance settings cover the cards, icons, text, shadows and 3D movement. Reflective materials and patterns have a live preview, with separate hover and resting adjustments. Hold Shift to fine-tune a slider. The page background can be a color, gradient or your own image, with optional scroll parallax. Changes stay in the preview until you save.

## Getting started

Open the homepage and choose **token**. The window explains how to create a personal Test token in [Raindrop integrations](https://app.raindrop.io/settings/integrations) and where to paste it. Keep that token private.

Then set the page as your browser homepage. Replacing the new-tab page may require an extension, depending on your browser.

Settings, cached favorites and imported wallpapers are kept in your browser. The **reset cache** button refreshes the icons and favorites without removing your settings. Icon services and remote wallpaper hosts receive image requests; more details are in [SECURITY.md](SECURITY.md).

## Where this is going

The plan is to turn this into an independent bookmark manager, while keeping Raindrop as an optional connection. It still needs Raindrop today. Saving and organizing bookmarks directly in the app is the next direction, not something this version already does.

## Run it yourself

It is plain HTML, CSS and JavaScript, with no build step. Clone the repository and run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The same files can be hosted on GitHub Pages or another static host. If you change the hosting path, update the base URL in `404.html` too.

The reflective card effects were inspired by [Simon Goellner's Pokémon card demo](https://poke-holo.simey.me/). This project is not affiliated with Raindrop.io.
