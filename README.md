# Themed activity badges

Ten cards for a GitHub profile README. Each one shows the current calendar month, from the 1st through today. It resets on the 1st: October starts as a single day.

Live numbers come from a Node server (`server.js`). It fetches the contribution calendar from GitHub and draws an SVG. Files in `badges/` are visual templates; they do not know which account they belong to. The corner reads like `349 contributions` plus the month (`sept`, `oct`). Each day is a peak labeled with that day's count. Height is scaled to the busiest day in the month.

```bash
node server.js
```

Public URL: `https://gh-badges-nine.vercel.app`. In the examples below the login is `username` — replace it with yours. Locally the same path is `http://127.0.0.1:8787/fallout?user=username`. An optional `GITHUB_TOKEN` switches the request to the official GraphQL API.

## How to embed

Paste one of the lines below into your profile `README.md`. Each card has its own background, so it looks fine on both light and dark themes.

## Themes

### Elvish

![Elvish](badges/elvish.svg)

```html
<img src="https://gh-badges-nine.vercel.app/elvish?user=username" alt="activity this month, elvish theme" width="495" height="180">
```

### Mountain

![Mountain](badges/mountain.svg)

```html
<img src="https://gh-badges-nine.vercel.app/mountain?user=username" alt="activity this month, mountain theme" width="495" height="180">
```

### Anime

![Anime](badges/anime.svg)

```html
<img src="https://gh-badges-nine.vercel.app/anime?user=username" alt="activity this month, anime" width="495" height="180">
```

### Cats

![Cats](badges/cats.svg)

```html
<img src="https://gh-badges-nine.vercel.app/cats?user=username" alt="activity this month, cats" width="495" height="180">
```

### Automotive

![Automotive](badges/automotive.svg)

```html
<img src="https://gh-badges-nine.vercel.app/automotive?user=username" alt="activity this month, automotive theme" width="495" height="180">
```

### Circuits

![Circuits](badges/circuits.svg)

```html
<img src="https://gh-badges-nine.vercel.app/circuits?user=username" alt="activity this month, circuits" width="495" height="180">
```

### Cubism

![Cubism](badges/cubism.svg)

```html
<img src="https://gh-badges-nine.vercel.app/cubism?user=username" alt="activity this month, cubism" width="495" height="180">
```

### Fallout

![Fallout](badges/fallout.svg)

```html
<img src="https://gh-badges-nine.vercel.app/fallout?user=username" alt="activity this month, Fallout" width="495" height="180">
```

### LEGO

![LEGO](badges/lego.svg)

```html
<img src="https://gh-badges-nine.vercel.app/lego?user=username" alt="activity this month, LEGO" width="495" height="180">
```

### Minecraft

![Minecraft](badges/minecraft.svg)

```html
<img src="https://gh-badges-nine.vercel.app/minecraft?user=username" alt="activity this month, Minecraft" width="495" height="180">
```
