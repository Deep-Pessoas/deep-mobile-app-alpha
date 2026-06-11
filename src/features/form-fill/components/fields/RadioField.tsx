import type { ComponentProps } from 'react';

import { ChoiceField } from './ChoiceField';

export function RadioField(props: ComponentProps<typeof ChoiceField>) {
  return <ChoiceField {...props} multiple={false} />;
}
