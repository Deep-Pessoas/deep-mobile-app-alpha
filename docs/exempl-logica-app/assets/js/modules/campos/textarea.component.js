/**
 * Componente para área de texto
 */
const TextareaComponent = (function() {
    /**
     * Renderiza área de texto
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, placeholder, required, rows = 4, defaultValue = '' } = config;
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="textarea">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <textarea 
                    id="${id}" 
                    name="${config.name || id}"
                    rows="${rows}"
                    class="form-input"
                    placeholder="${placeholder || ''}"
                    ${required ? 'required' : ''}
                >${defaultValue}</textarea>
                ${placeholder ? `<p class="form-helper">${placeholder}</p>` : ''}
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
window.TextareaComponent = TextareaComponent;
