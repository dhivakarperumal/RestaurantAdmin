import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type AdminStatCardProps = {
  label: string;
  value: string | number;
  tint: string;
  iconBackground: string;
  decorColor?: string;
  icon: ReactNode;
  onPress?: () => void;
};

function AdminStatCard({
  label,
  value,
  tint,
  iconBackground,
  decorColor = iconBackground,
  icon,
  onPress,
}: AdminStatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        width: '48%',
        flexBasis: '48%',
        flexGrow: 0,
        flexShrink: 0,
        minHeight: 90,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 16,
        opacity: pressed ? 0.92 : 1,
        elevation: 2,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -30,
          right: -24,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: decorColor,
          opacity: 0.55,
        }}
      />
      <View
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: tint,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          style={{
            marginTop: 4,
            color: tint,
            fontSize: 23,
            fontWeight: '800',
            lineHeight: 28,
            letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

export default AdminStatCard;
