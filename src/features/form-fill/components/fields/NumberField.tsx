import type { ComponentProps } from 'react';

import { TextField } from './TextField';

export function NumberField(props: ComponentProps<typeof TextField>) {
  return <TextField {...props} />;
}
