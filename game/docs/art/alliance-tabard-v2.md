# Alliance hunter tabard v2

Generated with the built-in image_gen tool on 2026-10-14.

Assets:
- Original generated PNG: removed from `game/assets` on 2026-10-14 (it went into the build unused)
- Transparent 800×800 wearable layer: `../../assets/wearables/alliance/starter-alliance-tabard-v2.webp`

The WebP is lossless and registered to the existing tabard's occupied bounds
(x=335–503, y=211–515). It preserves the transparent opening for the hunter's hand.
In the game since 3.0.1: the Alliance layer of `starter-alliance-tabard` in
`game/data/hunterArt.js` points to `assets/wearables/alliance/starter-alliance-tabard-v2.webp`.
The Horde-body layer and the inventory icon are still the first stand-in.

## Generation prompt

+Use case: precise-object-edit.
Asset type: transparent wearable sprite layer for the Alliance hunter in the INPUT browser game.
Input images: Image 1 is the EDIT TARGET, an existing transparent tabard-only sprite on an 800 by 800 canvas. Image 2 is ONLY a placement, pose, and realistic art-style reference of the hunter; do not include any of the person in the output.
Primary request: redraw and polish the tabard in Image 1 as a beautiful royal-blue Alliance hunter tabard with rich gold embroidered edging and a recognizable golden heraldic lion's head crest on the upper chest. Replace the awkward sun-like badge with a strong lion emblem. Rich blue woven cloth, believable garment folds, fine gold stitching, subtle worn fantasy texture, realistically painted game sprite matching Image 2. A wearable sleeveless cloth tabard hanging over the torso down toward the upper thighs, not armor.
CRITICAL registration invariants: keep the full square canvas, the garment's exact same position, silhouette, scale, drape, neck opening and perspective as Image 1. It occupies roughly x=332..503 and y=208..517 on the original 800px canvas. Preserve the clear transparent cutout where the hunter's nearer hand crosses the lower-left torso, approximately x=332..413 y=354..433. Keep all areas outside the cloth truly transparent, including this hand opening. Do not enlarge, center, crop, or move the garment relative to Image 1. We will overlay the output directly on Image 2.
Composition: ONLY THE TABARD, with all surrounding pixels and holes transparent. Full 800x800 square canvas preferred. Match illumination from upper left with a faint warm right-edge highlight. Crest readable at small sprite size, no complex excessive ornament.
Avoid: person, head, beard, neck skin, arms, hands, legs, weapons, hanger, mannequin, armor, sleeves, background, floor, cast shadow, checkerboard, text, letters, watermarks, icon frame. Output must be a clean isolated transparent clothing layer.
