import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { site } from '@/config/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

export default async function OpenGraphImage() {
  const [logoData, heroRaw, fontData] = await Promise.all([
    readFile(join(process.cwd(), 'public/brand/wordmark.png'), 'base64'),
    readFile(join(process.cwd(), 'public/hero-image.webp')),
    readFile(join(process.cwd(), 'public/fonts/playfair-display-400.ttf')),
  ]);

  // Satori does not support WebP — convert to JPEG via sharp (bundled with Next.js)
  // Resize to exact panel dimensions before encoding; reduces final PNG output size significantly
  const heroJpeg = await sharp(heroRaw)
    .resize(600, 630, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 70 })
    .toBuffer();
  const logoSrc = `data:image/png;base64,${logoData}`;
  const heroSrc = `data:image/jpeg;base64,${heroJpeg.toString('base64')}`;

  const imageResponse = new ImageResponse(
    <div
      style={{
        background: site.bg,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* Left: copy panel */}
      <div
        style={{
          width: '50%',
          height: '100%',
          background: '#FAF8F4',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          position: 'relative',
        }}
      >
        {/* Wordmark — top left */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={site.name}
          width={180}
          height={36}
          style={{ position: 'absolute', top: 48, left: 64, objectFit: 'contain' }}
        />

        {/* H1 — two lines, no <br /> (Satori support unreliable) */}
        <div
          style={{
            color: '#1A1A1A',
            fontSize: 52,
            fontWeight: 400,
            fontFamily: 'Playfair Display',
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: '-0.02em',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Your yard.</span>
          <span>Figured out.</span>
        </div>

        <p
          style={{
            color: '#9A9590',
            fontSize: 20,
            fontFamily: 'sans-serif',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Stop researching. Stop guessing. Stop starting over every spring.
        </p>
      </div>

      {/* Right: hero image via URL — avoids inline WebP encoding issues */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroSrc}
        alt=""
        width={600}
        height={630}
        style={{
          width: '50%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Playfair Display',
          // new Uint8Array(Buffer) copies data into a fresh standalone ArrayBuffer
          data: new Uint8Array(fontData).buffer,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );

  // Satori outputs lossless PNG — photos compress poorly as PNG and blow past WhatsApp's 600KB limit.
  // Re-encode the rendered output as JPEG to reliably stay under that threshold.
  const pngBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 82 }).toBuffer();
  return new Response(jpegBuffer, { headers: { 'Content-Type': 'image/jpeg' } });
}
