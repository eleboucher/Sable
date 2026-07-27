import { Avatar, AvatarImage, Box, Button, IconButton, Text } from 'folds';
import type { IIdentityProvider, SSOAction } from '$types/matrix-sdk';
import { createClient } from '$types/matrix-sdk';
import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAutoDiscoveryInfo } from '$hooks/useAutoDiscoveryInfo';
import { type as osType } from '@tauri-apps/plugin-os';
import { fetch } from '$utils/fetch';
import { createLogger } from '$utils/debug';
import { InfoCard } from '$components/info-card';
import { Check, Link, sizedIcon } from '$components/icons/phosphor';
import { BreakWord } from '$styles/Text.css';
import { copyToClipboard } from '$utils/dom';
import { useTimeoutToggle } from '$hooks/useTimeoutToggle';

const log = createLogger('ssoLogin');

type SSOLoginProps = {
  providers?: IIdentityProvider[];
  redirectUrl: string;
  action?: SSOAction;
  saveScreenSpace?: boolean;
};
const openSso = async (event: MouseEvent, url: string, onOpenFailed: (url: string) => void) => {
  if (!isTauri()) return;
  event.preventDefault();
  const os = osType();
  const urlProgram = os === 'ios' || os === 'android' ? 'inAppBrowser' : undefined;
  try {
    await openUrl(url, urlProgram);
  } catch (err) {
    log.error('Failed to open browser for SSO login', err);
    onOpenFailed(url);
  }
};

const BROWSER_OPEN_FAILED_TITLE = 'Open link manually';
const BROWSER_OPEN_FAILED_DESC =
  "Couldn't open your browser automatically. Copy this link and open it in your browser to sign in.";

function BrowserOpenFailedFallback({ url }: { url: string }) {
  const [copied, setCopied] = useTimeoutToggle();
  return (
    <Box direction="Column" gap="300" style={{ width: '100%' }}>
      <InfoCard variant="Secondary" title={BROWSER_OPEN_FAILED_TITLE} description={BROWSER_OPEN_FAILED_DESC} />
      <Box direction="Row" gap="200" alignItems="Center">
        <Box grow="Yes" style={{ minWidth: 0 }}>
          <Text className={BreakWord} size="T200" priority="300">
            {url}
          </Text>
        </Box>
        <Box shrink="No">
          <IconButton
            aria-label={copied ? 'Copied login link' : 'Copy login link'}
            onClick={async () => {
              if (await copyToClipboard(url)) setCopied();
            }}
            size="300"
            variant="Surface"
            fill="None"
            radii="Inherit"
          >
            {sizedIcon(copied ? Check : Link, '50')}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export function SSOLogin({ providers, redirectUrl, action, saveScreenSpace }: SSOLoginProps) {
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl, fetchFn: fetch }), [baseUrl]);
  const [failedSsoUrl, setFailedSsoUrl] = useState<string | undefined>(undefined);

  const getSSOIdUrl = (ssoId?: string): string =>
    mx.getSsoLoginUrl(redirectUrl, 'sso', ssoId, action);

  const withoutIcon = providers
    ? providers.find(
        (provider) => !provider.icon || !mx.mxcUrlToHttp(provider.icon, 96, 96, 'crop', false)
      )
    : true;

  const renderAsIcons = withoutIcon ? false : saveScreenSpace && providers && providers.length > 2;

  return (
    <Box justifyContent="Center" gap="600" wrap="Wrap">
      {failedSsoUrl && <BrowserOpenFailedFallback url={failedSsoUrl} />}
      {providers ? (
        providers.map((provider) => {
          const { id, name, icon } = provider;
          const iconUrl = icon && mx.mxcUrlToHttp(icon, 96, 96, 'crop', false);

          const buttonTitle = `Continue with ${name}`;

          if (renderAsIcons) {
            return (
              <Avatar
                style={{ cursor: 'pointer' }}
                key={id}
                as="a"
                href={getSSOIdUrl(id)}
                onClick={(event) => openSso(event, getSSOIdUrl(id), setFailedSsoUrl)}
                aria-label={buttonTitle}
                size="300"
                radii="300"
              >
                <AvatarImage src={iconUrl!} alt={name} title={buttonTitle} />
              </Avatar>
            );
          }

          return (
            <Button
              style={{ width: '100%' }}
              key={id}
              as="a"
              href={getSSOIdUrl(id)}
              onClick={(event) => openSso(event, getSSOIdUrl(id), setFailedSsoUrl)}
              size="500"
              variant="Secondary"
              fill="Soft"
              outlined
              before={
                iconUrl && (
                  <Avatar size="200" radii="300">
                    <AvatarImage src={iconUrl} alt={name} />
                  </Avatar>
                )
              }
            >
              <Text align="Center" size="B500" truncate>
                {buttonTitle}
              </Text>
            </Button>
          );
        })
      ) : (
        <Button
          style={{ width: '100%' }}
          as="a"
          href={getSSOIdUrl()}
          onClick={(event) => openSso(event, getSSOIdUrl(), setFailedSsoUrl)}
          size="500"
          variant="Secondary"
          fill="Soft"
          outlined
        >
          <Text align="Center" size="B500" truncate>
            Continue with SSO
          </Text>
        </Button>
      )}
    </Box>
  );
}
