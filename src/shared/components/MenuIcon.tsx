import { Text, View } from 'react-native';

function MenuIcon({ dark = false }: { dark?: boolean }) {
  return (
    <View className="h-6 w-6 justify-around py-1">
      <View className={`h-0.5 rounded-full ${dark ? 'bg-zinc-950' : 'bg-white'}`} />
      <View className={`h-0.5 rounded-full ${dark ? 'bg-zinc-950' : 'bg-white'}`} />
      <View className={`h-0.5 rounded-full ${dark ? 'bg-zinc-950' : 'bg-white'}`} />
    </View>
  );
}

export { MenuIcon };
