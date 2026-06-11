/**
 * Serviço para máscaras de campos de formulário
 */
const ValidacaoService = (function() {
    // Funções de máscara apenas
    function maskCPF(value) {
        if (!value) return '';
        value = value.toString().replace(/\D/g, '');
        value = value.substring(0, 11);
        if (value.length > 9) {
            return value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        } else if (value.length > 6) {
            return value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        } else if (value.length > 3) {
            return value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        }
        return value;
    }

    function maskCNPJ(value) {
        if (!value) return '';
        value = value.toString().replace(/\D/g, '');
        value = value.substring(0, 14);
        if (value.length > 12) {
            return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
        } else if (value.length > 8) {
            return value.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
        } else if (value.length > 5) {
            return value.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
        } else if (value.length > 2) {
            return value.replace(/(\d{2})(\d{1,3})/, '$1.$2');
        }
        return value;
    }

    function maskPhone(value) {
        if (!value) return '';
        value = value.toString().replace(/\D/g, '');
        value = value.substring(0, 11);
        if (value.length > 10) {
            return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length > 6) {
            return value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            return value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        }
        return value;
    }

    function maskCEP(value) {
        if (!value) return '';
        value = value.toString().replace(/\D/g, '');
        value = value.substring(0, 8);
        if (value.length > 5) {
            return value.replace(/(\d{5})(\d{3})/, '$1-$2');
        }
        return value;
    }

    // Algoritmo de validação de CPF conforme especificação
    function validarCPF(cpf) {
        if (!cpf) {
            console.log('CPF inválido: vazio ou indefinido');
            return false;
        }
        cpf = cpf.toString().replace(/\D/g, '');
        if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) {
            console.log('CPF inválido: formato ou repetido', cpf);
            return false;
        }

        // Cálculo do primeiro dígito
        let soma1 = 0;
        for (let i = 0; i < 9; i++) {
            soma1 += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto1 = soma1 % 11;
        let digito1 = (resto1 < 2) ? 0 : 11 - resto1;
        if (digito1 !== parseInt(cpf.charAt(9))) {
            console.log('CPF inválido: primeiro dígito', cpf);
            return false;
        }

        // Cálculo do segundo dígito
        let soma2 = 0;
        for (let i = 0; i < 10; i++) {
            soma2 += parseInt(cpf.charAt(i)) * (11 - i);
        }
        let resto2 = soma2 % 11;
        let digito2 = (resto2 < 2) ? 0 : 11 - resto2;
        if (digito2 !== parseInt(cpf.charAt(10))) {
            console.log('CPF inválido: segundo dígito', cpf);
            return false;
        }

        console.log('CPF válido:', cpf);
        return true;
    }

    // API pública do módulo
    return {
        maskCPF,
        maskCNPJ,
        maskPhone,
        maskCEP,
        validarCPF
    };
})();

// Exportação do módulo
window.ValidacaoService = ValidacaoService;
