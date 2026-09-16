/**
 * Style presets. Each preset is a complete instruction set for the image model:
 * a positive prompt, a negative prompt, and a strength that controls how far the
 * result may drift from the uploaded photo.
 *
 * Strength is tuned per preset on purpose. Headshots must stay recognisably the
 * same person (low drift); anime and cyberpunk are allowed to reinterpret more.
 */

export type PresetId = 'executive' | 'cyberpunk' | 'ecommerce' | 'anime'

export interface StylePreset {
  id: PresetId
  name: string
  tagline: string
  /** Tailwind gradient stops used for the preset card and the pay button. */
  gradient: string
  accent: string
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
    gradient: 'from-slate-200 via-sky-300 to-nimiq-blue',
    accent: '#0582CA',
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
    gradient: 'from-neon-magenta via-fuchsia-500 to-neon-cyan',
    accent: '#FF3DCB',
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
    gradient: 'from-amber-200 via-nimiq-gold to-nimiq-orange',
    accent: '#E9B213',
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
    gradient: 'from-violet-300 via-purple-400 to-nimiq-purple',
    accent: '#5F4B8B',
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
]

const BY_ID = new Map(PRESETS.map((p) => [p.id, p]))

export function getPreset(id: string): StylePreset | undefined {
  return BY_ID.get(id as PresetId)
}

export function isPresetId(id: unknown): id is PresetId {
  return typeof id === 'string' && BY_ID.has(id as PresetId)
}
