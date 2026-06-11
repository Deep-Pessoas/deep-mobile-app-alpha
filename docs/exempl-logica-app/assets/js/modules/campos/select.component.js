/**
 * Componente para campo de seleção
 */
const SelectComponent = (function() {
    /**
     * Renderiza lista de seleção (select)
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, placeholder, options = [], required, defaultValue = '' } = config;
        
        const optionsHtml = options.map(option => {
            const selected = option.value === defaultValue ? 'selected' : '';
            return `<option value="${option.value}" ${selected}>${option.label}</option>`;
        }).join('');
        
        // Script para garantir que eventos de mudança disparem as condições
        const initScript = `
            <script>
                $(function() {
                    $("#${id}").on('change', function() {
                        if (typeof CondicoesService !== 'undefined') {
                            CondicoesService.avaliarTodasCondicoes();
                        }
                    });
                });
            </script>
        `;
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="select">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <div class="select-container">
                    <select 
                        id="${id}" 
                        name="${config.name || id}"
                        class="select-styled"
                        ${required ? 'required' : ''}
                    >
                        ${placeholder ? `<option value="" disabled ${!defaultValue ? 'selected' : ''}>${placeholder}</option>` : ''}
                        ${optionsHtml}
                    </select>
                    <div class="select-arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </div>
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
window.SelectComponent = SelectComponent;
