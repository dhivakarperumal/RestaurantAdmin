import { ImageBackground, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import {
  CustomersIcon,
  MenuIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';

function ChefProfileScreen({ user }: { user: HeaderUser | null }) {
  const name = user?.name?.trim() || user?.username?.trim() || 'Chef';
  const role = user?.role?.trim() || 'Chef';
  const email = user?.email?.trim() || 'Not provided';
  const employeeId = user?.employee_id ?? user?.employeeId;

  return (
    <View className="gap-4 pb-6">
      <View>
        <Text className="text-[23px] font-extrabold text-[#102D2A]">
          My Profile
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-[#6B7280]">
          Your personal information and workspace details.
        </Text>
      </View>

      <ImageBackground
        imageStyle={{ opacity: 0.18 }}
        resizeMode="cover"
        source={require('../../images/chefheader.png')}
        className="overflow-hidden rounded-[22px] bg-[#07513A]"
      >
        <View className="flex-row items-center gap-4 px-4 py-5">
          <View className="h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-white/80 bg-[#FFF2C9]">
            <Text className="text-[34px] font-extrabold text-[#07513A]">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="h-[76px] w-px bg-white/30" />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[20px] font-extrabold text-white">
              {name}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-xs text-[#E1EFE8]">
              {email}
            </Text>
            <View className="mt-2 self-start flex-row items-center gap-1.5 rounded-full bg-[#F7C84A] px-3 py-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-wide text-[#684B12]">
                {role}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row border-t border-white/15 px-2 py-3.5">
          <ProfileSummary
            icon={<StatusIcon />}
            label="Account Role"
            value={role}
          />
          <ProfileSummary
            icon={<CustomersIcon color="#FFFFFF" size={19} />}
            label="Employee ID"
            value={employeeId ? String(employeeId) : 'Not provided'}
          />
          <ProfileSummary
            icon={<AccessIcon />}
            label="Workspace Access"
            value="Enabled"
          />
        </View>
      </ImageBackground>

      <View className="rounded-[20px] border border-[#E6ECE8] bg-white p-3.5">
        <Text className="mb-2 border-b border-[#EDF0EE] pb-3 text-[16px] font-extrabold text-[#102D2A]">
          Personal Information
        </Text>
        <ProfileDetail
          icon={<PersonIcon />}
          label="Full Name"
          value={name}
        />
        <ProfileDetail
          icon={<EmailIcon />}
          label="Email Address"
          value={email}
        />
        <ProfileDetail
          icon={<AccessIcon />}
          label="Account Role"
          value={role}
          isLast
        />
      </View>

      <View className="rounded-[20px] border border-[#D5EFDC] bg-[#F1FAF3] p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#D9F5E0]">
            <AccessIcon color="#08794A" size={27} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-extrabold text-[#102D2A]">
              Chef Workspace Access
            </Text>
            <Text className="mt-1 text-xs leading-[18px] text-[#64748B]">
              Your account has access to the Chef workspace and its kitchen tools.
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-[#D6EBDD] pt-3">
          <WorkspaceFeature
            icon={<MenuIcon color="#07513A" size={18} />}
            label="Food Management"
          />
          <WorkspaceFeature
            icon={<OrdersIcon color="#07513A" size={18} />}
            label="Kitchen Orders"
          />
          <WorkspaceFeature
            icon={<ReceiptIcon color="#07513A" size={18} />}
            label="Event Orders"
          />
          <WorkspaceFeature
            icon={<CustomersIcon color="#07513A" size={18} />}
            label="Attendance"
          />
        </View>
      </View>
    </View>
  );
}

function ProfileSummary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-0 flex-1 items-center px-1">
      <View className="mb-1.5 h-6 items-center justify-center">{icon}</View>
      <Text numberOfLines={1} className="text-center text-[9px] text-[#C7DAD0]">
        {label}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 text-center text-[10px] font-bold text-white">
        {value}
      </Text>
    </View>
  );
}

function ProfileDetail({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 py-2.5 ${
        isLast ? '' : 'border-b border-[#EEF1EF]'
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EC]">
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[10px] text-[#748092]">{label}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[13px] font-bold text-[#1D3038]">
          {value}
        </Text>
      </View>
      <Text className="text-xl text-[#82909F]">›</Text>
    </View>
  );
}

function WorkspaceFeature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View className="min-w-0 flex-1 items-center gap-1 px-0.5">
      {icon}
      <Text numberOfLines={2} className="text-center text-[8px] leading-3 text-[#536579]">
        {label}
      </Text>
    </View>
  );
}

function PersonIcon({ color = '#07513A', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <Path
        d="M4 21a8 8 0 0 1 16 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EmailIcon({ color = '#07513A', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="m4 7 8 6 8-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AccessIcon({
  color = '#07513A',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 3 8 3v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        d="m8.5 12 2.2 2.2 4.8-4.8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StatusIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <Path
        d="M8 3v4m8-4v4M4 10h16"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="9" cy="14" r="1" fill="#FFFFFF" />
    </Svg>
  );
}

export default ChefProfileScreen;
