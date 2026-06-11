import type { ComponentProps } from 'react';

import { ChoiceField } from './ChoiceField';

export function CheckboxField(props: ComponentProps<typeof ChoiceField>) {
  return <ChoiceField {...props} multiple />;
}
