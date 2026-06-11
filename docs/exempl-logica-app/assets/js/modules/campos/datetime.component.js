/**
 * Componente para campo de data/hora
 */
const DatetimeComponent = (function() {
    /**
     * Renderiza campo de data/hora
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, required, dateType = 'date', defaultValue = '' } = config;
        
        let type = 'date';
        if (dateType === 'time') type = 'time';
        else if (dateType === 'datetime') type = 'datetime-local';
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="datetime">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <input 
                    type="${type}" 
                    id="${id}" 
                    name="${config.name || id}"
                    class="form-input"
                    value="${defaultValue}"
                    ${required ? 'required' : ''}
                >
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>
            </div>
        `;
    }
    
    // API pública do módulo
    return {
        renderizar
    };
})();

// Exportação do módulo
window.DatetimeComponent = DatetimeComponent;
