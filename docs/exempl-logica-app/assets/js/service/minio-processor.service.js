const MinioProcessorService = (function() {
    const BASE_URL = window.DEEP_FORMS_BASE_URL || '';

    let uploadedFiles = {};

    /**
     * Comprime imagem no cliente antes de enviar
     * @param {File} file - Arquivo de imagem original
     * @returns {Promise<Blob>} - Imagem comprimida
     */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            // Apenas para imagens
            if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Calcular novas dimensões (max 1200px)
                    const maxDimension = 3000;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    // Criar canvas e comprimir
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // Fundo branco para garantir compatibilidade
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Sempre converter para JPEG (melhor compressão para fotos)
                    canvas.toBlob(function(blob) {
                        if (blob) {
                            console.log(`[minio-processor] Compressão: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`);
                            resolve(blob);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = () => resolve(file);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Faz upload do arquivo localmente
     */
    function uploadLocal(file, retryCount = 0, onProgress = null) {
        return new Promise(async (resolve, reject) => {
            // Timeout de segurança para evitar travamentos
            const uploadTimeout = setTimeout(() => {
                reject(new Error('Upload timeout - operação demorou muito'));
            }, 60000); // 1 minuto
            
            if (!file) {
                reject({ success: false, error: 'Nenhum arquivo fornecido' });
                return;
            }

            // Comprimir imagem antes de enviar
            let fileToUpload = file;
            try {
                if (file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
                    if (onProgress) onProgress(0, 'compress');
                    fileToUpload = await compressImage(file);
                    // Ajustar nome do arquivo e extensão (sempre vira .jpg após compressão)
                    if (fileToUpload instanceof Blob && !(fileToUpload instanceof File)) {
                        let newName = file.name.replace(/\.(png|gif|jpeg|jpg)$/i, '.jpg');
                        fileToUpload = new File([fileToUpload], newName, { type: 'image/jpeg' });
                    }
                }
            } catch (e) {
                console.warn('[minio-processor] Falha na compressão, enviando original:', e);
                fileToUpload = file;
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);
            
            // Adiciona flag para não otimizar PDFs
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            formData.append('skipOptimization', isPdf ? '1' : '0');

            const xhr = new XMLHttpRequest();
            
            // Evento de progresso de upload (real)
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    onProgress(percentComplete, 'upload');
                }
            });
            
            // Sucesso
            xhr.addEventListener('load', function() {
                clearTimeout(uploadTimeout);
                if (xhr.status >= 200 && xhr.status < 300) {
                    
                    let response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.error('[minio-processor] Falha ao parsear JSON:', e, 'Response:', xhr.responseText);
                        reject({ 
                            success: false, 
                            error: `Resposta inválida do servidor. Parse error: ${e.message}` 
                        });
                        return;
                    }
                    
                    if (!response || typeof response !== 'object') {
                        console.error('[minio-processor] Resposta não é um objeto:', response);
                        reject({ 
                            success: false, 
                            error: 'Resposta não é objeto válido'
                        });
                        return;
                    }
                    
                    if (!response.success) {
                        console.error('[minio-processor] Upload falhou:', response);
                        reject({ 
                            success: false, 
                            error: response.error || 'Erro desconhecido ao fazer upload'
                        });
                        return;
                    }
                    
                    console.log('[minio-processor] Upload bem-sucedido:', response.url);
                    resolve(response);
                } else {
                    // Erro HTTP
                    let msg = '';
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        msg = resp.error || JSON.stringify(resp);
                    } catch (e) {
                        msg = xhr.responseText.substring(0, 200) || `Erro HTTP ${xhr.status}: ${xhr.statusText}`;
                    }
                    
                    console.error('[minio-processor] Erro HTTP:', xhr.status, msg);
                    reject({ success: false, error: msg });
                }
            });
            
            // Erro de rede
            xhr.addEventListener('error', function() {
                clearTimeout(uploadTimeout);
                console.error('[minio-processor] Erro de rede:', { retry: retryCount });
                
                // Retry automático
                if (retryCount < 2) {
                    console.log(`🔄 Tentando novamente (${retryCount + 1}/2)...`);
                    setTimeout(() => {
                        uploadLocal(file, retryCount + 1, onProgress).then(resolve).catch(reject);
                    }, 1000 * (retryCount + 1));
                    return;
                }
                
                reject({ success: false, error: 'Sem conexão com servidor. Verifique sua internet.' });
            });
            
            // Timeout
            xhr.addEventListener('timeout', function() {
                console.error('[minio-processor] Timeout:', { retry: retryCount });
                
                // Retry automático
                if (retryCount < 2) {
                    console.log(`🔄 Tentando novamente (${retryCount + 1}/2)...`);
                    setTimeout(() => {
                        uploadLocal(file, retryCount + 1, onProgress).then(resolve).catch(reject);
                    }, 1000 * (retryCount + 1));
                    return;
                }
                
                reject({ success: false, error: 'Tempo esgotado. Arquivo muito grande ou conexão lenta.' });
            });
            
            // Configurar e enviar
            xhr.open('POST', BASE_URL + '/service/upload.php');
            xhr.timeout = 120000; // 2 minutos
            xhr.send(formData);
        });
    }

    /**
     * Limpa arquivos temporários
     */
    function cleanupUploads(urls) {
        if (!urls?.length) {
            return Promise.resolve({
                success: true,
                message: "Nenhuma URL para limpar"
            });
        }

    // Use absolute URL as requested
    return fetch(BASE_URL + 'service/cleanup-uploads.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
        }).then(response => response.json());
    }

    function storeUploadedFiles(fieldId, files) {
        uploadedFiles[fieldId] = files;
    }

    function getUploadedFiles(fieldId) {
        return uploadedFiles[fieldId] || [];
    }

    // API pública
    return {
        uploadLocal,
        cleanupUploads,
        storeUploadedFiles,
        getUploadedFiles
    };
})();

window.MinioProcessorService = MinioProcessorService;