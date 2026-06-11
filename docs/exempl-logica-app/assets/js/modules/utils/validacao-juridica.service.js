/**
 * Serviço de Validação Jurídica via OTP por SMS
 *
 * Fluxo quando validacao_juridica: true:
 *   1. coletarDados()    → abre modal, coleta foto (câmera) + telefone
 *   2. Controller faz    → POST form com validacao_juridica: { foto, telefone }
 *   3. mostrarOTP()      → abre modal passo 3, usuário digita código SMS
 *   4. POST /api/validacao/validar-otp → código 200 → onConcluido() → redirect
 */
const ValidacaoJuridicaService = (function () {

    // Estado interno
    let _registroCampo = null;
    let _telefone      = null;
    let _fotoBase64    = null;
    let _mediaStream   = null;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _apiBase() {
        return (window.DEEP_FORMS_CONFIG && window.DEEP_FORMS_CONFIG.API_GESTAO_URL) || '';
    }

    function _exibirErro(msg) {
        $('#deepOtpModal #otpErro').removeClass('hidden').text(msg);
    }

    function _limparErro() {
        $('#deepOtpModal #otpErro').addClass('hidden').text('');
    }

    function _exibirInfo(msg) {
        const $info = $('#deepOtpModal #otpInfo');
        $info.text(msg).removeClass('hidden');
        setTimeout(() => $info.addClass('hidden').text(''), 4000);
    }

    /**
     * Atualiza a barra de progresso e o indicador de passo.
     * @param {number} passo - 1, 2 ou 3
     */
    function _irParaPasso(passo) {
        _limparErro();
        $('#deepOtpModal #otpPasso1').toggleClass('hidden', passo !== 1);
        $('#deepOtpModal #otpPasso2').toggleClass('hidden', passo !== 2);
        $('#deepOtpModal #otpPasso3').toggleClass('hidden', passo !== 3);
        $('#deepOtpModal #otpPassoIndicador').text(passo + ' / 3');
        $('#deepOtpModal .otp-step-bar').each(function () {
            const s = parseInt($(this).data('step'), 10);
            $(this).toggleClass('opacity-40', s > passo);
        });
    }

    // ─── Câmera ───────────────────────────────────────────────────────────────

    function _pararCamera() {
        if (_mediaStream) {
            _mediaStream.getTracks().forEach(t => t.stop());
            _mediaStream = null;
        }
    }

    async function _iniciarCamera() {
        _pararCamera();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Câmera não suportada neste dispositivo ou navegador.');
        }

        const video = document.getElementById('otpCameraVideo');
        _mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = _mediaStream;
        await video.play();
    }

    /**
     * Captura um frame do vídeo, redimensiona e retorna como JPEG base64.
     * @returns {string}
     */
    function _capturarFoto() {
        const video  = document.getElementById('otpCameraVideo');
        const canvas = document.getElementById('otpCameraCanvas');
        const MAX_W  = 800;
        let w = video.videoWidth  || 640;
        let h = video.videoHeight || 480;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.82);
    }

    // ─── Requisições à API ───────────────────────────────────────────────────

    /**
     * POST /api/validacao/validar-otp
     * @param {string} registroId
     * @param {string} codigo
     */
    async function _validarOTP(registroId, codigo) {
        const res = await fetch(`${_apiBase()}/validacao/validar-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ registro_id: registroId, codigo: codigo })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.mensagem || 'Código inválido ou expirado. Tente novamente.');
        }
        return json;
    }

    /**
     * POST /validacao/enviar-otp — usado pelo botão Reenviar no Passo 3.
     */
    async function _reenviarOTP() {
        const res = await fetch(`${_apiBase()}/validacao/enviar-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ registro_campo: _registroCampo, telefone: _telefone })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.mensagem || `Falha ao reenviar o código (${res.status})`);
        }
        return json;
    }

    // ─── API pública ─────────────────────────────────────────────────────────

    /**
     * PASSO 1 + 2 — Abre o modal para coletar foto e telefone.
     * Chama onDadosColetados({ foto: base64, telefone }) quando o usuário confirma.
     *
     * @param {Function} onDadosColetados
     */
    async function coletarDados(onDadosColetados) {
        const $modal = $('#deepOtpModal');
        if (!$modal.length) {
            console.error('[ValidacaoJuridicaService] #deepOtpModal não encontrado no DOM.');
            return;
        }

        // Resetar estado visual
        _fotoBase64 = null;
        $modal.find('#otpFotoPreview').addClass('hidden').attr('src', '');
        $modal.find('#otpCameraVideo').removeClass('hidden');
        $modal.find('#otpCameraLoading').removeClass('hidden');
        $modal.find('#otpBtnCapturar').prop('disabled', true);
        $modal.find('#otpBotoesCamera').removeClass('hidden');
        $modal.find('#otpBotoesAposCaptura').addClass('hidden');
        $modal.find('#otpTelefoneInput').val('');
        _limparErro();

        _irParaPasso(1);
        $modal.removeClass('hidden');

        // Iniciar câmera
        try {
            await _iniciarCamera();
            $modal.find('#otpCameraLoading').addClass('hidden');
            $modal.find('#otpBtnCapturar').prop('disabled', false);
        } catch (err) {
            $modal.find('#otpCameraLoading').addClass('hidden');
            _exibirErro('Não foi possível acessar a câmera: ' + err.message);
        }

        // ── "Tirar foto" ──────────────────────────────────────────────────────
        $modal.find('#otpBtnCapturar').off('click.otp').on('click.otp', function () {
            _fotoBase64 = _capturarFoto();
            _pararCamera();

            $modal.find('#otpCameraVideo').addClass('hidden');
            $modal.find('#otpFotoPreview').attr('src', _fotoBase64).removeClass('hidden');
            $modal.find('#otpBotoesCamera').addClass('hidden');
            $modal.find('#otpBotoesAposCaptura').removeClass('hidden');
            _limparErro();
        });

        // ── "Tirar novamente" ─────────────────────────────────────────────────
        $modal.find('#otpBtnRefazer').off('click.otp').on('click.otp', async function () {
            _fotoBase64 = null;
            $modal.find('#otpFotoPreview').addClass('hidden').attr('src', '');
            $modal.find('#otpCameraVideo').removeClass('hidden');
            $modal.find('#otpCameraLoading').removeClass('hidden');
            $modal.find('#otpBtnCapturar').prop('disabled', true);
            $modal.find('#otpBotoesAposCaptura').addClass('hidden');
            $modal.find('#otpBotoesCamera').removeClass('hidden');
            _limparErro();

            try {
                await _iniciarCamera();
                $modal.find('#otpCameraLoading').addClass('hidden');
                $modal.find('#otpBtnCapturar').prop('disabled', false);
            } catch (err) {
                $modal.find('#otpCameraLoading').addClass('hidden');
                _exibirErro('Não foi possível acessar a câmera: ' + err.message);
            }
        });

        // ── "Usar esta foto" → avança para passo 2 ───────────────────────────
        $modal.find('#otpBtnUsarFoto').off('click.otp').on('click.otp', function () {
            _irParaPasso(2);
            setTimeout(() => $modal.find('#otpTelefoneInput').trigger('focus'), 100);
        });

        // ── "Voltar" (passo 2 → passo 1) ─────────────────────────────────────
        $modal.find('#otpBtnVoltarCamera').off('click.otp').on('click.otp', async function () {
            $modal.find('#otpFotoPreview').addClass('hidden').attr('src', '');
            $modal.find('#otpCameraVideo').removeClass('hidden');
            $modal.find('#otpCameraLoading').removeClass('hidden');
            $modal.find('#otpBtnCapturar').prop('disabled', true);
            $modal.find('#otpBotoesAposCaptura').addClass('hidden');
            $modal.find('#otpBotoesCamera').removeClass('hidden');
            _fotoBase64 = null;

            _irParaPasso(1);

            try {
                await _iniciarCamera();
                $modal.find('#otpCameraLoading').addClass('hidden');
                $modal.find('#otpBtnCapturar').prop('disabled', false);
            } catch (err) {
                $modal.find('#otpCameraLoading').addClass('hidden');
                _exibirErro('Não foi possível acessar a câmera: ' + err.message);
            }
        });

        // ── Enter no campo de telefone ────────────────────────────────────────
        $modal.find('#otpTelefoneInput').off('keydown.otp').on('keydown.otp', function (e) {
            if (e.key === 'Enter') $modal.find('#otpBtnConfirmar').trigger('click');
        });

        // ── "Confirmar e enviar" — fecha modal e entrega dados ao controller ──
        $modal.find('#otpBtnConfirmar').off('click.otp').on('click.otp', function () {
            const telefone = $modal.find('#otpTelefoneInput').val().trim();

            if (!telefone) {
                _exibirErro('Por favor, informe o número de celular.');
                return;
            }
            if (!_fotoBase64) {
                _irParaPasso(1);
                _exibirErro('É necessário tirar uma foto antes de continuar.');
                return;
            }

            _limparErro();
            _telefone = telefone;

            // Fechar modal temporariamente (o controller vai reabrir no passo 3)
            $modal.addClass('hidden');
            _pararCamera();

            onDadosColetados({ foto: _fotoBase64, telefone: telefone });
        });
    }

    /**
     * PASSO 3 — Exibe o campo de código OTP após o POST ser feito com sucesso.
     * Chama onConcluido() quando o código for validado com sucesso.
     *
     * @param {string}   registroCampo - registro_campo retornado pelo POST
     * @param {Function} onConcluido
     */
    function mostrarOTP(registroCampo, onConcluido) {
        _registroCampo = registroCampo;

        const $modal = $('#deepOtpModal');
        if (!$modal.length) {
            console.error('[ValidacaoJuridicaService] #deepOtpModal não encontrado no DOM.');
            onConcluido();
            return;
        }

        $modal.find('#otpCodigoInput').val('');
        $modal.find('#otpTelefoneExibido').text(_telefone || '');
        _limparErro();

        _irParaPasso(3);
        $modal.removeClass('hidden');
        setTimeout(() => $modal.find('#otpCodigoInput').trigger('focus'), 100);

        // ── "Verificar código" ────────────────────────────────────────────────
        $modal.find('#otpBtnVerificar').off('click.otp').on('click.otp', async function () {
            const codigo = $modal.find('#otpCodigoInput').val().trim();
            if (!codigo) { _exibirErro('Informe o código recebido por SMS.'); return; }

            _limparErro();
            const $btn = $(this);
            $btn.prop('disabled', true).text('Verificando...');

            try {
                await _validarOTP(_registroCampo, codigo);
                $modal.addClass('hidden');
                onConcluido();
            } catch (err) {
                _exibirErro(err.message || 'Código inválido. Tente novamente.');
                $btn.prop('disabled', false).text('Verificar código');
                $modal.find('#otpCodigoInput').val('').trigger('focus');
            }
        });

        // Enter no campo do código
        $modal.find('#otpCodigoInput').off('keydown.otp').on('keydown.otp', function (e) {
            if (e.key === 'Enter') {
                $modal.find('#otpBtnVerificar').trigger('click');
                return;
            }
            const permitidos = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
            if (!permitidos.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
        });

        // ── "Reenviar" ────────────────────────────────────────────────────────
        $modal.find('#otpBtnReenviar').off('click.otp').on('click.otp', async function () {
            _limparErro();
            const $btn = $(this);
            $btn.prop('disabled', true).text('Reenviando...');

            try {
                await _reenviarOTP();
                $modal.find('#otpCodigoInput').val('').trigger('focus');
                _exibirInfo('Novo código enviado com sucesso!');
            } catch (err) {
                _exibirErro('Falha ao reenviar: ' + (err.message || 'Erro desconhecido'));
            } finally {
                $btn.prop('disabled', false).text('Não recebi o código — Reenviar');
            }
        });
    }

    return { coletarDados, mostrarOTP };

})();

window.ValidacaoJuridicaService = ValidacaoJuridicaService;

