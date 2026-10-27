import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type MoreInnerHeaderProps = {
  title: string;
  destination: string;
  onBack: () => void;
};

export default function MoreInnerHeader({
  title,
  destination,
  onBack,
}: MoreInnerHeaderProps) {
  return (
    <SafeAreaView
      edges={['top']}
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#052E10',
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      }}
    >
      <StatusBar barStyle="light-content" />
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient
            id="moreInnerHeaderGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#052E10" />
            <Stop offset="55%" stopColor="#0B4D1A" />
            <Stop offset="100%" stopColor="#147524" />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#moreInnerHeaderGradient)"
        />
      </Svg>
      <View className="h-[58px] flex-row items-center gap-3 px-4">
        <Pressable
          accessibilityLabel={`Back to ${destination}`}
          accessibilityRole="button"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/20"
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? 'rgba(255,255,255,0.24)'
              : 'rgba(255,255,255,0.12)',
          })}
        >
          <Text className="text-2xl leading-7 text-white">‹</Text>
        </Pressable>
        <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}
