/**
 * Componente para campo de múltiplas capturas de localização
 */
const MultCapturasComponent = (function() {
    /**
     * Renderiza campo de múltiplas capturas
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, required, capturas = [] } = config;
        
        const capturasHtml = capturas.map((captura, index) => `
            <div class="captura-item mb-4 p-3 border rounded" data-captura-id="${captura.id}">
                <div class="mb-2">
                    <span class="font-medium text-gray-700">${captura.label}</span>
                </div>
                <button type="button" class="captura-btn w-full py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors" 
                        onclick="MultCapturasComponent.capturarLocalizacao('${id}', '${captura.id}')">
                    Capturar
                </button>
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div class="latitude-display bg-gray-50 p-2 rounded text-sm text-gray-600 min-h-[36px] flex items-center justify-center">
                        <span id="${captura.id}_latitude">--</span>
                    </div>
                    <div class="longitude-display bg-gray-50 p-2 rounded text-sm text-gray-600 min-h-[36px] flex items-center justify-center">
                        <span id="${captura.id}_longitude">--</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="mult_capturas">
                <label class="form-label block text-sm font-medium text-gray-700 mb-2">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <div class="capturas-container">
                    ${capturasHtml}
                </div>
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>
            </div>
        `;
    }
    
    /**
     * Captura a localização do usuário
     * @param {string} campoId - ID do campo
     * @param {string} capturaId - ID da captura específica
     */
    function capturarLocalizacao(campoId, capturaId) {
        // Tornar a função globalmente acessível
        window.MultCapturasComponent = window.MultCapturasComponent || MultCapturasComponent;
        
        const container = document.querySelector(`[data-captura-id="${capturaId}"]`);
        const btn = container.querySelector('.captura-btn');
        const latDisplay = document.getElementById(`${capturaId}_latitude`);
        const lonDisplay = document.getElementById(`${capturaId}_longitude`);
        
        // Verificar se a geolocalização é suportada
        if (!navigator.geolocation) {
            alert('Geolocalização não é suportada neste navegador.');
            return;
        }
        
        // Atualizar UI para indicar que está carregando
        btn.textContent = 'Capturando...';
        btn.classList.remove('bg-gray-100', 'hover:bg-gray-200');
        btn.classList.add('bg-yellow-100');
        
        // Limpar valores anteriores
        latDisplay.textContent = '--';
        lonDisplay.textContent = '--';
        
        // Forçar uma nova captura, ignorando cache
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // Atualizar displays
                latDisplay.textContent = latitude.toFixed(6);
                lonDisplay.textContent = longitude.toFixed(6);
                
                // Atualizar botão para permitir recaptura
                btn.textContent = 'Refazer';
                btn.classList.remove('bg-yellow-100');
                btn.classList.add('bg-green-100', 'text-green-800');
            },
            function(error) {
                console.error('Erro ao obter localização:', error);
                let errorMsg = 'Erro na captura. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Permissão negada.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Localização indisponível.';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Tempo limite excedido.';
                        break;
                    default:
                        errorMsg += 'Erro desconhecido.';
                        break;
                }
                
                alert(errorMsg);
                
                // Resetar botão
                btn.textContent = 'Tentar novamente';
                btn.classList.remove('bg-yellow-100');
                btn.classList.add('bg-red-100', 'text-red-800');
                
                // Mostrar erro nos displays
                latDisplay.textContent = 'Erro';
                lonDisplay.textContent = 'Erro';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    /**
     * Obtém os valores capturados do campo
     * @param {string} campoId - ID do campo
     * @returns {Array} Array com os valores capturados
     */
    function obterValores(campoId) {
        const campoEl = document.querySelector(`.campo-formulario[data-field-id="${campoId}"]`);
        if (!campoEl) return [];
        
        const capturas = [];
        const capturaItems = campoEl.querySelectorAll('.captura-item');
        
        capturaItems.forEach(item => {
            const capturaId = item.dataset.capturaId;
            const latDisplay = document.getElementById(`${capturaId}_latitude`);
            const lonDisplay = document.getElementById(`${capturaId}_longitude`);
            const label = item.querySelector('.mb-2 span').textContent;
            
            // Verificar se os valores são válidos (não são placeholders ou erros)
            const latValue = latDisplay.textContent;
            const lonValue = lonDisplay.textContent;
            
            if (latValue && lonValue && 
                latValue !== '--' && 
                lonValue !== '--' &&
                latValue !== 'Erro' && 
                lonValue !== 'Erro') {
                capturas.push({
                    id: capturaId,
                    label: label,
                    latitude: latValue,
                    longitude: lonValue
                });
            }
        });
        
        return capturas;
    }
    
    // API pública do módulo
    return {
        renderizar,
        capturarLocalizacao,
        obterValores
    };
})();

// Exportação do módulo
window.MultCapturasComponent = MultCapturasComponent;