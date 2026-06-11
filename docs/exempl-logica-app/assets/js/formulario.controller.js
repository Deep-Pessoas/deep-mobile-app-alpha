/**
 * Controlador principal do sistema de formulários
 */
const FormularioController = (function() {
    // Dados do formulário atual
    let formularioAtual = null;
    // Rastreador de inicialização
    let inicializado = false;
    // Flag para controlar se uma requisição já está em andamento
    let requisicaoEmAndamento = false;

    /**
     * Inicializa o sistema
     * @param {string} codigoFormulario - Código do formulário a ser carregado
     */
    function inicializar(codigoFormulario) {
        // Evitar inicialização duplicada
        if (inicializado) {
            return;
        }

        inicializado = true;

        // Configurar handlers globais
        configurarHandlers();

        // Carregar formulário da API - apenas uma vez
        carregarFormulario(codigoFormulario);
    }

    /**
     * Aguarda carregamento dos serviços necessários
     * @param {Function} callback - Função a ser chamada quando serviços estiverem prontos
     */
    function esperarCarregamentoServicos(callback) {
        const verificarServicos = function() {
            if (typeof UiService !== 'undefined' &&
                typeof ValidacaoService !== 'undefined' &&
                typeof CondicoesService !== 'undefined') {
                callback();
            } else {
                setTimeout(verificarServicos, 100);
            }
        };

        verificarServicos();
    }

    /**
     * Configura handlers de eventos globais
     */
    function configurarHandlers() {
        $(document).on('submit', '#deepFormulario', function(e) {
            e.preventDefault();

            // Validar e enviar
            if (!window.RequiredHandlerService.validarTodosCampos()) {
                console.log('Validação falhou');
                return;
            }

            // Enviar formulário
            window.FormularioController.enviarFormulario();
        });
    }

    /**
     * Carrega o formulário pelo código
     * @param {string} codigo - Código do formulário
     */
    function carregarFormulario(codigo) {
        if (!codigo) {
            return;
        }

        // Verificar se uma requisição já está em andamento
        if (requisicaoEmAndamento) {
            return;
        }

        // Marcar que uma requisição está em andamento
        requisicaoEmAndamento = true;

        // Verificar se UiService está disponível
        if (typeof UiService === 'undefined') {
            $('#resultadoAPI').html(`
                <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r">
                    <div class="flex items-center mb-2">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 class="font-semibold">Erro de Sistema</h3>
                    </div>
                    <p class="mb-2">O serviço de interface não está disponível.</p>
                    <p class="text-sm mb-3">Isso pode indicar um problema no carregamento dos scripts do sistema.</p>
                    <button type="button" class="px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300" onclick="location.reload()">
                        Recarregar página
                    </button>
                </div>
            `);
            requisicaoEmAndamento = false;
            return;
        }

        UiService.exibirCarregando('Carregando dados do formulário...');

        // Remover cache buster - não vamos usar nunca
        window.DeepFormsApiConfig.getFormulario(codigo)
            .then(response => {
                if (response.data) {
                    formularioAtual = response.data;
                    renderizarFormulario(formularioAtual);
                } else {
                    // Em vez de recarregar, mostrar mensagem de erro adequada
                    UiService.exibirErro('Formulário não encontrado. Verifique o código e tente novamente.');
                }
            })
            .catch(error => {
                // Em vez de recarregar, mostrar mensagem de erro adequada
                UiService.exibirErro('Erro ao carregar formulário: ' + (error.message || 'Erro desconhecido'));
            })
            .finally(() => {
                // Independente do resultado, marcar que a requisição terminou
                requisicaoEmAndamento = false;
            });
    }

    /**
     * Renderiza o formulário na tela
     * @param {Object} formulario - Dados do formulário
     */
    function renderizarFormulario(formulario) {
        // Obter os campos do formulário PRIMEIRO
        const campos = formulario.json?.campos || [];

        // IMPORTANTE: Inicializar CondicoesService APÓS ter os campos
        if (typeof CondicoesService !== 'undefined') {
            CondicoesService.inicializar(campos);
        }

        // Construir HTML do formulário
        let html = `
            <div class="p-6">
                <h2 class="text-xl font-bold mb-6 pb-3 border-b border-gray-200">${formulario.nome}</h2>
                <p class="text-gray-600 mb-8">Preencha os campos solicitados para continuar.</p>

                <form id="deepFormulario" class="space-y-6" novalidate>
                    ${campos.map(campo => renderizarCampo(campo)).join('')}

                    <div class="pt-6 mt-8 border-t border-gray-200">
                        <button type="submit" class="btn btn-primary">
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Inserir HTML na página
        $('#resultadoAPI').html(html);

        // Inicializar campos especiais
        inicializarCamposEspeciais(campos);

        // Forçar reavaliação após renderização
        setTimeout(() => {
            if (typeof CondicoesService !== 'undefined') {
                CondicoesService.avaliarTodasCondicoes();
            }
        }, 100);
    }

    /**
     * Renderiza um campo específico do formulário
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizarCampo(campo) {
        if (!campo || !campo.type) {
            return '';
        }

        // Campos com visibility:false são completamente ignorados
        if (campo.visibility === false || campo.config?.visibility === false) {
            return '';
        }

        const tipo = campo.type.toLowerCase();

        try {
            // Verificar diferentes variações de nomes de componentes
            switch (tipo) {
                case 'text':
                    if (typeof TextoComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de texto não carregado</div>`;
                    }
                    return TextoComponent.renderizar(campo);

                case 'number':
                    if (typeof NumeroComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente numérico não carregado</div>`;
                    }
                    return NumeroComponent.renderizar(campo);

                case 'textarea':
                    if (typeof TextareaComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de área de texto não carregado</div>`;
                    }
                    return TextareaComponent.renderizar(campo);

                case 'select':
                    if (typeof SelectComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de seleção não carregado</div>`;
                    }
                    return SelectComponent.renderizar(campo);

                case 'radio':
                    if (typeof window.RadioComponent !== 'undefined') {
                        return window.RadioComponent.renderizar(campo);
                    } else if (typeof RadioComponent !== 'undefined') {
                        return RadioComponent.renderizar(campo);
                    } else {
                        return `<div class="p-2 text-red-500">Erro ao carregar componente de opção única</div>`;
                    }

                case 'checkbox':
                    if (typeof window.CheckboxComponent !== 'undefined') {
                        return window.CheckboxComponent.renderizar(campo);
                    } else if (typeof CheckboxComponent !== 'undefined') {
                        return CheckboxComponent.renderizar(campo);
                    } else {
                        return `<div class="p-2 text-red-500">Erro ao carregar componente de múltipla escolha</div>`;
                    }

                case 'datetime':
                    if (typeof DatetimeComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de data/hora não carregado</div>`;
                    }
                    return DatetimeComponent.renderizar(campo);

                case 'upload':
                    if (typeof UploadComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de upload não carregado</div>`;
                    }
                    return UploadComponent.renderizar(campo);

                case 'signature':
                    if (typeof SignatureComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de assinatura não carregado</div>`;
                    }
                    return SignatureComponent.renderizar(campo);

                case 'group':
                    if (typeof GroupComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de grupo não carregado</div>`;
                    }
                    return GroupComponent.renderizar(campo, renderizarCampo);

                case 'title':
                    if (typeof TitleComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de título não carregado</div>`;
                    }
                    return TitleComponent.renderizar(campo);

                case 'divider':
                    if (typeof DividerComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de separador não carregado</div>`;
                    }
                    return DividerComponent.renderizar(campo);

                case 'mult_capturas':
                    if (typeof MultCapturasComponent === 'undefined') {
                        return `<div class="p-2 text-red-500">Erro: Componente de múltiplas capturas não carregado</div>`;
                    }
                    return MultCapturasComponent.renderizar(campo);

                default:
                    return `<div class="p-2 text-red-500">Tipo de campo não suportado: ${tipo}</div>`;
            }
        } catch (error) {
            return `<div class="p-2 text-red-500">Erro ao renderizar: ${error.message}</div>`;
        }
    }

    /**
     * Inicializa comportamentos especiais para certos tipos de campos
     * @param {Array} campos - Lista de campos do formulário
     */
    function inicializarCamposEspeciais(campos) {
        campos.forEach(campo => {
            const { id, type } = campo;

            // Inicializar baseado no tipo
            switch (type) {
                case 'upload':
                    if (typeof UploadComponent !== 'undefined' && UploadComponent.inicializar) {
                        UploadComponent.inicializar(id);
                    }
                    break;
                case 'signature':
                    if (typeof SignatureComponent !== 'undefined' && SignatureComponent.inicializar) {
                        SignatureComponent.inicializar(id);
                    }
                    break;
                case 'group':
                    if (typeof GroupComponent !== 'undefined' && GroupComponent.inicializar) {
                        GroupComponent.inicializar();
                    }
                    break;
                case 'radio':
                    // Adicionar event listener para mudanças em radio buttons para atualizar condições
                    $(`input[type="radio"][name="${id}"]`).on('change', function() {
                        if (typeof CondicoesService !== 'undefined') {
                            setTimeout(() => CondicoesService.avaliarTodasCondicoes(), 50);
                        }
                    });
                    break;
                case 'checkbox':
                    // Garantir que os eventos de checkbox sejam monitorados
                    $(`input[type="checkbox"][name="${id}[]"]`).on('change', function() {
                        if (typeof CondicoesService !== 'undefined') {
                            setTimeout(() => CondicoesService.avaliarTodasCondicoes(), 50);
                        }
                    });
                    break;
                case 'mult_capturas':
                    // Não há eventos especiais necessários para este tipo de campo
                    break;
            }

            // Inicializar recursivamente para grupos
            if (type === 'group' && campo.config && campo.config.children) {
                inicializarCamposEspeciais(campo.config.children);
            }
        });

        // Trigger para garantir que as condições sejam avaliadas após inicialização
        setTimeout(() => {
            $(document).trigger('condicoes:atualizar');
        }, 500);
    }

    /**
     * Envia o formulário.
     * @param {Object|null|undefined} dadosValidacao
     *   - undefined  → primeira chamada; verifica se precisa coletar foto+telefone antes
     *   - { foto, telefone } → dados já coletados; prossegue com o POST
     *   - null       → sem validação jurídica
     */
    async function enviarFormulario(dadosValidacao) {
        // ── Intercepção: coletar foto + telefone antes de submeter ────────────
        if (dadosValidacao === undefined) {
            if (formularioAtual && formularioAtual.validacao_juridica === true
                    && typeof ValidacaoJuridicaService !== 'undefined') {
                await ValidacaoJuridicaService.coletarDados(function (dados) {
                    window.FormularioController.enviarFormulario(dados);
                });
                return; // aguarda o callback acima chamar enviarFormulario novamente
            }
            dadosValidacao = null;
        }

        $('button[type="submit"]').prop('disabled', true).text('Enviando...');

        try {
            const { dados, uploads } = coletarDadosFormulario();

            // Formatar dados por tipo de campo
            const dadosFormatados = {};
            function encontrarCampo(campos, id) {
                for (const c of campos) {
                    if (c.id === id) return c;
                    if (c.type === 'group' && c.config?.children) {
                        const found = encontrarCampo(c.config.children, id);
                        if (found) return found;
                    }
                }
                return null;
            }
            Object.entries(dados).forEach(([fieldId, valor]) => {
                const campo = encontrarCampo(formularioAtual?.json?.campos || [], fieldId);
                if (!campo) return;
                switch (campo.type) {
                    case 'checkbox':
                        dadosFormatados[fieldId] = Array.isArray(valor) ? valor : [valor];
                        break;
                    case 'upload':
                        dadosFormatados[fieldId] = Array.isArray(valor)
                            ? valor.map(v => v ? v.split('/').pop().split('?')[0] : null).filter(Boolean)
                            : [];
                        break;
                    default:
                        dadosFormatados[fieldId] = valor;
                }
            });

            // Incluir dados de validação jurídica no body quando presentes
            const bodyValidacao = dadosValidacao ? { validacao_juridica: dadosValidacao } : {};

            const resposta = await window.DeepFormsApiConfig.enviarFormulario(
                formularioAtual.contrato_id,
                formularioAtual.guid,
                { ...dadosFormatados, uploads, ...bodyValidacao }
            );

            // Marcar como salvo para permitir navegação
            window.DeepFormsHasUnsavedChanges = false;
            window.DeepFormsUploadInProgress = false;

            // Callback de conclusão: exibe sucesso e redireciona
            const concluirEnvio = function () {
                UiService.exibirModalSucesso('Formulário Enviado!', 'Seus dados foram registrados com sucesso');
                UiService.limparFormulario('deepFormulario');

                if (window.DeepFormsApiConfig && window.DeepFormsApiConfig.redirectAfterSuccess) {
                    setTimeout(function () {
                        window.location.href = window.DeepFormsApiConfig.redirectAfterSuccess;
                    }, 1500);
                }
            };

            // Se houve validação jurídica → obrigatório validar OTP antes de redirecionar
            if (dadosValidacao && typeof ValidacaoJuridicaService !== 'undefined') {
                ValidacaoJuridicaService.mostrarOTP(resposta.registro_campo, concluirEnvio);
            } else {
                concluirEnvio();
            }
        } catch (error) {
            UiService.exibirMensagem(
                'Erro ao processar: ' + (error.message || 'Erro desconhecido'),
                'error'
            );
        } finally {
            $('button[type="submit"]').prop('disabled', false).text('Enviar');
        }
    }

    /**
     * Coleta os dados do formulário
     * @returns {Object} Dados do formulário
     */
    function coletarDadosFormulario() {
        const dados = {};
        const uploads = [];
        let camposEncontrados = 0;

        $('#deepFormulario .campo-formulario:not(.hidden)').each(function() {
            const $campo = $(this);
            const fieldId = $campo.data('field-id');
            const fieldType = $campo.data('field-type');

            if (!fieldId || ['title', 'divider', 'group'].includes(fieldType)) {
                return;
            }

            camposEncontrados++;
            let valor;

            if (fieldType === 'mult_capturas') {
                // Para campos de múltiplas capturas, obter os valores do componente
                if (typeof MultCapturasComponent !== 'undefined') {
                    valor = MultCapturasComponent.obterValores(fieldId);
                } else {
                    valor = [];
                }
            } else if (fieldType === 'upload') {
                const urlsStr = $campo.find('input[type="hidden"]').val();
                try {
                    const urls = JSON.parse(urlsStr || '[]');
                    if (urls.length > 0) {
                        // Adicionar URLs ao array de uploads
                        uploads.push({
                            field_id: fieldId,
                            urls: urls
                        });
                    }
                    valor = urls;
                } catch (e) {
                    valor = [];
                }
            } else {
                // ... lógica existente para outros tipos de campos ...
                switch (fieldType) {
                    case 'text':
                    case 'number':
                    case 'textarea':
                    case 'datetime':
                    case 'signature':
                        valor = $campo.find('input, textarea').val();
                        break;
                    case 'select':
                        valor = $campo.find('select').val();
                        break;
                    case 'radio':
                        valor = $campo.find('input[type="radio"]:checked').val();
                        break;
                    case 'checkbox':
                        valor = [];
                        $campo.find('input[type="checkbox"]:checked').each(function() {
                            valor.push($(this).val());
                        });
                        if (valor.length === 0) valor = null;
                        break;
                }
            }

            if (valor !== undefined && valor !== null && valor !== '') {
                dados[fieldId] = valor;
            }
        });

        return { dados, uploads };
    }

    /**
     * Verifica se todos os componentes estão carregados
     * @returns {boolean} Resultado da verificação
     */
    function verificarComponentesCarregados() {
        const componentes = [
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
            'MultCapturasComponent'
        ];

        const componentesFaltantes = componentes.filter(comp => typeof window[comp] === 'undefined');

        return componentesFaltantes.length === 0;
    }

    // API pública do módulo
    return {
        inicializar,
        carregarFormulario,
        enviarFormulario // Exportar enviarFormulario
    };
})();

window.FormularioController = FormularioController;