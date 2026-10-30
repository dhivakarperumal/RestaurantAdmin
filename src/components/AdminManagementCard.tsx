import type { ReactNode } from 'react';
import { View } from 'react-native';

type AdminManagementCardProps = {
  children: ReactNode;
  isWide: boolean;
};

export default function AdminManagementCard({
  children,
  isWide,
}: AdminManagementCardProps) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white flex-grow-0 flex-shrink-0 ${
        isWide ? 'w-[48%]' : 'w-[47%]'
      }`}
    >
      {children}
    </View>
  );
}
