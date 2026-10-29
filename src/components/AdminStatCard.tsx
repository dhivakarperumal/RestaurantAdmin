
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type AdminStatCardProps = {
  label: string;
  value: string | number;
  tint: string;
  iconBackground: string;
  icon: ReactNode;
  onPress?: () => void;
};

function AdminStatCard({
  label,
  value,
  tint,
  iconBackground,
  icon,
  onPress,
}: AdminStatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexBasis: 140,
        flexGrow: 1,
        flexShrink: 0,
        minHeight: 90,
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: `${tint}18`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        opacity: pressed ? 0.92 : 1,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.055,
        shadowRadius: 12,
        elevation: 3,
      })}
    >
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: iconBackground,
            flexShrink: 0,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: '#64748B',
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.7,
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
              color: '#111827',
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
      </View>
    </Pressable>
  );
}

export default AdminStatCard;
