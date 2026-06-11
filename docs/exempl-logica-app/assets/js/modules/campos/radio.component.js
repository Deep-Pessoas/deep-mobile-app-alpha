/**
 * Componente para campo de opção única (radio)
 */
const RadioComponent = (function() {
    /**
     * Renderiza opções de rádio como cards clicáveis
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, options = [], required, defaultValue = '' } = config;

        const initScript = `
            <script>
                $(function() {
                    const $group = $('[data-field-id="${id}"]');
                    
                    function handleRadioClick(optionCard) {
                        const input = optionCard.find('input[type="radio"]');
                        
                        // Desmarcar apenas os outros radios DESTE CAMPO ESPECÍFICO
                        $group.find('.option-card').removeClass('selected');
                        $group.find('input[type="radio"]').prop('checked', false);
                        
                        // Marcar o selecionado
                        input.prop('checked', true);
                        optionCard.addClass('selected');
                        
                        // Dispara evento change
                        input.trigger('change');
                    }

                    // Handler de click
                    $group.find('.option-card').on('click', function(e) {
                        e.preventDefault();
                        handleRadioClick($(this));
                    });

                    // Estado inicial dos radios
                    $group.find('input[type="radio"]:checked').each(function() {
                        $(this).closest('.option-card').addClass('selected');
                    });
                });
            </script>
        `;

        const radios = options.map((option, index) => {
            const optionId = `${id}_${index}`;
            const checked = option.value === defaultValue ? 'checked' : '';
            
            return `
                <div class="flex items-center p-3 bg-white border rounded-lg cursor-pointer transition-colors option-card">
                    <input type="radio"
                        id="${optionId}"
                        name="${id}"
                        value="${option.value}"
                        class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                        ${checked}
                        ${required ? 'required' : ''}>
                    <label for="${optionId}" class="ml-3 text-sm text-gray-700 cursor-pointer flex-grow">
                        ${option.label}
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="campo-formulario mb-4" data-field-id="${id}" data-field-type="radio">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    ${label}
                    ${required ? '<span class="text-red-500 ml-1">*</span>' : ''}
                </label>
                <div class="space-y-2">
                    ${radios}
                </div>
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
window.RadioComponent = RadioComponent;