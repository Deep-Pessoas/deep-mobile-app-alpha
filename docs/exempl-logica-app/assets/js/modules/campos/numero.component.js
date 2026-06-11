/**
 * Componente para campo numérico
 */
const NumeroComponent = (function() {
    /**
     * Renderiza campo numérico
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, placeholder, required, defaultValue = '', reference = '' } = config;
        
        // Detectar automaticamente se é CPF/CNPJ baseado no label/placeholder
        const fieldName = (config.name || '').toLowerCase();
        const fieldLabel = (label || '').toLowerCase();
        let dataType = '';
        
        if (fieldName.includes('cpf') || fieldLabel.includes('cpf')) {
            dataType = 'cpf';
        } else if (fieldName.includes('cnpj') || fieldLabel.includes('cnpj')) {
            dataType = 'cnpj';
        } else if (fieldName.includes('telefone') || fieldLabel.includes('telefone') || 
                   fieldName.includes('celular') || fieldLabel.includes('celular')) {
            dataType = 'phone';
        } else if (fieldName.includes('cep') || fieldLabel.includes('cep')) {
            dataType = 'cep';
        }

        let inputType = 'text';
        let inputMode = 'decimal'; 

        // Definir tipo de entrada com base no dataType
        if (dataType) {
            switch(dataType) {
                case 'cpf':
                case 'cnpj':
                case 'phone':
                case 'cep':
                    inputType = 'text';
                    inputMode = 'numeric';
                    break;
                default:
                    inputType = 'text';
                    inputMode = 'decimal';
            }
        }
        
        // Script para aplicar máscaras dinamicamente
        const initScript = `
            <script>
                $(function() {
                    const $input = $("#${id}");
                    const dataType = "${dataType}";
                    const $error = $input.closest('.campo-formulario').find('.error-message');
                    function applyMask(value) {
                        if (!value) return '';
                        switch(dataType) {
                            case 'cpf':
                                return ValidacaoService.maskCPF(value);
                            case 'cnpj':
                                return ValidacaoService.maskCNPJ(value);
                            case 'phone':
                                return ValidacaoService.maskPhone(value);
                            case 'cep':
                                return ValidacaoService.maskCEP(value);
                            default:
                                return value.replace(/[^\\d.,\\-]/g, '');
                        }
                    }
                    $input.on('input', function() {
                        const value = $(this).val();
                        const formattedValue = applyMask(value);
                        $(this).val(formattedValue);
                        $error.addClass('hidden').text('');
                        $(document).trigger('condicoes:atualizar');
                    });
                    // Validação de CPF ao sair do campo
                    if (dataType === 'cpf') {
                        $input.on('blur', function() {
                            const value = $(this).val();
                            if (value && !ValidacaoService.validarCPF(value)) {
                                $error.removeClass('hidden').text('CPF inválido');
                            } else {
                                $error.addClass('hidden').text('');
                            }
                        });
                    }
                    if ($input.val()) {
                        $input.val(applyMask($input.val()));
                    }
                });
            </script>
        `;
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="number">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <input 
                    type="${inputType}"
                    inputmode="${inputMode}"
                    id="${id}" 
                    name="${config.name || id}"
                    class="form-input"
                    placeholder="${placeholder || ''}"
                    value="${defaultValue}"
                    ${required ? 'required' : ''}
                    ${reference ? `data-reference="${reference}"` : ''}
                    ${dataType ? `data-type="${dataType}"` : ''}
                >
                ${placeholder ? `<p class="form-helper">${placeholder}</p>` : ''}
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>
                ${initScript}
            </div>
        `;
    }
    
    // API pública do módulo
    return {
        renderizar
    };
})();

// Exportação do módulo
window.NumeroComponent = NumeroComponent;

// Não altere design, apenas mantenha o controle de required/disabled/hidden centralizado
