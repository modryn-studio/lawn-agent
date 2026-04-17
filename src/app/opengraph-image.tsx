import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/config/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), 'public/brand/logomark.png'), 'base64');
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: site.bg,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={site.name} height={52} style={{ marginBottom: 32, objectFit: 'contain' }} />
        <h1
          style={{
            color: '#1A1A1A',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 24,
          }}
        >
          {site.ogTitle}
        </h1>
        <p style={{ color: '#9A9590', fontSize: 28, margin: 0, marginBottom: 48 }}>
          {site.description}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: site.accent,
            color: '#FAF8F4',
            fontSize: 22,
            fontWeight: 700,
            padding: '14px 28px',
            borderRadius: 8,
          }}
        >
          {site.cta}
        </div>
      </div>
    ),
    { ...size },
  );
}
