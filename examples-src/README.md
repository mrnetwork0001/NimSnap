# Showcase source photos

Drop photos here named after the preset they should demonstrate:

```
executive.jpg    a phone selfie
cyberpunk.jpg    any everyday portrait
ecommerce.jpg    a product on a messy surface
anime.jpg        a portrait or a pet
```

Then run:

```bash
node scripts/generate-examples.mjs
```

Each photo is run through the real preset and the real model, and the resulting
before/after pair is written to `public/examples/`. The showcase on the home
screen renders whichever pairs are present.

**Use photos you have the right to publish** — these ship in the repository and
are shown to everyone who opens the app. Get consent for any recognisable face.
