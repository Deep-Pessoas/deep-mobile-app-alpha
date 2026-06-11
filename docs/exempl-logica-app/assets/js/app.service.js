/**
 * Arquivo principal que carrega todos os scripts do sistema
 */
(function() {
    // Verificar se já foi inicializado para evitar carregamento duplicado
    if (window.DeepFormsInitialized) {
        return;
    }
    
    // Marcar sistema como iniciado
    window.DeepFormsInitialized = true;
    
    // Flags antes usados para alerta de saída; mantidos apenas para compatibilidade
    window.DeepFormsHasUnsavedChanges = false;
    window.DeepFormsUploadInProgress = false;

    const BASE_URL = window.DEEP_FORMS_CONFIG.BASE_URL;
    const VERSION  = window.DEEP_FORMS_VERSION;

    // Função para adicionar versão aos scripts
    function getVersionedUrl(url) {
        return url + '?v=' + VERSION;
    }

    // Lista de todos os scripts necessários na ordem correta de carregamento
    const scripts = [
        // Utilitários essenciais primeiro
        getVersionedUrl(BASE_URL + '/assets/vendor/json-logic.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/ui.service.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/required-handler.service.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/validacao.service.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/condicoes.service.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/validacao-juridica.service.js'),

        // Serviços de API
        getVersionedUrl(BASE_URL + '/assets/js/service/minio-processor.service.js'),

        // Componentes de campos
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/texto.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/numero.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/textarea.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/select.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/radio.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/checkbox.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/datetime.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/upload.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/signature.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/group.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/title.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/divider.component.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/campos/mult_capturas.component.js'),
        
        // Debug tools
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/debug-form.service.js'),
        getVersionedUrl(BASE_URL + '/assets/js/modules/utils/debug-tool.js'),

        // Controlador de formulário 
        getVersionedUrl(BASE_URL + '/assets/js/formulario.controller.js'),

        // Serviço principal que inicializa todos os módulos
        getVersionedUrl(BASE_URL + '/assets/js/main.service.js')
    ];

    // Array para rastrear scripts carregados
    const loadedScripts = [];
    
    // Verificar se scripts já estão carregados
    function verificarScriptsCarregados() {
        return scripts.every(script => {
            const moduleName = script.split('/').pop().replace('.js', '');
            // Converter para PascalCase
            const componentName = moduleName.split('.')[0]
                .replace(/(^|[-_])(\w)/g, (_, __, c) => c ? c.toUpperCase() : '')
                .replace(/(component|service)$/, 'Component');
                
            // Tratamento especial para mult_capturas
            if (moduleName.includes('mult_capturas')) {
                return typeof window.MultCapturasComponent !== 'undefined';
            }
                
            return typeof window[componentName] !== 'undefined';
        });
    }

    // Função para carregar scripts sequencialmente
    function carregarScripts(index) {
        if (index >= scripts.length) {
            
            // Inicializar o serviço principal uma única vez
            if (typeof MainService !== 'undefined') {
                MainService.inicializar();
            }
            
            return;
        }

        // Verificar se o script já foi carregado
        const scriptSrc = scripts[index];
        const alreadyLoaded = document.querySelector(`script[src="${scriptSrc}"]`);
        
        if (alreadyLoaded || loadedScripts.includes(scriptSrc)) {
            carregarScripts(index + 1);
            return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.onload = function() {
            loadedScripts.push(scriptSrc);
            
            // Verificar e exportar componentes específicos
            if (scriptSrc.includes('checkbox.component.js')) {
                if (typeof CheckboxComponent !== 'undefined' && !window.CheckboxComponent) {
                    window.CheckboxComponent = CheckboxComponent;
                }
            }
            
            // Exportar componente de múltiplas capturas
            if (scriptSrc.includes('mult_capturas.component.js')) {
                if (typeof MultCapturasComponent !== 'undefined' && !window.MultCapturasComponent) {
                    window.MultCapturasComponent = MultCapturasComponent;
                }
            }
            
            // Continuar carregamento
            carregarScripts(index + 1);
        };
        script.onerror = function() {
            console.error(`Erro ao carregar o script: ${scriptSrc}`);
            
            // Tentar recarregar uma vez em caso de erro
            setTimeout(() => {
                const retryScript = document.createElement('script');
                retryScript.src = scriptSrc + '&retry=1';
                retryScript.onload = function() {
                    loadedScripts.push(scriptSrc);
                    carregarScripts(index + 1);
                };
                retryScript.onerror = function() {
                    console.error(`Falha ao carregar script (tentativa 2): ${scriptSrc}`);
                    // Em vez de continuar, mostrar erro ao usuário
                    if (typeof UiService !== 'undefined') {
                        UiService.exibirErro(`Falha ao carregar componente: ${scriptSrc.split('/').pop()}. Recarregue a página.`);
                    } else {
                        alert(`Falha ao carregar componente: ${scriptSrc.split('/').pop()}. Recarregue a página.`);
                    }
                };
                if (document.body) {
                    document.body.appendChild(retryScript);
                } else {
                    document.addEventListener('DOMContentLoaded', function() {
                        document.body.appendChild(retryScript);
                    });
                }
            }, 500);
        };
        
        if (document.body) {
            document.body.appendChild(script);
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(script);
            });
        }
    }

    // Verificar scripts já carregados antes de iniciar
    if (verificarScriptsCarregados()) {
        if (typeof MainService !== 'undefined') {
            MainService.inicializar();
        } else if (window.MainService) {
            window.MainService.inicializar();
        }
    } else {
        // Inicia o carregamento dos scripts
        carregarScripts(0);
    }
})();