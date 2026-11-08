import type { ComponentProps } from 'react';
import type WebWelcome from './WelcomeLogin.web';

// Never rendered on native: keep DOM markup and CSS out of the native bundle.
export default function WelcomeLogin(_props: ComponentProps<typeof WebWelcome>) {
  return null;
}
