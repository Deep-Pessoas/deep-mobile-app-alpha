/**
 * Componente para campo de texto
 */
const TextoComponent = (function() {
    /**
     * Renderiza campo de texto
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, placeholder, required, defaultValue = '', reference = '' } = config;
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="text">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <input 
                    type="text" 
                    id="${id}" 
                    name="${config.name || id}"
                    class="form-input focus:ring-2 focus:ring-primary"
                    placeholder="${placeholder || ''}"
                    value="${defaultValue}"
                    ${required ? 'required' : ''}
                    ${reference ? `data-reference="${reference}"` : ''}
                >
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
window.TextoComponent = TextoComponent;
