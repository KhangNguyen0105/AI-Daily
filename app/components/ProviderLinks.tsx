'use client';

import { getProviderLinks } from '@/app/lib/provider-links';

interface ProviderLinksProps {
  providerName: string;
  sourceUrl: string | null;
}

export function ProviderLinks({ providerName, sourceUrl }: ProviderLinksProps) {
  const links = getProviderLinks(providerName);

  if (!links && !sourceUrl) {
    return null;
  }

  return (
    <div className="space-y-2">
      {links && (
        <>
          <a
            href={links.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:text-blue-800 underline"
          >
            Docs
          </a>
          <a
            href={links.api}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:text-blue-800 underline"
          >
            API Reference
          </a>
          {links.playground && (
            <a
              href={links.playground}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 underline"
            >
              Playground
            </a>
          )}
        </>
      )}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-blue-600 hover:text-blue-800 underline"
        >
          Pricing Page
        </a>
      )}
    </div>
  );
}
