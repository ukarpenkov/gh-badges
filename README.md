# Themed activity badges

Ten cards for a GitHub profile README. Each one shows 3 months of activity (13 weeks).

Live numbers come from a Node server (`server.js`). It fetches the contribution calendar from GitHub and draws an SVG. Files in `badges/` are visual templates; they do not know which account they belong to. On LEGO and Minecraft the same weeks are shown as bars. Height is scaled to the busiest week in that window.

```bash
node server.js
```

Public URL: `https://gh-badges-nine.vercel.app`. In the examples below the login is `ukarpenkov` — replace it with yours. Locally the same path is `http://127.0.0.1:8787/fallout?user=ukarpenkov`. An optional `GITHUB_TOKEN` switches the request to the official GraphQL API.

## How to embed

Paste one of the lines below into your profile `README.md`. Each card has its own background, so it looks fine on both light and dark themes.

## Themes

### Elvish

![Elvish](badges/elvish.svg)

```html
<img src="https://gh-badges-nine.vercel.app/elvish?user=ukarpenkov" alt="3 months of activity, elvish theme" width="495" height="180">
```

### Mountain

![Mountain](badges/mountain.svg)

```html
<img src="https://gh-badges-nine.vercel.app/mountain?user=ukarpenkov" alt="3 months of activity, mountain theme" width="495" height="180">
```

### Anime

![Anime](badges/anime.svg)

```html
<img src="https://gh-badges-nine.vercel.app/anime?user=ukarpenkov" alt="3 months of activity, anime" width="495" height="180">
```

### Cats

![Cats](badges/cats.svg)

```html
<img src="https://gh-badges-nine.vercel.app/cats?user=ukarpenkov" alt="3 months of activity, cats" width="495" height="180">
```

### Automotive

![Automotive](badges/automotive.svg)

```html
<img src="https://gh-badges-nine.vercel.app/automotive?user=ukarpenkov" alt="3 months of activity, automotive theme" width="495" height="180">
```

### Circuits

![Circuits](badges/circuits.svg)

```html
<img src="https://gh-badges-nine.vercel.app/circuits?user=ukarpenkov" alt="3 months of activity, circuits" width="495" height="180">
```

### Cubism

![Cubism](badges/cubism.svg)

```html
<img src="https://gh-badges-nine.vercel.app/cubism?user=ukarpenkov" alt="3 months of activity, cubism" width="495" height="180">
```

### Fallout

![Fallout](badges/fallout.svg)

```html
<img src="https://gh-badges-nine.vercel.app/fallout?user=ukarpenkov" alt="3 months of activity, Fallout" width="495" height="180">
```

### LEGO

![LEGO](badges/lego.svg)

```html
<img src="https://gh-badges-nine.vercel.app/lego?user=ukarpenkov" alt="3 months of activity, LEGO" width="495" height="180">
```

### Minecraft

![Minecraft](badges/minecraft.svg)

```html
<img src="https://gh-badges-nine.vercel.app/minecraft?user=ukarpenkov" alt="3 months of activity, Minecraft" width="495" height="180">
```
