import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import { Image, Modal, PanResponder, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { DynamicField, FormValue } from '../../types/form';
import { FieldContainer } from './FieldContainer';

type Props = {
  error?: string;
  field: DynamicField;
  onChange: (value: FormValue) => void;
  value: FormValue;
};

const ACTIONS_SIZE = 96;

function SignatureModal({
  initialPath,
  onCancel,
  onConfirm,
  visible,
}: {
  initialPath: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  visible: boolean;
}) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [path, setPath] = useState(initialPath);
  const pathRef = useRef(path);
  const svgRef = useRef<ElementRef<typeof Svg>>(null);
  pathRef.current = path;

  useEffect(() => {
    if (visible) {
      setPath(initialPath);
      pathRef.current = initialPath;
    }
  }, [initialPath, visible]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      pathRef.current = `${pathRef.current} M ${locationX} ${locationY}`;
      setPath(pathRef.current);
    },
    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      pathRef.current = `${pathRef.current} L ${locationX} ${locationY}`;
      setPath(pathRef.current);
    },
    onStartShouldSetPanResponder: () => true,
  }), []);

  // Gira a area de assinatura para orientacao horizontal (landscape) sem depender de
  // bloqueio nativo de orientacao da tela: o conteudo e desenhado com as dimensoes
  // trocadas e rotacionado 90 graus, ocupando a tela inteira.
  // Apos a rotacao de 90 graus, a borda direita do conteudo fica voltada para a
  // borda inferior real da tela (onde fica a barra de navegacao do Android), entao
  // reservamos esse espaco (insets.bottom) para os botoes nao ficarem encobertos.
  const boxWidth = screenHeight;
  const boxHeight = screenWidth;
  const canvasWidth = boxWidth - ACTIONS_SIZE - insets.bottom;
  const canvasHeight = boxHeight;

  const confirm = () => {
    if (!pathRef.current) {
      onConfirm('');
      return;
    }

    // A assinatura fica embutida como PNG em base64 dentro de `dados` (nao como o caminho
    // SVG bruto) -- vai no campo de texto "payload" do multipart, nao como arquivo de
    // upload. Tamanho pequeno (assinatura, nao foto), entao base64-em-JSON aqui e aceitavel.
    // A API preserva esse valor (nao aplica toUpperCase em strings data:base64,...).
    svgRef.current?.toDataURL(
      (base64) => onConfirm(`data:image/png;base64,${base64}`),
      { height: Math.round(canvasHeight), width: Math.round(canvasWidth) },
    );
  };

  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={visible}>
      <View className="flex-1 bg-zinc-950">
        <View
          style={{
            height: boxHeight,
            left: (screenWidth - boxWidth) / 2,
            position: 'absolute',
            top: (screenHeight - boxHeight) / 2,
            transform: [{ rotate: '90deg' }],
            width: boxWidth,
          }}
        >
          <View className="flex-1 flex-row bg-white" style={{ paddingRight: insets.bottom }}>
            <View className="flex-1 overflow-hidden" {...responder.panHandlers}>
              <Svg height="100%" ref={svgRef} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} width="100%">
                <Path d={path} fill="none" stroke="#18181b" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </Svg>
              {!path ? (
                <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                  <Text className="text-base font-medium text-zinc-300">Assine aqui</Text>
                </View>
              ) : null}
            </View>

            <View className="justify-center gap-3 border-l border-zinc-200 bg-zinc-50 px-3" style={{ width: ACTIONS_SIZE }}>
              <Pressable
                className="flex-1 items-center justify-center rounded-2xl bg-white active:bg-zinc-100"
                onPress={() => {
                  pathRef.current = '';
                  setPath('');
                }}
              >
                <Text className="text-sm font-semibold text-zinc-700">Limpar</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-2xl bg-primary-500 active:bg-primary-600"
                onPress={confirm}
              >
                <Text className="text-sm font-semibold text-white">Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SignatureField({ error, field, onChange, value }: Props) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // `path` guarda apenas o desenho vetorial em edicao na sessao atual (para reabrir o
  // modal e continuar desenhando). O valor persistido/enviado em `value` e sempre uma
  // imagem PNG em base64 (data URL), nunca o caminho SVG.
  const [path, setPath] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const isImageValue = typeof value === 'string' && value.startsWith('data:image');

  useEffect(() => {
    // Compatibilidade com rascunhos antigos que guardavam o caminho SVG bruto em
    // `value`: se o valor nao for uma imagem base64, trata como caminho vetorial para
    // exibir a previa (sera convertido para imagem na proxima vez que for confirmado).
    if (typeof value === 'string' && value && !value.startsWith('data:image')) {
      setPath(value);
    }
  }, [value]);

  // Mesma proporcao da area de desenho em tela cheia (landscape), para que a assinatura
  // salva seja exibida corretamente em miniatura no formulario.
  const canvasWidth = screenHeight - ACTIONS_SIZE - insets.bottom;
  const canvasHeight = screenWidth;

  return (
    <FieldContainer error={error} label={field.config.label} required={field.config.required}>
      <Pressable
        className="h-44 items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-white active:bg-zinc-50"
        onPress={() => setIsModalVisible(true)}
      >
        {isImageValue ? (
          <Image resizeMode="contain" source={{ uri: value as string }} style={{ height: '100%', width: '100%' }} />
        ) : path ? (
          <Svg height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} width="100%">
            <Path d={path} fill="none" stroke="#18181b" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </Svg>
        ) : (
          <Text className="text-sm font-medium text-zinc-400">Toque para assinar</Text>
        )}
      </Pressable>

      <SignatureModal
        initialPath={isImageValue ? '' : path}
        onCancel={() => setIsModalVisible(false)}
        onConfirm={(dataUrl) => {
          setPath('');
          onChange(dataUrl);
          setIsModalVisible(false);
        }}
        visible={isModalVisible}
      />
    </FieldContainer>
  );
}
