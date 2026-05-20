# Al-Islamiya Luxury Furniture Showroom - Master Rebuild Guide

This file is a comprehensive prompt and context guide for **Claude Code** (or any AI assistant). 

## 🚨 YOUR MISSION: FULL SITE REBUILD
Your primary objective is to **read all the files in this directory, understand their logic, and completely rebuild this website from scratch** with a **significantly better, world-class luxury design**. 

The current website functions well technically, but the UI/UX and aesthetic need to be elevated to a "stunning, premium, high-end luxury" level. 

### What You Must Do:
1. **Analyze:** Read `index.html`, `gallery.html`, `about.html`, `contact.html`, and the JS files (`assets/js/`).
2. **Re-Design:** Rewrite the HTML/CSS from scratch to create a breathtaking UI. Use modern CSS, GSAP for smooth animations, and a highly polished layout.
3. **Preserve Logic:** You MUST perfectly preserve the Notion-style Inline CMS (Visual Editor) and Firebase Database integration.
4. **Refactor:** If necessary, you can restructure the files into a better architecture (e.g., modular components, Vite, or just cleaner Vanilla HTML/Tailwind). If sticking to Vanilla, ensure the Tailwind config and custom CSS are pristine.

---

## 🔐 Core System: The Notion-Style Inline CMS
The most critical feature of this website is its custom **Cloud CMS**. The owner edits the site directly on the live pages without an admin dashboard. **DO NOT BREAK THIS SYSTEM.**

### How it works:
1. **Activation:** Press **`Ctrl + Shift + A`** (or `Ctrl + Shift + ش`) or click the invisible trigger in the bottom-left corner.
2. **Password:** `islamiya2024`
3. **Editable Elements:** Any HTML tag with `data-editable="text"`, `data-editable="long-text"`, or `data-editable="image"` becomes visually editable. It MUST have a unique `data-edit-key` (e.g., `data-edit-key="home_hero_title"`).
4. **Script:** `assets/js/editor.js` handles injecting the floating toolbar, content manipulation, and syncing data to Firebase.

---

## 🔑 Necessary Keys & Configuration (Firebase)
The website relies on Firebase Realtime Database. Here is the exact configuration you must use when rebuilding the connection:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAqBQgzGJU5DypaNMyYRr5Bis7VqoqSNBY",
  authDomain: "eslamia-26da9.firebaseapp.com",
  projectId: "eslamia-26da9",
  storageBucket: "eslamia-26da9.firebasestorage.app",
  messagingSenderId: "1033255637879",
  appId: "1:1033255637879:web:7591609017c1e1df674772",
  measurementId: "G-BD8DM30SEF",
  databaseURL: "https://eslamia-26da9-default-rtdb.europe-west1.firebasedatabase.app"
};
```
- **Database Paths:**
  - `db.ref('content')` - Stores all the text/image edits mapped by `data-edit-key`.
  - `db.ref('products')` - Stores gallery items.
  - `db.ref('categories')` - Stores gallery categories.

---

## 🎨 Design Directives for the Rebuild
When rebuilding, apply these luxury design principles:
- **Color Palette:** Deep luxurious colors. Primary Dark Blue (`#0A0F2C`, `#141830`), Gold/Brass Accents (`#C9A84C`), Light Text (`#e5e1e5`). Avoid generic whites/grays.
- **Typography:** Premium typography. Noto Serif for Arabic headings, Playfair Display for English, and Tajawal/Inter for clean body text.
- **Layout:** Use asymmetrical layouts, generous whitespace, overlapping glassmorphism (`backdrop-blur`), and elegant shadows.
- **Animations:** Implement subtle, high-end GSAP animations (e.g., slow fade-ins, parallax scroll effects, text reveal animations). No abrupt or cheap-looking transitions.
- **Responsiveness:** Flawless mobile experience, matching the premium feel of the desktop version.

## ⚠️ Strict Rules for the Rebuild
1. **Never Remove `data-editable` or `data-edit-key`:** When writing the new HTML, ensure all dynamic text and images still have these attributes so the CMS continues to work.
2. **Arabic RTL Support:** The website is primarily Arabic. Perfect RTL layout is non-negotiable.
3. **Global Link Preventer:** The `editor.js` logic that stops links from working while in "Edit Mode" must be maintained so users can click text to edit it instead of navigating away.

**Claude, read the source files, absorb the current CMS logic, and create a masterpiece.**
