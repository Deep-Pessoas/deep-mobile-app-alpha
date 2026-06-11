/**
 * Componente para título do formulário
 */
const TitleComponent = (function() {
    /**
     * Renderiza título
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { titleText, description = '' } = config;
        
        return `
            <div class="campo-formulario mb-8 mt-8" data-field-id="${id}" data-field-type="title">
                <h2 class="text-lg font-bold text-gray-800 border-l-2 border-primary pl-3">${titleText}</h2>
                ${description ? `<p class="text-sm text-gray-600 mt-2 pl-3">${description}</p>` : ''}
            </div>
        `;
    }
    
    // API pública do módulo
    return {
        renderizar
    };
})();

// Exportação do módulo
window.TitleComponent = TitleComponent;

// Não altere design, apenas mantenha o controle de required/disabled/hidden centralizado
