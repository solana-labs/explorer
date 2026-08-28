import type React from 'react';

// White-noise surface behind the simulation zone: every pixel is a random blend between the app's
// standard background (#141816) and a constant "tint" colour, with sparse brighter "sparkle" specks on
// top. An SVG `feTurbulence` generates fine grain, `feColorMatrix` recolours it to the constant colour
// with a noisy alpha (alpha = luminance of the turbulence), and it's layered over the base — so the
// alpha noise fades each pixel between the two colours. Only the padding/gaps show it; the cards keep
// their own surface. Colours are fractional sRGB triples [r, g, b]. Exposed as a factory so a variant
// can reuse the exact same grain at a different hue.
type Rgb = [number, number, number];

function noiseLayer({
    id,
    baseFrequency,
    numOctaves,
    seed,
    color: [r, g, b],
    alphaRow,
}: {
    id: string;
    baseFrequency: string;
    numOctaves: string;
    seed?: string;
    color: Rgb;
    alphaRow: string;
}): string {
    const seedAttr = seed === undefined ? '' : ` seed='${seed}'`;
    // color-interpolation-filters='sRGB': without it SVG filters composite in linearRGB, which lightens
    // midtones and pushes the blend brighter than the tint endpoint. sRGB keeps the range exactly
    // between the base and the tint colour. feColorMatrix rows 1-3 set the constant colour; row 4
    // derives the alpha from the turbulence luminance.
    return (
        `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
        `<filter id='${id}' color-interpolation-filters='sRGB'>` +
        `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${numOctaves}'${seedAttr} stitchTiles='stitch'/>` +
        `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${alphaRow}'/>` +
        `</filter>` +
        `<rect width='100%' height='100%' filter='url(#${id})'/>` +
        `</svg>`
    );
}

export function buildSimZoneStyle({
    base,
    tint,
    sparkle,
}: {
    base: string;
    tint: Rgb;
    sparkle: Rgb;
}): React.CSSProperties {
    // Base noise: mean alpha ~0.5 so most pixels sit between the base and the tint.
    const noise = noiseLayer({
        alphaRow: '0.5 0.5 0.5 0 -0.25',
        baseFrequency: '0.9',
        color: tint,
        id: 'n',
        numOctaves: '3',
    });
    // Sparkle: a sparser, higher-frequency layer; the alpha threshold (`0.9·sum − 1.75`) only lets the
    // highest turbulence values through, so just a few pixels light up and the rest reveal the noise
    // below. Offset -1.75 vs -1.55 makes visible specks ~20× rarer.
    const sparkleLayer = noiseLayer({
        alphaRow: '0.9 0.9 0.9 0 -1.75',
        baseFrequency: '1.1',
        color: sparkle,
        id: 's',
        numOctaves: '2',
        seed: '11',
    });
    return {
        backgroundColor: base,
        // Sparkle layer first (topmost), then the base noise beneath it.
        backgroundImage:
            `url("data:image/svg+xml,${encodeURIComponent(sparkleLayer)}"), ` +
            `url("data:image/svg+xml,${encodeURIComponent(noise)}")`,
    };
}

// The zone green: base #141816 blended toward the tint green #14261e, with accent-green (#1dd79b)
// sparkles.
export const SIM_ZONE_STYLE: React.CSSProperties = buildSimZoneStyle({
    base: '#141816',
    sparkle: [0.114, 0.843, 0.608],
    tint: [0.078, 0.149, 0.118],
});
