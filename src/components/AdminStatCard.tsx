
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, TrendingUp } from 'lucide-react-native';

type AdminStatCardProps = {
  label: string;
  value: string | number;
  tint: string;
  iconBackground: string;
  decorColor: string;
  icon: ReactNode;
  growth?: string;
  onPress?: () => void;
};

function AdminStatCard({
  label,
  value,
  tint,
  iconBackground,
  decorColor,
  icon,
  growth,
  onPress,
}: AdminStatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        width: '48%',
        minHeight: 154,
        padding: 15,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: `${iconBackground}30`,
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
      {/* Soft decorative background */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 105,
          height: 105,
          borderRadius: 60,
          right: -35,
          top: -35,
          backgroundColor: decorColor,
          opacity: 0.4,
        }}
      />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 6,
        }}
      >
        {/* Left: label and value */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 24,
              height: 4,
              borderRadius: 4,
              backgroundColor: tint,
              marginBottom: 12,
            }}
          />

          <Text
            numberOfLines={2}
            style={{
              color: '#64748B',
              fontSize: 11,
              fontWeight: '600',
              lineHeight: 15,
            }}
          >
            {label}
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={{
              marginTop: 5,
              color: '#111827',
              fontSize: 28,
              fontWeight: '800',
              lineHeight: 35,
              letterSpacing: -0.8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {value}
          </Text>
        </View>

        {/* Right: icon panel */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: decorColor,
            borderWidth: 1,
            borderColor: `${iconBackground}18`,
            marginTop: 2,
          }}
        >
          {icon}
        </View>
      </View>

      {/* Bottom: growth and arrow */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          gap: 5,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: decorColor,
            paddingHorizontal: 8,
            paddingVertical: 7,
            borderRadius: 30,
          }}
        >
          <TrendingUp
            size={14}
            color={tint}
            strokeWidth={2.8}
          />

          <Text
            numberOfLines={1}
            style={{
              color: tint,
              fontSize: 11,
              fontWeight: '800',
            }}
          >
            {growth ?? 'Overview'}
          </Text>
        </View>

        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: `${iconBackground}45`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight
            size={17}
            color={tint}
            strokeWidth={2.5}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default AdminStatCard;
