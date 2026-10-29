import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import { ActionSheet, BaseModal, ConfirmDialog, DetailsModal, PhoneIcon, PrinterIcon } from '../../components/popups';

/* ==========================================================================
   Crisp SVG Icons for Server Tools
   ========================================================================== */

function ChevronRightSvg({ color = '#94A3B8', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9 18 6-6-6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PrinterSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5M6 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1M6 14h12v7H6v-7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="18" cy="12" r="1" fill={color} />
    </Svg>
  );
}

function BellSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HistorySvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 3v5h5M12 7v5l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function MapPinSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function RefreshSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GlobeSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LockSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function PhoneSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookOpenSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function InfoSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function LogoutSvg({ color = '#DC2626', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockOutSvg({ color = '#EA580C', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m16 16 3-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function IdBadgeSvg({ color = '#86EFAC', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
      <Path d="M7 17a5 5 0 0 1 10 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CloseSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CheckSvg({ color = '#15803D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 13 4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WifiSvg({ color = '#15803D', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TableChairSvg({ color = '#EA580C', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="5" rx="1.5" stroke={color} strokeWidth="2" />
      <Path d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ReceiptTextSvg({ color = '#B45309', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2Zm4 7h8m-8 4h8m-8 4h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldCheckSvg({ color = '#7C3AED', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeadsetSvg({ color = '#DC2626', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ==========================================================================
   Setting Item Row Component
   ========================================================================== */

function SettingRow({
  icon: Icon,
  iconColor = '#116C0B',
  iconBg = '#ECFDF5',
  title,
  subtitle,
  badge,
  badgeColor = '#116C0B',
  badgeBg = '#E8F5E9',
  onPress,
  rightElement,
}: {
  icon: React.ComponentType<{ color?: string; size?: number }>;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 14,
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: iconBg,
          borderRadius: 12,
          height: 38,
          justifyContent: 'center',
          width: 38,
        }}
      >
        <Icon color={iconColor} size={20} />
      </View>

      <View className="ml-3 flex-1 justify-center">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-[#0F172A]">{title}</Text>
          {badge ? (
            <View
              style={{
                backgroundColor: badgeBg,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: badgeColor,
                  fontSize: 10,
                  fontWeight: '800',
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-[#64748B]">{subtitle}</Text>
        ) : null}
      </View>

      {rightElement ? (
        rightElement
      ) : onPress ? (
        <ChevronRightSvg color="#CBD5E1" size={18} />
      ) : null}
    </Pressable>
  );
}

/* ==========================================================================
   Main ServerMore Component
   ========================================================================== */

export type ServerMoreProps = {
  user?: HeaderUser;
  onLogout?: () => void;
  onClockOut?: () => Promise<void>;
  onRefreshWorkspace?: () => void;
  onOpenProfile?: () => void;
  onOpenFoods?: () => void;
  onOpenOrders?: () => void;
};

export default function ServerMore({
  user = {},
  onLogout,
  onClockOut,
  onRefreshWorkspace,
  onOpenProfile,
  onOpenFoods,
  onOpenOrders,
}: ServerMoreProps) {
  const name = user.name?.trim() || user.username?.trim() || 'Team Server';
  const email = user.email?.trim() || 'server@dineserve.com';
  const role = user.role?.trim() || 'Lead Station Waitstaff';
  const employeeId = String(user.employee_id ?? user.employeeId ?? 'EMP-104');
  const initial = name.charAt(0).toUpperCase();

  // Local state toggles
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isClockOutConfirmOpen, setIsClockOutConfirmOpen] = useState(false);

  const handleSyncWorkspace = () => {
    setIsSyncing(true);
    if (onRefreshWorkspace) {
      onRefreshWorkspace();
    }
    setTimeout(() => {
      setIsSyncing(false);
      Alert.alert('Workspace Synced', 'Menu catalog, floor tables, and active orders are up to date.');
    }, 900);
  };

  const handleTestPrint = () => {
    setIsTestingPrint(true);
    setTimeout(() => {
      setIsTestingPrint(false);
      Alert.alert('Test Slip Printed', 'Test order slip sent to Kitchen KOT Printer (EPSON TM-T88VI).');
    }, 1200);
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleClockOut = () => {
    setIsClockOutConfirmOpen(true);
  };

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pb-16 pt-3"
    >
      {/* ====================================================================
          Server Profile Hero Card
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          overflow: 'hidden',
          padding: 20,
          shadowColor: '#012711',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}
      >
        {/* Glow circle */}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 120, 0, 0.12)',
            borderRadius: 90,
            height: 180,
            position: 'absolute',
            right: -30,
            top: -40,
            width: 180,
          }}
        />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <Text className="text-[11px] font-bold tracking-widest text-[#B8D7BE]">
              STAFF PROFILE & SETTINGS
            </Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-[11px] font-bold text-[#86EFAC]">
              {employeeId}
            </Text>
          </View>
        </View>

        {/* Profile info row */}
        <View className="mt-4 flex-row items-center gap-3.5">
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#FF7800',
              borderColor: '#FFAA5C',
              borderRadius: 24,
              borderWidth: 2,
              height: 58,
              justifyContent: 'center',
              width: 58,
            }}
          >
            <Text className="text-2xl font-black text-white">{initial}</Text>
          </View>

          <View className="flex-1">
            <Text className="text-xl font-extrabold text-white">{name}</Text>
            <Text className="text-xs text-[#CBD5E1]">{email}</Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <View className="rounded-md bg-[#114D26] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-[#86EFAC]">
                  {role}
                </Text>
              </View>
              <Text className="text-[10px] text-[#B8D7BE]">
                Station A • Shift Active
              </Text>
            </View>
          </View>
        </View>

        {/* Profile & ID Action Buttons */}
        <View className="mt-4 flex-row gap-2">
          {onOpenProfile ? (
            <Pressable
              onPress={onOpenProfile}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#114D26] py-2.5 active:bg-[#15803D]"
            >
              <Text className="text-xs font-bold text-[#86EFAC]">
                Staff Profile & Bank ›
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setIsIdModalOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 active:bg-white/15"
          >
            <IdBadgeSvg color="#86EFAC" size={16} />
            <Text className="text-xs font-bold text-white">
              Digital Staff ID
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Today's Service Metrics Bar
          ==================================================================== */}
      <View className="mt-4 flex-row gap-2.5">
        <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
          <Text className="text-[10px] font-bold tracking-wider text-[#64748B]">
            SHIFT HOURS
          </Text>
          <Text className="mt-1 text-lg font-black text-[#012711]">6.5 hrs</Text>
          <Text className="text-[10px] font-semibold text-[#10B981]">● Active Now</Text>
        </View>

        <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
          <Text className="text-[10px] font-bold tracking-wider text-[#64748B]">
            TABLES SERVED
          </Text>
          <Text className="mt-1 text-lg font-black text-[#012711]">24</Text>
          <Text className="text-[10px] font-semibold text-[#3B82F6]">Turnaround</Text>
        </View>

        <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
          <Text className="text-[10px] font-bold tracking-wider text-[#64748B]">
            SERVICE RATING
          </Text>
          <Text className="mt-1 text-lg font-black text-[#FF8A00]">4.9 ★</Text>
          <Text className="text-[10px] font-semibold text-[#F59E0B]">Top Server</Text>
        </View>
      </View>

      {/* ====================================================================
          Section 1: Service & Station Tools
          ==================================================================== */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Service & Station Tools
          </Text>
          <Text className="text-[11px] font-bold text-[#116C0B]">
            ● Hardware Connected
          </Text>
        </View>

        <View className="mt-3 gap-3.5">
          <View className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
            <SettingRow
              icon={HistorySvg}
              title="Kitchen Orders"
              subtitle="View orders assigned to your server account"
              badge="LIVE"
              onPress={onOpenOrders}
            />
            <View className="mx-4 border-t border-[#F1F5F9]" />
            <SettingRow
              icon={GlobeSvg}
              title="Food Menu"
              subtitle="Browse food items and start an order"
              onPress={onOpenFoods}
            />
          </View>
          {/* Card 1: Kitchen & Receipt Printers Card */}
          <Pressable
            onPress={() => setIsPrinterModalOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#BBF7D0',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#ECFDF5]">
                  <PrinterSvg color="#116C0B" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Kitchen & Receipt Printers
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    EPSON KOT & Star Receipt Hardware
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1">
                <View className="h-2 w-2 rounded-full bg-[#15803D]" />
                <Text className="text-[11px] font-extrabold text-[#15803D]">
                  2 Connected
                </Text>
              </View>
            </View>

            {/* Sub-status pills inside Card 1 */}
            <View className="mt-3.5 flex-row gap-2">
              <View className="flex-1 flex-row items-center justify-between rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] p-2.5">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                    Kitchen KOT
                  </Text>
                  <Text className="text-xs font-bold text-[#0F172A]">
                    EPSON TM-T88
                  </Text>
                </View>
                <WifiSvg color="#15803D" size={16} />
              </View>

              <View className="flex-1 flex-row items-center justify-between rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] p-2.5">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                    Cashier Bill
                  </Text>
                  <Text className="text-xs font-bold text-[#0F172A]">
                    Star TSP143
                  </Text>
                </View>
                <WifiSvg color="#15803D" size={16} />
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Thermal slip diagnostics & connection test
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#116C0B]">
                  Test Print
                </Text>
                <ChevronRightSvg color="#116C0B" size={14} />
              </View>
            </View>
          </Pressable>

          {/* Card 2: Floor Station Assignment Card */}
          <Pressable
            onPress={() =>
              Alert.alert(
                'Station Assignment',
                'You are currently assigned to Station A covering Tables 1 to 12. Speak to your floor supervisor to adjust assigned tables.',
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#FED7AA',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF7ED]">
                  <TableChairSvg color="#EA580C" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Floor Station Assignment
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Dining Floor A • Tables 1 to 12
                  </Text>
                </View>
              </View>

              <View className="rounded-full border border-[#FFEDD5] bg-[#FFF7ED] px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#EA580C]">
                  Station A
                </Text>
              </View>
            </View>

            {/* Station stats bar */}
            <View className="mt-3.5 flex-row items-center justify-between rounded-xl border border-[#FED7AA] bg-[#FFFBF7] p-2.5">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-[#EA580C]" />
                <Text className="text-xs font-bold text-[#0F172A]">
                  12 Dining Tables Assigned
                </Text>
              </View>
              <Text className="text-xs font-semibold text-[#64748B]">
                Main Dining Room
              </Text>
            </View>
          </Pressable>

          {/* Card 3: Kitchen Order Audio & Vibration Alerts Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#C7D2FE',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-3 pr-2">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                  <BellSvg color="#4F46E5" size={22} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Kitchen Order Chimes
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Sound & vibration when dishes are ready
                  </Text>
                </View>
              </View>

              <Switch
                value={soundAlerts}
                onValueChange={setSoundAlerts}
                trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                thumbColor={soundAlerts ? '#116C0B' : '#94A3B8'}
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Status: {soundAlerts ? '🔔 Audio & Haptics Active' : '🔕 Muted'}
              </Text>
              <View className="rounded-md bg-[#EEF2FF] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-[#4F46E5]">
                  Instant Alert
                </Text>
              </View>
            </View>
          </View>

          {/* Card 4: Daily Service Order History Card */}
          <Pressable
            onPress={() => {
              Alert.alert(
                'Shift Tickets',
                '24 completed orders and tickets logged for your shift. Receipts are synchronized with the central cashier database.',
              );
            }}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#FDE68A',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7]">
                  <ReceiptTextSvg color="#B45309" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Shift Order Tickets
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Review table tickets & duplicate slips
                  </Text>
                </View>
              </View>

              <View className="rounded-full bg-[#FEF3C7] px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#B45309]">
                  24 Tickets
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                View delivered bills & duplicate receipts
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#B45309]">
                  View Logs
                </Text>
                <ChevronRightSvg color="#B45309" size={14} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Section 2: App & Workflow Management
          ==================================================================== */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            App & Workflow Management
          </Text>
          <Text className="text-[11px] font-bold text-[#16A34A]">
            ● Terminal Connected
          </Text>
        </View>

        <View className="mt-3 gap-3.5">
          {/* Card 1: Cloud Sync & Workspace Card */}
          <Pressable
            onPress={handleSyncWorkspace}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#A7F3D0',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#ECFDF5]">
                  <RefreshSvg color="#16A34A" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Cloud Sync & Workspace
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Menu catalog, active tables & orders cache
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1">
                <View className="h-2 w-2 rounded-full bg-[#16A34A]" />
                <Text className="text-[11px] font-extrabold text-[#15803D]">
                  Sync OK
                </Text>
              </View>
            </View>

            {/* Sync status strip */}
            <View className="mt-3.5 flex-row items-center justify-between rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] p-2.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-[#0F172A]">
                  Database: Menu & Orders v2.4
                </Text>
              </View>
              <Text className="text-[11px] font-semibold text-[#15803D]">
                ● Live WebSocket
              </Text>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Manual cloud sync with restaurant server
              </Text>
              <View className="flex-row items-center gap-1.5">
                {isSyncing ? (
                  <ActivityIndicator color="#116C0B" size="small" />
                ) : (
                  <>
                    <Text className="text-xs font-bold text-[#16A34A]">
                      Sync Now
                    </Text>
                    <ChevronRightSvg color="#16A34A" size={14} />
                  </>
                )}
              </View>
            </View>
          </Pressable>

          {/* Card 2: Terminal Security & Passcode Lock Card */}
          <Pressable
            onPress={() =>
              Alert.alert(
                'Terminal Security',
                'Passcode lock is active. The terminal automatically locks after 5 minutes of inactivity during staff breaks.',
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DDD6FE',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#FAF5FF]">
                  <ShieldCheckSvg color="#7C3AED" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Terminal Security & PIN
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Screen lock protection during breaks
                  </Text>
                </View>
              </View>

              <View className="rounded-full border border-[#EDE9FE] bg-[#F5F3FF] px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#7C3AED]">
                  PIN Protected
                </Text>
              </View>
            </View>

            <View className="mt-3.5 flex-row items-center justify-between rounded-xl border border-[#EDE9FE] bg-[#FAF5FF] p-2.5">
              <Text className="text-xs font-bold text-[#0F172A]">
                4-Digit Quick PIN Enabled
              </Text>
              <Text className="text-xs font-semibold text-[#7C3AED]">
                Auto-Lock: 5 Mins Idle
              </Text>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Tap to test lock or update staff passcode
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#7C3AED]">
                  Lock Settings
                </Text>
                <ChevronRightSvg color="#7C3AED" size={14} />
              </View>
            </View>
          </Pressable>

          {/* Card 3: App Language & Regional Formatting Card */}
          <Pressable
            onPress={() =>
              Alert.alert(
                'Localization',
                'Language: English (US)\nCurrency: Indian Rupee (₹ INR)\nTime Format: 12-Hour AM/PM\nNumber Standard: en-IN (Lakhs/Crores)',
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#99F6E4',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFA]">
                  <GlobeSvg color="#0D9488" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Language & Regional Format
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Hospitality currency, taxes & format
                  </Text>
                </View>
              </View>

              <View className="rounded-full border border-[#CCFBF1] bg-[#F0FDFA] px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#0D9488]">
                  English (₹ INR)
                </Text>
              </View>
            </View>

            <View className="mt-3.5 flex-row items-center justify-between rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] p-2.5">
              <Text className="text-xs font-bold text-[#0F172A]">
                Currency: Indian Rupee (₹)
              </Text>
              <Text className="text-xs font-semibold text-[#0D9488]">
                GST / VAT Ready
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Section 3: Helpdesk & Operations Hotline
          ==================================================================== */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Helpdesk & Operations Hotline
          </Text>
          <Text className="text-[11px] font-bold text-[#DC2626]">
            ● SOS Priority
          </Text>
        </View>

        <View className="mt-3 gap-3.5">
          {/* Card 1: Floor Manager & Kitchen SOS Card */}
          <Pressable
            onPress={() => setIsSupportModalOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#FECACA',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF2F2]">
                  <HeadsetSvg color="#DC2626" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Floor Manager & Kitchen SOS
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Instant dispatch for food delays or manager help
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-1">
                <View className="h-2 w-2 rounded-full bg-[#DC2626]" />
                <Text className="text-[11px] font-extrabold text-[#DC2626]">
                  3 Hotlines
                </Text>
              </View>
            </View>

            {/* Hotline extensions preview */}
            <View className="mt-3.5 flex-row gap-2">
              <View className="flex-1 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                  Supervisor
                </Text>
                <Text className="text-xs font-bold text-[#0F172A]">
                  Ext 101
                </Text>
              </View>

              <View className="flex-1 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                  Head Chef
                </Text>
                <Text className="text-xs font-bold text-[#0F172A]">
                  Ext 104
                </Text>
              </View>

              <View className="flex-1 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                  IT Support
                </Text>
                <Text className="text-xs font-bold text-[#0F172A]">
                  Ext 110
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Tap to dial floor manager or kitchen chef
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#DC2626]">
                  Open Hotlines
                </Text>
                <ChevronRightSvg color="#DC2626" size={14} />
              </View>
            </View>
          </Pressable>

          {/* Card 2: Service SOP & Guidelines Card */}
          <Pressable
            onPress={() =>
              Alert.alert(
                'Service Standards & Protocol',
                '1. Greet guests within 2 mins of table seating.\n2. Confirm allergy requests with the kitchen immediately.\n3. Verify all food tickets against table bills before checkout.\n4. Clear plates within 3 mins of guests finishing.',
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#BFDBFE',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF]">
                  <BookOpenSvg color="#2563EB" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    Service Standards & Protocol
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    Table turnaround & guest care handbook
                  </Text>
                </View>
              </View>

              <View className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#2563EB]">
                  SOP Guide
                </Text>
              </View>
            </View>

            {/* Checklist summary */}
            <View className="mt-3.5 rounded-xl border border-[#DBEAFE] bg-[#F8FAFC] p-2.5 gap-1.5">
              <Text className="text-xs text-[#334155]">
                • <Text className="font-bold">Greet guests</Text> within 2 minutes of seating
              </Text>
              <Text className="text-xs text-[#334155]">
                • <Text className="font-bold">Double-check allergy</Text> and kitchen prep notes
              </Text>
              <Text className="text-xs text-[#334155]">
                • <Text className="font-bold">Verify table billing</Text> before checkout
              </Text>
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <Text className="text-xs font-semibold text-[#64748B]">
                Hospitality procedures & checklist
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#2563EB]">
                  Read Standards
                </Text>
                <ChevronRightSvg color="#2563EB" size={14} />
              </View>
            </View>
          </Pressable>

          {/* Card 3: POS Terminal & Station Info Card */}
          <Pressable
            onPress={() =>
              Alert.alert(
                'POS Terminal Diagnostics',
                'Restaurant Server POS Terminal\nVersion: 1.2.0 (Build 42 Release)\nStation: Station A • Main Dining Floor\nNetwork: High-Speed Local LAN\nServer API: https://restaurant.qtechx.com/api\nPrinter Queue: 0 Pending Jobs',
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: 20,
              borderWidth: 1.5,
              elevation: 2,
              padding: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC]">
                  <InfoSvg color="#475569" size={22} />
                </View>
                <View>
                  <Text className="text-base font-extrabold text-[#0F172A]">
                    POS Terminal Diagnostics
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    DineServe Server Station A • v1.2.0
                  </Text>
                </View>
              </View>

              <View className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1">
                <Text className="text-[11px] font-extrabold text-[#475569]">
                  Build 42
                </Text>
              </View>
            </View>

            <View className="mt-3.5 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <Text className="text-xs font-bold text-[#0F172A]">
                Network: Online • High-Speed LAN
              </Text>
              <Text className="text-[11px] font-semibold text-[#15803D]">
                ● API Connected
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Section 4: Shift & Session Actions
          ==================================================================== */}
      <View className="mt-6 gap-3">
        {onClockOut ? (
          <Pressable
            onPress={handleClockOut}
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] py-3.5 active:bg-[#FFEDD5]"
          >
            <ClockOutSvg color="#EA580C" size={18} />
            <Text className="text-sm font-extrabold text-[#EA580C]">
              Clock Out & End Shift
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] py-3.5 active:bg-[#FEE2E2]"
        >
          <LogoutSvg color="#DC2626" size={18} />
          <Text className="text-sm font-extrabold text-[#DC2626]">
            Sign Out of Terminal
          </Text>
        </Pressable>
      </View>

      {/* ====================================================================
          Modal 1: Digital Staff ID Card Modal
          ==================================================================== */}
      <BaseModal
        visible={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
        title="Digital Staff Badge"
        subtitle="DINESERVE RESTAURANT"
        maxWidth={380}
        footer={
          <Pressable
            onPress={() => setIsIdModalOpen(false)}
            className="min-h-12 w-full items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
          >
            <Text className="text-sm font-bold text-white">Done</Text>
          </Pressable>
        }
      >
        <View className="items-center py-2">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-[#116C0B] shadow-lg">
            <Text className="text-3xl font-black text-white">{initial}</Text>
          </View>
          <Text className="mt-3 text-xl font-extrabold text-[#0F172A]">
            {name}
          </Text>
          <Text className="text-xs text-[#64748B]">{role}</Text>
          <View className="mt-2 rounded-full bg-[#E8F5E9] px-3 py-1 border border-[#BBF7D0]">
            <Text className="text-xs font-bold text-[#15803D]">
              ID: {employeeId}
            </Text>
          </View>

          {/* Barcode simulation */}
          <View className="mt-5 w-full items-center rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
            <View className="flex-row items-center gap-1">
              {[4, 2, 6, 3, 5, 2, 7, 3, 4, 2, 6, 4, 3, 5, 2, 6, 3, 5].map(
                (w, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: '#0F172A',
                      height: 36,
                      width: w,
                    }}
                  />
                ),
              )}
            </View>
            <Text className="mt-2 font-mono text-[10px] tracking-widest text-[#64748B]">
              *DS-EMP-{employeeId}*
            </Text>
          </View>

          <Text className="mt-3 text-center text-[11px] text-[#94A3B8]">
            Authorized server for Dining Station A • Valid for 2026-2027
          </Text>
        </View>
      </BaseModal>

      {/* ====================================================================
          Modal 2: Printer Setup & Test Modal
          ==================================================================== */}
      <DetailsModal
        visible={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        title="POS Printers Status"
        subtitle="Network and thermal ticket printers"
        icon={<PrinterIcon color="#116C0B" size={22} />}
        maxWidth={440}
        footer={
          <View className="w-full flex-row gap-3">
            <Pressable
              onPress={() => setIsPrinterModalOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
            >
              <Text className="text-sm font-semibold text-[#334155]">Close</Text>
            </Pressable>
            <Pressable
              disabled={isTestingPrint}
              onPress={handleTestPrint}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
            >
              {isTestingPrint ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <PrinterIcon size={18} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">Print Test Slip</Text>
                </>
              )}
            </Pressable>
          </View>
        }
      >
        <View className="gap-3">
          <View className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[#0F172A]">
                Kitchen KOT Printer
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5">
                <CheckSvg color="#15803D" size={12} />
                <Text className="text-[10px] font-bold text-[#15803D]">
                  Online
                </Text>
              </View>
            </View>
            <Text className="mt-1 text-xs text-[#64748B]">
              EPSON TM-T88VI • IP: 192.168.1.120 (Thermal 80mm)
            </Text>
          </View>

          <View className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[#0F172A]">
                Cashier Bill Printer
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5">
                <CheckSvg color="#15803D" size={12} />
                <Text className="text-[10px] font-bold text-[#15803D]">
                  Online
                </Text>
              </View>
            </View>
            <Text className="mt-1 text-xs text-[#64748B]">
              Star TSP143 • USB / Bluetooth Station (80mm)
            </Text>
          </View>
        </View>
      </DetailsModal>

      {/* ====================================================================
          Modal 3: Floor Support & Hotlines Modal
          ==================================================================== */}
      <ActionSheet
        visible={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        title="Restaurant Helpdesk"
        subtitle="Floor Support & Internal Hotlines"
        actions={[
          {
            id: 'supervisor',
            label: 'Floor Supervisor',
            description: 'Ext 101 • Manager Desk',
            icon: <PhoneIcon color="#116C0B" size={20} />,
            onPress: () => {
              setIsSupportModalOpen(false);
              Alert.alert('Contacting', 'Connecting to Floor Supervisor (Ext 101)...');
            },
          },
          {
            id: 'chef',
            label: 'Executive Chef / Kitchen',
            description: 'Ext 104 • Kitchen Pass',
            icon: <PhoneIcon color="#116C0B" size={20} />,
            onPress: () => {
              setIsSupportModalOpen(false);
              Alert.alert('Contacting', 'Connecting to Executive Chef (Ext 104)...');
            },
          },
          {
            id: 'pos_admin',
            label: 'POS Technical Admin',
            description: 'Ext 110 • IT Support',
            icon: <PhoneIcon color="#116C0B" size={20} />,
            onPress: () => {
              setIsSupportModalOpen(false);
              Alert.alert('Contacting', 'Connecting to POS Technical Admin (Ext 110)...');
            },
          },
        ]}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Sign Out"
        message="Are you sure you want to log out of the server app?"
        itemName={name}
        confirmLabel="Log Out"
        variantType="danger"
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          if (onLogout) onLogout();
        }}
      />

      {/* Clock Out Confirmation Dialog */}
      <ConfirmDialog
        visible={isClockOutConfirmOpen}
        onClose={() => setIsClockOutConfirmOpen(false)}
        title="Clock Out Shift"
        message="End your shift and clock out for today? You will be signed out."
        itemName={name}
        confirmLabel="Clock Out & Finish"
        variantType="warning"
        onConfirm={() => {
          setIsClockOutConfirmOpen(false);
          if (onClockOut) void onClockOut();
          else if (onLogout) onLogout();
        }}
      />
    </ScrollView>
  );
}
