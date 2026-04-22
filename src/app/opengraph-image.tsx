import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/config/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), 'public/brand/wordmark.png'), 'base64');
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
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
      <img
        src={logoSrc}
        alt={site.name}
        height={52}
        style={{ marginBottom: 32, objectFit: 'contain' }}
      />
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
        Your yard. Figured out.
      </h1>
      <p style={{ color: '#9A9590', fontSize: 28, margin: 0 }}>{site.description}</p>
    </div>,
    { ...size }
  );
}
