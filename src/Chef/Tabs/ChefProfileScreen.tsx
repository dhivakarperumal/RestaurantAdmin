import { Text, View } from 'react-native';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

function ChefProfileScreen({ user }: { user: HeaderUser | null }) {
  const name = user?.name?.trim() || user?.username?.trim() || 'Chef';
  const role = user?.role?.trim() || 'Chef';
  const email = user?.email?.trim() || 'Not provided';

  return (
    <View className="gap-4 pb-6">
      <View>
        <Text className="text-[22px] font-extrabold text-[#012711]">
          Chef Profile
        </Text>
        <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
          View your account details and Chef workspace access.
        </Text>
      </View>

      <View className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <View className="flex-row items-center gap-3 border-b border-[#EEF0F2] bg-[#F7FBF8] p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#DDF2E3]">
            <Text className="text-lg font-extrabold text-[#14764A]">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-base font-extrabold text-[#123B2D]">
              {name}
            </Text>
            <Text className="mt-0.5 text-xs text-[#6B7280]">{role}</Text>
          </View>
        </View>

        <View className="gap-4 p-4">
          <ProfileDetail label="Name" value={name} />
          <ProfileDetail label="Role" value={role} />
          <ProfileDetail label="Email" value={email} />
        </View>
      </View>

      <View className="rounded-2xl border border-[#D1E9D5] bg-[#F4FBF5] p-4">
        <Text className="text-sm font-bold text-[#123B2D]">Chef Access</Text>
        <Text className="mt-1 text-xs leading-5 text-[#52665A]">
          Your account has access to the Chef workspace and its kitchen tools.
        </Text>
      </View>
    </View>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#7B8790]">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-[#263B31]">{value}</Text>
    </View>
  );
}

export default ChefProfileScreen;
