# 📸 NIMSNAP — Pay-Per-Shot AI Photo Studio & Avatar Mini App

> **Nimiq Mini Apps Competition Blueprint ($17,000 USDT Pool / Cycle II)**  
> **Target:** 1st Place ($10,000 USDT)  
> **Submission Deadline:** September 18, 2026  
> **Framework:** Nimiq Pay Web SDK (`nimiq.dev/mini-apps`) + Next.js 14 + Tailwind CSS + Replicate/Fal AI API  
> **License:** MIT Open Source  
> **Author:** Ifeanyichukwu Onwo (`mrnetwork`)  

---

## 📌 Executive Summary

**NIMSNAP** is a mobile-native AI Photo Studio and Avatar Generator built inside the **Nimiq Mini Apps Framework**.

Instead of forcing creators and small businesses into expensive $20–$50/month subscriptions for AI photo tools, NIMSNAP introduces **Pay-Per-Shot Micro-Pricing ($0.10 NIM/USDT per photo)**—a real-world business model powered by Nimiq Pay's instant micro-payment infrastructure.

### 🌟 Key User Experience (< 30-Second Onboarding):
1. **Open App:** User opens NIMSNAP on mobile or desktop browser (zero registration/forms).
2. **Upload Photo:** Upload a selfie, product image, or pet photo.
3. **Select Preset Style:**
   - 💼 *Executive Portrait* (LinkedIn / Professional Headshot)
   - 🦾 *Cyberpunk / Web3 Hero* (Twitter / Discord Avatar)
   - 📸 *E-Commerce Studio* (Clean product lighting)
   - 🎨 *Anime / Artistic Portrait*
4. **Pay-Per-Shot Checkout:** Tap **"Generate for $0.10 NIM/USDT"**. The Nimiq Pay drawer pops up, settling the payment in <1 second.
5. **Instant HD Download:** AI generates the transformation in 5 seconds with a live side-by-side comparison slider.

---

## 🏗️ Architecture & Technology Stack

```
                                  ┌──────────────────────────────┐
                                  │      User Mobile Browser     │
                                  └──────────────┬───────────────┘
                                                 │
                                                 │ 1. Upload Photo & Select Style
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │   NIMSNAP Next.js 14 Frontend │
                                  └───────────────┬───────────────┘
                                                 │
                                                 │ 2. Triggers Nimiq Pay Checkout ($0.10)
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │        Nimiq Pay Web SDK      │
                                  │ (Instant NIM/USDT Settlement) │
                                  └───────────────┬───────────────┘
                                                 │
                                                 │ 3. Payment Confirmed Event
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │   FastAPI / Node AI Pipeline  │
                                  │  (Replicate / Fal AI Engine)  │
                                  └───────────────┬───────────────┘
                                                 │
                                                 │ 4. Returns HD Transformed Image
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Interactive Before/After UI   │
                                  │  [ Download HD ] [ Share X ]  │
                                  └───────────────────────────────┘
```

---

## 🎯 Scoring Rubric Alignment (105 Points Max)

- **First Impression & Polish (25 Pts):** Cyberpunk / Glassmorphism UI with side-by-side comparison sliders.
- **Onboarding < 60s (20 Pts):** Zero account creation needed. Open app ➔ Upload ➔ Pay $0.10.
- **Nimiq Pay Integration (25 Pts):** Integrates Nimiq Pay Web SDK for instant $0.10 micro-payments.
- **Mobile Responsiveness (20 Pts):** 100% mobile-first UI with camera upload support.
- **Virality & Utility (15 Pts):** 1-Click "Share to X" button with referral tracking.

---

## 📄 License
MIT Open Source
