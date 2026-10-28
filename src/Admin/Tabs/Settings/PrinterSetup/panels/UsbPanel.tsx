import React from 'react';
import { Text, View } from 'react-native';
import { UsbIcon } from '../components/PrinterIcons';
import colors from '../../../../../theme/colors';

export function UsbPanel() {
  return (
    <View className="mt-2 flex-row items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <UsbIcon size={22} color="#64748B" />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#1E293B]">USB Connection</Text>
        <Text className="mt-1 text-[13px] leading-5 text-[#475569]">
          Connect your printer using a USB OTG cable or adapter. The printer will be detected automatically once plugged in.
        </Text>
        <View
          className="mt-3 rounded-xl border px-3 py-2"
          style={{
            borderColor: colors.borderLight,
            backgroundColor: colors.surfaceSecondary,
          }}
        >
          <Text
            className="text-[12px] leading-[18px]"
            style={{ color: colors.primary }}
          >
            <Text className="font-bold">Note: </Text>
            Android requires a USB OTG cable. USB printing is not supported on iOS — use Bluetooth or Wi-Fi instead.
          </Text>
        </View>
      </View>
    </View>
  );
}
