import type { DynamicField } from '../types/form';

export function findFieldLabel(fields: DynamicField[], fieldId: string): string | null {
  for (const field of fields) {
    if (field.id === fieldId) return field.config.label ?? null;
    if (field.type === 'group' && field.config.children) {
      const found = findFieldLabel(field.config.children, fieldId);
      if (found) return found;
    }
  }
  return null;
}
