/**
 * Serviço principal que centraliza a inicialização e integração de todos os módulos do sistema
 */
const MainService = (function() {
    let initialized = false;

    /**
     * Inicializa todos os componentes e serviços necessários
     */
    function inicializar() {
        if (initialized) {
            return;
        }
        initialized = true;

        // Verificar se todos os módulos foram carregados corretamente
        verificarModulosCarregados();

        // Inicializar serviços de UI globais
        registrarHandlersGlobais();

        // Inicializar FormularioController se o código estiver disponível
        // Primeiro verificar window.codigoFormulario, depois tentar obter da URL
        let codigo = window.codigoFormulario;
        
        // Se não estiver definido, tentar obter da URL
        if (!codigo) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                codigo = urlParams.get('c');
            } catch (e) {
                console.warn('Não foi possível ler parâmetros da URL:', e);
            }
        }
        
        if (codigo) {
            FormularioController.inicializar(codigo);
        } else {
            console.error('Código do formulário não definido!');
            if (typeof UiService !== 'undefined') {
                UiService.exibirErro('Código do formulário não definido. Por favor, forneça um código na URL (?c=CODIGO).');
            }
        }
    }

    /**
     * Verifica se todos os módulos necessários foram carregados
     */
    function verificarModulosCarregados() {
        const modulos = [
            // Serviços
            'CondicoesService',
            'ValidacaoService',
            'UiService',

            // Componentes
            'TextoComponent',
            'NumeroComponent',
            'TextareaComponent',
            'SelectComponent',
            'RadioComponent',
            'CheckboxComponent',
            'DatetimeComponent',
            'UploadComponent',
            'SignatureComponent',
            'GroupComponent',
            'TitleComponent',
            'DividerComponent',

            // Controlador
            'FormularioController'
        ];

        const modulosNaoCarregados = modulos.filter(modulo => {
            return typeof window[modulo] === 'undefined';
        });

        if (modulosNaoCarregados.length > 0) {
            console.error('Os seguintes módulos não foram carregados:', modulosNaoCarregados);
            alert('Erro ao inicializar aplicação: Alguns módulos não foram carregados corretamente.');
        }
    }

    /**
     * Registra handlers globais para elementos da UI
     */
    function registrarHandlersGlobais() {
        // Handler para fechar mensagens
        $(document).on('click', '.fechar-mensagem', function() {
            $(this).closest('.mensagem').fadeOut('fast', function() {
                $(this).remove();
            });
        });

        // Outros handlers globais podem ser adicionados aqui
    }

    // API pública do módulo
    return {
        inicializar
    };
})();

// Garantir exportação global
window.MainService = MainService;

// Inicializar o serviço principal quando o documento estiver pronto
$(document).ready(function() {
    MainService.inicializar();
});