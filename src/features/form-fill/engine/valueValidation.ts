type NumericValueType = 'cep' | 'cnpj' | 'cpf' | 'phone' | null;

export function detectNumericValueType(name = '', label = ''): NumericValueType {
  const source = `${name} ${label}`.toLowerCase();
  if (source.includes('cpf')) return 'cpf';
  if (source.includes('cnpj')) return 'cnpj';
  if (source.includes('telefone') || source.includes('celular')) return 'phone';
  if (source.includes('cep')) return 'cep';
  return null;
}

export function formatNumericValue(value: string, type: NumericValueType) {
  const digits = value.replace(/\D/g, '');

  switch (type) {
    case 'cpf':
      return digits.slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    case 'cnpj':
      return digits.slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    case 'phone':
      return digits.slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    case 'cep':
      return digits.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
    default:
      return value.replace(/[^\d.,-]/g, '');
  }
}

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}
