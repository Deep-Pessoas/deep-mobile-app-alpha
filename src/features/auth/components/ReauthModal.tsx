import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useAuthLayout } from '../utils/useAuthLayout';
import { formatCpf } from '../../../shared/utils/formatCpf';

/**
 * Modal exibido quando o servidor responde 401 ("Sessao nao encontrada ou expirada")
 * em qualquer requisicao autenticada. Pede a senha novamente, sem perder o que o
 * usuario estava fazendo: ao confirmar, o `apiClient` reusa o novo token e repete
 * automaticamente a requisicao que falhou.
 */
export function ReauthModal() {
  const { cancelReauth, isReauthLoading, isReauthVisible, reauthError, session, submitReauth } = useAuth();
  const { horizontalPadding, insets, modalWidth } = useAuthLayout();
  const [senha, setSenha] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isReauthVisible) {
      setSenha('');
    }
  }, [isReauthVisible]);

  const handleSubmit = () => {
    if (isReauthLoading || !senha) return;
    submitReauth(senha);
  };

  return (
    <Modal animationType="fade" onRequestClose={cancelReauth} statusBarTranslucent={Platform.OS === 'android'} transparent visible={isReauthVisible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View
          className="flex-1 items-center justify-center bg-black/50"
          style={{ paddingHorizontal: horizontalPadding, paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="rounded-3xl bg-white p-6" style={{ width: modalWidth }}>
            <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Text className="text-2xl font-bold text-amber-600">!</Text>
            </View>
            <Text className="mt-4 text-xl font-semibold text-zinc-950">Sessao expirada</Text>
            <Text className="mt-2 text-sm leading-5 text-zinc-600">
              Sua sessao expirou. Digite sua senha para continuar de onde parou.
            </Text>

            {session ? (
              <View className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-widest text-primary-600">CPF</Text>
                <Text className="mt-1 text-base font-medium text-zinc-950">{formatCpf(session.agent.cpf)}</Text>
              </View>
            ) : null}

            <View className="mt-3 rounded-2xl border border-zinc-200 bg-white px-4 pb-3 pt-2">
              <Text className="text-xs font-semibold uppercase tracking-widest text-primary-600">Senha</Text>
              <TextInput
                ref={inputRef}
                autoFocus
                className="mt-1 min-h-12 text-base font-medium text-zinc-950"
                editable={!isReauthLoading}
                onChangeText={setSenha}
                onSubmitEditing={handleSubmit}
                placeholder="Digite sua senha"
                placeholderTextColor="#a1a1aa"
                returnKeyType="go"
                secureTextEntry
                value={senha}
              />
            </View>

            {reauthError ? (
              <View className="mt-4 flex-row items-start rounded-2xl bg-red-50 px-4 py-3">
                <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-red-100">
                  <Text className="text-xs font-bold text-red-600">!</Text>
                </View>
                <Text className="flex-1 text-sm leading-5 text-red-700">{reauthError}</Text>
              </View>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 disabled:opacity-50"
                disabled={isReauthLoading}
                onPress={cancelReauth}
              >
                <Text className="font-semibold text-zinc-700">Sair</Text>
              </Pressable>
              <Pressable
                className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-primary-500 px-4 active:bg-primary-600 disabled:opacity-50"
                disabled={isReauthLoading || !senha}
                onPress={handleSubmit}
              >
                {isReauthLoading ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Entrar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
