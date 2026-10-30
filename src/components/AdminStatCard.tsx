import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type AdminStatCardProps = {
  label: string;
  value: string | number;
  tint: string;
  iconBackground: string;
  decorColor?: string;
  icon: ReactNode;
};

function AdminStatCard({
  label,
  value,
  tint,
  iconBackground,
  decorColor = iconBackground,
  icon,
}: AdminStatCardProps) {
  return (
    <View
      style={{
        width: '48%',
        minHeight: 90,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        overflow: 'hidden',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 18,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
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
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: tint,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
            lineHeight: 14,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: tint,
            fontSize: 22,
            fontWeight: '800',
            lineHeight: 38,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default AdminStatCard;
