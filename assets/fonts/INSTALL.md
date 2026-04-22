# Font installation

The v5 design identity depends on two typefaces. Until the files listed below
exist in this folder, the app falls back to the platform's system fonts and
the editorial serif hero type will not render as intended.

## Required files

Drop the following files into `assets/fonts/` (this directory):

- `InstrumentSerif-Regular.ttf`
- `InstrumentSerif-Italic.ttf`
- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`
- `Inter-Bold.ttf`

Exact filenames matter — the loader in `App.tsx` matches on them.

## Where to get them

Both families are free for commercial use under the SIL Open Font License.

- **Instrument Serif** — Google Fonts: https://fonts.google.com/specimen/Instrument+Serif
  Download the whole family and copy `InstrumentSerif-Regular.ttf` and
  `InstrumentSerif-Italic.ttf` into this folder.

- **Inter** — Google Fonts: https://fonts.google.com/specimen/Inter
  Download and copy `Inter-Regular.ttf`, `Inter-Medium.ttf`,
  `Inter-SemiBold.ttf`, `Inter-Bold.ttf` into this folder.

## After installation

1. Open `App.tsx`.
2. Uncomment the `require` lines inside the `useFonts({...})` call (marked
   `// FONT LOADING`).
3. Restart Metro with a cache clear: `npx expo start -c`.

The app will now render Instrument Serif for every hero moment and Inter for
functional UI.
