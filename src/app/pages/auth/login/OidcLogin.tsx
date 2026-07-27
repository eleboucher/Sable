import { Box, IconButton, Overlay, OverlayBackdrop, OverlayCenter, Spinner, Text } from 'folds';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ValidatedAuthMetadata } from '$types/matrix-sdk';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAuthServer } from '$hooks/useAuthServer';
import { InfoCard } from '$components/info-card';
import { Check, Link, sizedIcon } from '$components/icons/phosphor';
import { BreakWord } from '$styles/Text.css';
import { copyToClipboard } from '$utils/dom';
import { useTimeoutToggle } from '$hooks/useTimeoutToggle';
import { getLoginPath } from '$pages/pathUtils';
import { useCommitLoginSession } from './loginUtil';
import type { OidcLoginResult } from './oidcLoginUtil';
import {
  OidcLoginError,
  OidcLoginFailure,
  completeOidcLogin,
  startOidcLogin,
} from './oidcLoginUtil';
import { Button } from '$components/button';

const ERROR_TITLE = 'Single sign-on';

const oidcErrorMessage = (error: unknown): string => {
  const code = error instanceof OidcLoginFailure ? error.code : OidcLoginError.Unknown;
  switch (code) {
    case OidcLoginError.RegistrationFailed:
      return 'Could not register with the homeserver for single sign-on.';
    case OidcLoginError.CodeExchangeFailed:
      return 'Sign-in could not be completed. Please try again.';
    case OidcLoginError.MissingDeviceId:
      return 'The homeserver did not grant a device for this session.';
    case OidcLoginError.MissingRefreshToken:
      return 'The authorization server did not issue the required refresh token.';
    case OidcLoginError.BrowserOpenFailed:
      return "Couldn't open your browser. Copy the link below to sign in.";
    default:
      return 'Failed to sign in with single sign-on.';
  }
};

const BROWSER_OPEN_FAILED_TITLE = 'Open link manually';
const BROWSER_OPEN_FAILED_DESC =
  "Couldn't open your browser automatically. Copy this link and open it in your browser to sign in.";

function BrowserOpenFailedFallback({ url }: { url: string }) {
  const [copied, setCopied] = useTimeoutToggle();
  return (
    <Box direction="Column" gap="300">
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

type OidcLoginButtonProps = {
  authMetadata: ValidatedAuthMetadata;
  homeserverUrl: string;
  redirectUri: string;
  label: string;
  prompt?: string;
  notice?: string;
  server?: string;
};
export function OidcLoginButton({
  authMetadata,
  homeserverUrl,
  redirectUri,
  label,
  prompt,
  notice,
  server,
}: OidcLoginButtonProps) {
  const [state, start] = useAsyncCallback(
    useCallback(
      () => startOidcLogin(authMetadata, homeserverUrl, redirectUri, { prompt, server }),
      [authMetadata, homeserverUrl, redirectUri, prompt, server]
    )
  );

  const loading = state.status === AsyncStatus.Loading || state.status === AsyncStatus.Success;

  const browserOpenFailedUrl =
    state.status === AsyncStatus.Error &&
    state.error instanceof OidcLoginFailure &&
    state.error.code === OidcLoginError.BrowserOpenFailed
      ? state.error.authUrl
      : undefined;

  const errorMessage =
    state.status === AsyncStatus.Error && !browserOpenFailedUrl
      ? oidcErrorMessage(state.error)
      : state.status === AsyncStatus.Error
        ? undefined
        : notice;

  return (
    <Box direction="Column" gap="300">
      {browserOpenFailedUrl && <BrowserOpenFailedFallback url={browserOpenFailedUrl} />}
      {errorMessage && (
        <InfoCard variant="Critical" title={ERROR_TITLE} description={errorMessage} />
      )}
      <Button
        style={{ width: '100%' }}
        size="500"
        variant="Secondary"
        fill="Soft"
        outlined
        loading={loading}
        spinnerSize="200"
        spinnerVariant="Secondary"
        onClick={() => start()}
      >
        <Text align="Center" size="B500" truncate>
          {label}
        </Text>
      </Button>
    </Box>
  );
}

type OidcCallbackProps = {
  code: string;
  state: string;
  slidingSyncOptIn: boolean;
};
export function OidcCallback({ code, state, slidingSyncOptIn }: OidcCallbackProps) {
  const commitSession = useCommitLoginSession();
  const server = useAuthServer();
  const navigate = useNavigate();

  const [loginState, complete] = useAsyncCallback<OidcLoginResult, unknown, [string, string]>(
    useCallback(completeOidcLogin, [])
  );

  useEffect(() => {
    complete(code, state);
  }, [code, state, complete]);

  useEffect(() => {
    if (loginState.status === AsyncStatus.Success) {
      commitSession(loginState.data.session, slidingSyncOptIn);
    }
  }, [loginState, slidingSyncOptIn, commitSession]);

  return (
    <>
      {loginState.status === AsyncStatus.Error && (
        <Box direction="Column" gap="300">
          <InfoCard
            variant="Critical"
            title={ERROR_TITLE}
            description={oidcErrorMessage(loginState.error)}
          />
          <Button
            variant="Secondary"
            fill="Soft"
            outlined
            onClick={() => navigate(getLoginPath(server), { replace: true })}
          >
            <Text align="Center" size="B400">
              Back to Login
            </Text>
          </Button>
        </Box>
      )}
      <Overlay open={loginState.status !== AsyncStatus.Error} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <Spinner size="600" variant="Secondary" />
        </OverlayCenter>
      </Overlay>
    </>
  );
}
