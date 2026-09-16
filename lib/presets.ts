/**
 * Style presets. Each preset is a complete instruction set for the image model:
 * a positive prompt, a negative prompt, and a strength that controls how far the
 * result may drift from the uploaded photo.
 *
 * Strength is tuned per preset on purpose. Headshots must stay recognisably the
 * same person (low drift); anime and cyberpunk are allowed to reinterpret more.
 */

export type PresetId =
  | 'executive'
  | 'cyberpunk'
  | 'ecommerce'
  | 'anime'
  | 'restore'
  | 'passport'
  | 'sweep'
  | 'pet'

export interface StylePreset {
  id: PresetId
  name: string
  tagline: string
  /**
   * Instruction for edit-style models (FLUX Kontext). These models rewrite the
   * photo in place from a natural-language command, which preserves identity far
   * better than re-synthesising from a descriptive prompt.
   */
  instruction: string
  /** Descriptive prompt for diffusion img2img models (SDXL). */
  prompt: string
  negativePrompt: string
  /** 0 = return the input untouched, 1 = ignore the input entirely. */
  strength: number
  /** Subject the preset is designed for; shown as a hint under the card. */
  bestFor: string
}

export const PRESETS: StylePreset[] = [
  {
    id: 'executive',
    name: 'Executive Portrait',
    tagline: 'LinkedIn-ready in one shot',
    instruction:
      'Restyle this into a professional corporate headshot. Keep the person\'s face, identity and features exactly the same. Dress them in sharp business attire, light them with a soft key light and subtle rim light, and place them against a clean neutral studio backdrop with shallow depth of field. Photorealistic, editorial retouching.',
    prompt:
      'professional corporate headshot of the same person, sharp business attire, ' +
      'soft key light with subtle rim light, shallow depth of field, neutral studio ' +
      'backdrop, confident natural expression, photorealistic, 85mm lens, editorial retouching',
    negativePrompt:
      'cartoon, illustration, anime, distorted face, extra fingers, watermark, text, ' +
      'oversaturated, plastic skin, harsh flash, cluttered background',
    strength: 0.42,
    bestFor: 'Selfies and portraits',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Hero',
    tagline: 'Your Web3 profile picture',
    instruction:
      'Restyle this into a cyberpunk hero portrait. Keep the person\'s face and identity recognisable. Add neon magenta and cyan rim lighting, a rain-slick futuristic city bokeh background, subtle chrome and holographic accents, cinematic contrast and volumetric haze.',
    prompt:
      'cyberpunk portrait of the same person, neon magenta and cyan rim lighting, ' +
      'rain-slick futuristic city bokeh, subtle chrome and holographic accents, ' +
      'cinematic contrast, volumetric haze, highly detailed, dramatic sci-fi character art',
    negativePrompt:
      'flat lighting, daylight, corporate, blurry, deformed face, extra limbs, ' +
      'watermark, text, low contrast, washed out',
    strength: 0.58,
    bestFor: 'Avatars for X and Discord',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Studio',
    tagline: 'Marketplace-grade product shot',
    instruction:
      'Restyle this into a professional e-commerce product photograph. Keep the product\'s shape, colour and details exactly the same. Replace the background with a seamless clean white studio backdrop, relight with soft diffused three-point lighting, add a subtle contact shadow, and make the edges crisp. Catalogue quality, high key.',
    prompt:
      'professional e-commerce product photograph of the same object, seamless clean ' +
      'white studio backdrop, soft diffused three-point lighting, crisp product edges, ' +
      'accurate colour, subtle contact shadow, catalogue quality, ultra sharp, high key',
    negativePrompt:
      'human face, hands, clutter, busy background, harsh shadows, motion blur, ' +
      'watermark, text, distorted product geometry, colour cast',
    strength: 0.5,
    bestFor: 'Products and objects',
  },
  {
    id: 'anime',
    name: 'Anime Portrait',
    tagline: 'Studio-quality illustrated you',
    instruction:
      'Restyle this as a high quality anime illustration. Keep the subject\'s pose, features and identity recognisable. Use clean cel shading, expressive detailed eyes, soft ambient colour grading and a painterly bokeh background. Crisp linework, modern studio animation key art.',
    prompt:
      'high quality anime illustration of the same person, clean cel shading, expressive ' +
      'detailed eyes, soft ambient colour grading, painterly background bokeh, ' +
      'modern studio animation key art, crisp linework',
    negativePrompt:
      'photorealistic, 3d render, deformed anatomy, extra fingers, muddy colours, ' +
      'watermark, text, sketch lines, low detail',
    strength: 0.62,
    bestFor: 'Selfies and pets',
  },
  {
    id: 'restore',
    name: 'Restore & Enhance',
    tagline: 'Same photo, minus the damage',
    instruction:
      'Restore this photograph. This is a repair, not a restyle: keep the exact same people with the same faces, expressions, apparent age, skin texture, wrinkles, moles, glasses, teeth, poses, hairstyles and clothing; keep the same background, objects, composition, crop and framing; keep any print borders, printed dates, handwriting and captions exactly as they are; keep the period look and colour palette of the original. Do not add, replace, beautify, rejuvenate or reinterpret anything, and do not invent detail that is not visible in the original. Only repair damage: remove scratches, creases, tears, dust and stains, filling them from the surrounding image; lift fading and restore natural contrast and tonal range; if it is a faded colour print, correct its colour cast back to natural colour; if it is black-and-white or sepia, keep it black-and-white or sepia; reduce noise and heavy grain while keeping natural skin texture; sharpen soft focus only as far as the original detail supports, leaving genuinely lost detail soft rather than inventing it. Photorealistic, archival restoration quality.',
    prompt:
      'faithful restoration of the exact same photograph, the same person with the same face, expression, hairstyle and clothing, the same background and composition, scratches creases and dust removed, fading lifted, natural contrast and tonal range, colour cast corrected, clean fine detail, gently sharpened, natural skin texture, period-accurate, archival photo restoration, photorealistic',
    negativePrompt:
      'scratches, creases, tears, dust, stains, faded, colour cast, blurry, noisy, film grain, jpeg artifacts, different person, altered face, deformed features, changed clothing, changed background, added objects, modern restyling, colourised, plastic skin, oversmoothed, sharpening halos, painting, illustration, cartoon, watermark, text',
    strength: 0.28,
    bestFor: 'Old prints and phone photos',
  },
  {
    id: 'passport',
    name: 'Passport Photo',
    tagline: 'Plain backdrop, even light, same face',
    instruction:
      'Change only the background, lighting and framing of this photo to make a passport-style ID photo. Keep the person exactly the same: face, identity, age, face shape, features, skin tone and skin texture including moles, freckles, scars and wrinkles, eye colour, hair and hairline, glasses, expression, head pose and clothing. Do not retouch, smooth, slim, de-age, add makeup or beautify in any way. Replace the background with a seamless plain off-white backdrop. Relight with soft, even, frontal light so the face is evenly lit with no shadows on the face and no shadow behind the head. Centre the head and shoulders in the frame without zooming in, and do not add any part of the body, hair or clothing that is not already visible. Natural colour, no filter, no vignette, photorealistic.',
    prompt:
      'passport-style ID photo of the same person, unchanged face and features, natural skin texture, accurate skin tone, seamless plain off-white background, soft even frontal lighting, no shadows on face or background, centred head and shoulders, neutral colour balance, sharp focus, photorealistic, 50mm lens',
    negativePrompt:
      'different person, altered face, changed facial features, beautified, airbrushed, plastic skin, added makeup, hat, sunglasses, shadows on face, hard shadow behind head, coloured background, patterned background, busy background, vignette, colour filter, stylized, cartoon, illustration, painting, tilted frame, cropped head, watermark, text, blurry, low resolution',
    strength: 0.34,
    bestFor: 'Face-on, no hat or sunglasses',
  },
  {
    id: 'sweep',
    name: 'Colour Sweep',
    tagline: 'Hero shot on a coloured backdrop',
    instruction:
      'Restyle this into a premium product photograph on a coloured seamless studio sweep. Choose a single backdrop colour that clearly contrasts with the product so its edges stay distinct - never a hue close to the product\'s own colour. Keep the product\'s shape, proportions, colour, material, label, logo, text and surface details exactly the same, and keep its position, scale, camera angle and framing unchanged; do not add, remove or reposition anything on the product. Replace the background with a smooth, evenly lit sweep in that colour whose floor curves seamlessly up into the wall with no visible horizon line, with a soft brighter glow of that colour directly behind the product that falls off to a deeper shade at the edges of the frame. Relight with soft diffused studio light from above and slightly in front without tinting the product, add a gentle contact shadow beneath it and a faint, short reflection of its base on the floor that fades out quickly, and keep the product\'s edges crisp. Photorealistic, high-end advertising campaign quality.',
    prompt:
      'premium advertising product photograph of the same object, smooth seamless coloured studio sweep backdrop contrasting with the product, brighter glow behind the product falling off darker toward the edges, no horizon line, soft diffused studio lighting from above, subtle soft reflection and gentle contact shadow beneath the product, crisp product edges, accurate product colour, intact label and logo, photorealistic, ultra sharp, high-end campaign quality',
    negativePrompt:
      'white background, grey background, busy background, props, clutter, hard horizon line, human face, hands, harsh shadows, recoloured product, altered label, distorted product geometry, motion blur, watermark, overlay text, oversaturated, cartoon, illustration',
    strength: 0.52,
    bestFor: 'Products for ads and socials',
  },
  {
    id: 'pet',
    name: 'Pet Portrait',
    tagline: 'Frame-worthy studio pet shot',
    instruction:
      'Restyle this into a professional studio pet portrait photograph. Keep this exact animal unchanged: the same species and breed, the same coat colours, markings, patches, stripes and fur length, the same eye colour, ear shape, muzzle, face and body proportions, and the same pose, expression and framing. Do not add, remove, move or reshape any markings, and keep any collar or tag as it is. If a person, hand or second animal is in the frame, keep them as they are. Light the animal with one large soft key light from the upper left and a gentle fill, with small natural catchlights in the eyes. Replace the surroundings with a clean, smoothly blurred, muted warm-grey studio backdrop. Tack-sharp focus on the eyes, whiskers and individual fur strands, shallow depth of field, and a warm but colour-accurate grade that does not shift the coat\'s true colours. Photorealistic editorial pet photography, not an illustration.',
    prompt:
      'professional studio pet portrait photograph of the same animal, identical coat colours and markings, same eye colour and ear shape, same pose, soft key light from the upper left with gentle fill, small catchlights in the eyes, smoothly blurred muted warm grey studio backdrop, shallow depth of field, tack-sharp focus on the eyes and whiskers, individual fur strands visible, warm natural colour grade, 85mm lens, photorealistic, editorial pet photography, fine detail',
    negativePrompt:
      'cartoon, illustration, anime, painting, 3d render, different animal, different breed, changed markings, wrong coat colour, extra limbs, extra tail, deformed paws, human, hands, text, watermark, harsh flash, red-eye glow, cluttered background, oversaturated, plastic fur, blurry eyes, motion blur',
    strength: 0.4,
    bestFor: 'Dogs, cats and other pets',
  },
]

const BY_ID = new Map(PRESETS.map((p) => [p.id, p]))

export function getPreset(id: string): StylePreset | undefined {
  return BY_ID.get(id as PresetId)
}

export function isPresetId(id: unknown): id is PresetId {
  return typeof id === 'string' && BY_ID.has(id as PresetId)
}
