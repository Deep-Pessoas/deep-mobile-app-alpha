import type { ComponentProps } from 'react';

import { TextField } from './TextField';

export function TextareaField(props: ComponentProps<typeof TextField>) {
  return <TextField {...props} multiline />;
}
