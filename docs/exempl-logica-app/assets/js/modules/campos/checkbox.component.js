/**
 * Componente para campo de múltipla escolha (checkbox)
 */
const CheckboxComponent = (function() {
    /**
     * Renderiza opções de checkbox
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const options = config.options || [];
        const maxSelect = config.maxSelect || 0;

        const initScript = `
            <script>
                $(function() {
                    const $group = $('[data-field-id="${id}"]');
                    const maxSelect = ${maxSelect};
                    
                    function updateRequired() {
                        const $all = $group.find('input[type="checkbox"]');
                        const anyChecked = $all.is(':checked');
                        
                        // Só alterar required se o campo for obrigatório na configuração
                        if (${config.required}) {
                            $all.prop('required', false);
                            if (!anyChecked) {
                                $all.first().prop('required', true);
                            }
                        }
                    }

                    function handleCheckboxClick(optionCard) {
                        const input = optionCard.find('input[type="checkbox"]');
                        const currentChecked = input.prop('checked');
                        const totalChecked = $group.find('input[type="checkbox"]:checked').length;

                        // Se está tentando marcar além do limite e não é uma desmarcação
                        if (!currentChecked && maxSelect > 0 && totalChecked >= maxSelect) {
                            // Permitir desmarcar mesmo quando no limite
                            const previousChecked = $group.find('input[type="checkbox"]:checked');
                            previousChecked.prop('checked', false);
                            previousChecked.closest('.option-card').removeClass('selected');
                        }

                        // Se estiver tentando desmarcar com required e só tem 1
                        if (currentChecked && totalChecked <= 1 && ${config.required}) {
                            return false;
                        }

                        // Alternar estado
                        input.prop('checked', !currentChecked);
                        optionCard.toggleClass('selected');

                        updateRequired();

                        // Dispara evento change
                        input.trigger('change');
                    }

                    // Handler de click
                    $group.find('.option-card').on('click', function(e) {
                        e.preventDefault();
                        handleCheckboxClick($(this));
                    });

                    // Estado inicial dos checkboxes
                    $group.find('input[type="checkbox"]:checked').each(function() {
                        $(this).closest('.option-card').addClass('selected');
                    });

                    // Atualiza required ao iniciar e ao mudar
                    updateRequired();
                    $group.find('input[type="checkbox"]').on('change', updateRequired);
                });
            </script>
        `;

        const checkboxes = options.map((option, index) => `
            <div class="flex items-center p-3 bg-white border rounded-lg cursor-pointer transition-colors option-card">
                <input type="checkbox"
                    id="${id}_${index}"
                    name="${id}[]"
                    value="${option.value}"
                    class="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    ${config.required ? 'required' : ''}>
                <label for="${id}_${index}" class="ml-3 text-sm text-gray-700 cursor-pointer flex-grow">
                    ${option.label}
                </label>
            </div>
        `).join('');

        return `
            <div class="campo-formulario mb-4" data-field-id="${id}" data-field-type="checkbox">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    ${config.label}
                    ${config.required ? '<span class="text-red-500 ml-1">*</span>' : ''}
                    ${maxSelect > 0 ? `<span class="text-sm text-gray-500 ml-2">(Selecione até ${maxSelect})</span>` : ''}
                </label>
                <div class="space-y-2">
                    ${checkboxes}
                </div>
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>
                ${initScript}
            </div>
        `;
    }

    function inicializar(id) {
        // Listener para atualizar required quando algum checkbox é marcado
        const $checkboxes = $(`input[name="${id}[]"]`);
        $checkboxes.on('change', function() {
            const anyChecked = $checkboxes.is(':checked');
            const $group = $checkboxes.first().closest('.campo-formulario');
            const isRequired = $group.find('label').text().includes('*');
            
            // Só alterar required se o campo for obrigatório
            if (isRequired) {
                $checkboxes.prop('required', false);
                if (!anyChecked) {
                    $checkboxes.first().prop('required', true);
                }
            }
        });
    }

    return {
        renderizar,
        inicializar
    };
})();

window.CheckboxComponent = CheckboxComponent;