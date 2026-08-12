# Design System Specification: The Gilded Vault

## 1. Overview & Creative North Star: "The Digital Sovereign"
This design system is engineered to evoke the atmosphere of a private, high-stakes investment club. We move beyond standard corporate layouts toward an "Editorial Sovereign" aesthetic—where the digital interface feels like a bespoke, limited-edition publication.

**The Creative North Star** is centered on **Intentional Scarcity**. In luxury, less is more, but "less" must be executed with "more" precision. We break the "template" look by utilizing:
*   **Asymmetric Sophistication:** Hero sections that use extreme horizontal offsets to create visual tension and prestige.
*   **Tonal Depth:** Moving away from flat hex codes to layered, atmospheric "glows" that mimic the lighting of a high-end gallery.
*   **Cinematic Scale:** Utilizing the full-width viewport for high-contrast imagery, allowing the user to feel the "weight" of the institution.

---

## 2. Colors & Surface Philosophy

The palette is anchored in **Deep Obsidian (#050505)** and defined by the interplay of gold gradients. We treat color not as a fill, but as a source of light.

### Surface Hierarchy & The "No-Line" Rule
Traditional UI relies on borders to separate content. In this system, **1px solid borders for sectioning are strictly prohibited.** Separation must be achieved through **Tonal Transitions**:
*   **Base:** Use `surface` (#131313) for the primary canvas.
*   **The Lift:** For a card or section to "stand out," shift it to `surface-container-low` (#1C1B1B) or `surface-container-lowest` (#0E0E0E) for a recessed, "carved" look.
*   **The Glow:** Use `primary` (#E6C364) with a 5-10% opacity as a radial gradient behind key assets to create a "halo" effect, suggesting the item is illuminated by a spotlight.

### Glass & Gradient (The "Liquid Gold" Rule)
To achieve an elite feel, CTAs and primary elements should never be flat.
*   **Signature Gradient:** Transition from `primary` (#E6C364) to `primary_container` (#C9A84C) at a 135-degree angle. 
*   **Glassmorphism:** For navigation bars or floating modals, use `surface_container` with a `backdrop-blur` of 20px and an opacity of 80%. This ensures the cinematic background imagery bleeds through, softening the interface.

---

## 3. Typography: Prestige & Clarity

We utilize a high-contrast typographic pairing to balance institutional authority with modern readability.

*   **Display & Headlines (Cinzel):** This is our "mark of heritage." Use `display-lg` (3.5rem) and `headline-lg` (2rem) for high-impact statements. The tracking should be slightly increased (+5% to +10%) to enhance the feeling of "expensive" breathing room.
*   **Body & Labels (Raleway):** Raleway provides the "modern precision." Use `body-lg` (1rem) for narrative text. Ensure a line height of at least 1.6 to maintain the luxury editorial feel.
*   **Hierarchy Note:** All headlines should be set in `primary` or `on_surface`. Sub-labels should use `on_surface_variant` (#D0C5B2) to create a clear, sophisticated visual recession.

---

## 4. Elevation & Depth: Tonal Layering

Depth in this system is a result of light, not physics. We avoid "material" style shadows.

*   **The Layering Principle:** Place a `surface_container_highest` (#353534) element atop a `surface` (#131313) background to create a "soft lift."
*   **Ambient Shadows:** For floating elements, use a shadow with a 40px to 60px blur, at 8% opacity. The shadow color must be sampled from the `surface_container_lowest` (#0E0E0E) to ensure it feels like a natural light occlusion.
*   **The "Ghost Border" Exception:** If an edge must be defined, use the `outline_variant` (#4D4637) at 20% opacity. It should be felt, not seen—like the edge of a high-quality glass pane.

---

## 5. Components

### Buttons: The "Markhor" Interaction
*   **Primary:** A gradient-filled container (`primary` to `primary_container`). Border-radius: `sm` (0.125rem) for a sharp, architectural look. Text should be `on_primary` (All-Caps Raleway, bold).
*   **Secondary:** No fill. A "Ghost Border" of `primary` at 40% opacity. On hover, the border opacity shifts to 100%.

### Input Fields: Minimalist Authority
*   **Style:** No background fill. Only a bottom border using `outline_variant` (#4D4637).
*   **States:** On focus, the bottom border transitions to a `primary` gradient. The label (Raleway, `label-sm`) shifts upwards and changes to `primary_fixed`.

### Cards: The Gallery Frame
*   **Styling:** Forbid all divider lines.
*   **Separation:** Use the Spacing Scale `10` (3.5rem) to separate internal card elements. 
*   **Imagery:** All images within cards must have a `surface_dim` (#131313) overlay at 30% to ensure typography remains legible and the "Obsidian" tone is preserved.

### Bespoke Component: The Progress Micro-Glow
For investment trackers or data points, use a thin `1px` line in `outline`. The "filled" portion of the bar should be a `primary` gradient with a subtle `3px` outer glow (box-shadow) of the same color to make the data feel "energized."

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place a heading on the far left and the body text on the far right (using the 12-column grid) to create an elite, spacious feel.
*   **Embrace Dark Overlays:** Every cinematic image must be darkened to at least 40% to keep the "Deep Obsidian" aesthetic dominant.
*   **Leverage Whitespace:** If a section feels "busy," double the padding using the Spacing Scale (e.g., move from `16` to `20`).

### Don’t:
*   **No Rounded Corners:** Avoid `full` or `xl` roundedness. Luxury is found in the architectural precision of `sm` (0.125rem) or `none`.
*   **No High-Contrast Borders:** Never use a 100% opaque white or gold border to wrap a container. It breaks the "seamless" sovereign feel.
*   **No Generic Icons:** Icons must be ultra-thin (0.5px to 1px stroke) and always in `primary` or `on_surface_variant`. Never use filled, "bubbly" icon sets.