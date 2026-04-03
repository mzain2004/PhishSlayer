# DESIGN_SYSTEM.md

## Purpose

Define non-negotiable v2 visual and interaction rules for Phish-Slayer.
These rules are mandatory for all human and AI-generated UI output.

## Design Protocol: Motionsites

Visual intent:

- Lethal, premium, Apple-tier cybersecurity UI
- Dark-mode native with high information density
- Motion used for clarity and state continuity, never decoration only

## Core Tokens

### Color Foundation

- Base background: #000000
- Accent teal: #2DD4BF
- Accent purple: #A78BFA
- Text primary: rgba(255,255,255,0.92)
- Text secondary: rgba(255,255,255,0.64)
- Border glow gradients: teal to purple blends only

### Background Atmosphere

Required background behavior:

- Pure black canvas
- Large blurred cosmic blobs using teal/purple accents
- Blur intensity target: blur-[150px] or equivalent visual weight

Example Tailwind composition:

- bg-black
- absolute rounded-full blur-[150px]
- bg-[#A78BFA]/35 and bg-[#2DD4BF]/30

Flat single-color backgrounds are not allowed for primary surfaces.

## Material System: Liquid Glass

Card standard:

- Background: bg-white/5
- Backdrop blur: backdrop-blur-3xl
- Border: ultra-thin gradient border in teal/purple family
- Shadows: soft, wide, low-opacity glows; avoid heavy hard shadows

Forbidden card styles:

- Opaque solid grey panels
- Thick hard borders
- Matte flat containers without depth cues

## Typography Standards

### Allowed Fonts

- Headings and key metrics: Aeonik or Space Grotesk
- Body, logs, and dense text: Inter

### Forbidden Typography

- Serif fonts
- Calligraphic or gothic fonts
- Decorative display fonts that reduce legibility

### Hierarchy Guidance

- Numeric metrics: high weight, tight tracking, short labels
- Body logs: medium weight, high readability, stable line length
- Avoid over-styling with multiple font families in one component

## Layout and Composition Rules

- Build as component composition inside SPA flows
- Avoid isolated static pages with disconnected visual logic
- Preserve consistent panel spacing rhythm and grid alignment
- Keep action controls close to data they mutate

Minimum responsive targets:

- Desktop: dense command-center layout
- Tablet: stacked but context-preserving panels
- Mobile: prioritized timeline and key actions first

## Animation and Interaction Standards

### Framework

- Framer Motion is required for major transitions and state reveals

### Motion Principles

- Motion must communicate hierarchy, causality, or loading state
- Use staggered reveals for telemetry lists and timeline segments
- Keep transitions fast and deliberate (typically 180-320ms)

### Required Motion Patterns

- Page-level entry with subtle opacity and y-shift
- Card hover lift with minor scale/translate and glow adjustment
- Presence transitions for alerts, modals, and side panels

### Forbidden Motion Patterns

- Random bounce animations
- Excessive parallax that harms readability
- Long decorative loops unrelated to state change

## Tailwind Implementation Rules

### Required Patterns

- Use design tokens and utility classes consistently
- Encapsulate repeated glass styles in reusable component primitives
- Keep accent usage intentional: teal for primary positive action, purple for advanced/high-power context

### Forbidden Patterns

- Default gray-heavy palettes as primary identity
- Unscoped inline styles that bypass token system
- Mixing unrelated aesthetic systems in the same route

## Accessibility and Operational UX

- Maintain strong contrast for all critical telemetry labels
- Preserve keyboard focus visibility on glass surfaces
- Respect reduced-motion preferences while keeping layout continuity
- Ensure loading and failure states are explicit and actionable

## AI Generator Guardrails

AI-generated UI must never:

1. Use serif, gothic, script, or novelty fonts
2. Replace black cosmic background with flat white/gray panels
3. Produce opaque cards that remove liquid-glass effect
4. Drop Framer Motion transitions from SPA-level navigation
5. Introduce disconnected static pages outside the shared composition system
6. Replace teal/purple accent language with arbitrary palette drift

## Compliance Checklist

A UI change is accepted only if all are true:

1. Uses pure black atmospheric background with blurred teal/purple blobs
2. Uses liquid-glass surfaces with translucent cards and blur
3. Uses approved typography stack and hierarchy
4. Uses meaningful Framer Motion transitions in SPA flow
5. Avoids forbidden patterns listed above
6. Preserves readability and interaction clarity under incident pressure
