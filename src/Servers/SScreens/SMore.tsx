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
};

export default function ServerMore({
  user = {},
  onLogout,
  onClockOut,
  onRefreshWorkspace,
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
    Alert.alert('Log Out', 'Are you sure you want to log out of the server app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          if (onLogout) onLogout();
        },
      },
    ]);
  };

  const handleClockOut = () => {
    Alert.alert(
      'Clock Out Shift',
      'End your shift and clock out for today? You will be signed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out & Finish',
          style: 'destructive',
          onPress: () => {
            if (onClockOut) void onClockOut();
            else if (onLogout) onLogout();
          },
        },
      ],
    );
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

        {/* View Staff ID Action Button */}
        <Pressable
          onPress={() => setIsIdModalOpen(true)}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 active:bg-white/15"
        >
          <IdBadgeSvg color="#86EFAC" size={18} />
          <Text className="text-xs font-bold text-[#86EFAC]">
            View Digital Staff ID Card ›
          </Text>
        </Pressable>
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
        <Text className="px-1 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
          Service & Station Tools
        </Text>

        <View className="mt-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <SettingRow
            icon={PrinterSvg}
            iconBg="#ECFDF5"
            iconColor="#116C0B"
            title="Kitchen & Receipt Printers"
            subtitle="KOT & Cashier thermal printer setup"
            badge="Online"
            badgeBg="#DCFCE7"
            badgeColor="#15803D"
            onPress={() => setIsPrinterModalOpen(true)}
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={MapPinSvg}
            iconBg="#FFF7ED"
            iconColor="#EA580C"
            title="Floor Station Assignment"
            subtitle="Dining Floor A • Tables 1 to 12"
            badge="Station A"
            badgeBg="#FFF7ED"
            badgeColor="#EA580C"
            onPress={() =>
              Alert.alert(
                'Station Assignment',
                'You are currently assigned to Station A covering Tables 1 to 12. Speak to your supervisor to change stations.',
              )
            }
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={BellSvg}
            iconBg="#EEF2FF"
            iconColor="#4F46E5"
            title="Kitchen Order Alerts"
            subtitle="Sound & vibration on ready dishes"
            rightElement={
              <Switch
                value={soundAlerts}
                onValueChange={setSoundAlerts}
                trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                thumbColor={soundAlerts ? '#116C0B' : '#94A3B8'}
              />
            }
          />
        </View>
      </View>

      {/* ====================================================================
          Section 2: App & Workflow Preferences
          ==================================================================== */}
      <View className="mt-6">
        <Text className="px-1 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
          App & Workflow
        </Text>

        <View className="mt-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <SettingRow
            icon={RefreshSvg}
            iconBg="#F0FDF4"
            iconColor="#16A34A"
            title="Sync Workspace Data"
            subtitle="Refresh menu catalog, orders & tables"
            onPress={handleSyncWorkspace}
            rightElement={
              isSyncing ? (
                <ActivityIndicator color="#116C0B" size="small" />
              ) : undefined
            }
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={GlobeSvg}
            iconBg="#F0FDFA"
            iconColor="#0D9488"
            title="App Language"
            subtitle="English (US)"
            onPress={() =>
              Alert.alert('Language', 'App language is set to English (Default).')
            }
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={LockSvg}
            iconBg="#FAF5FF"
            iconColor="#9333EA"
            title="Passcode & Terminal Lock"
            subtitle="Lock screen security during breaks"
            onPress={() =>
              Alert.alert(
                'Terminal Lock',
                'Screen lock PIN is enabled. Enter your staff PIN to unlock during breaks.',
              )
            }
          />
        </View>
      </View>

      {/* ====================================================================
          Section 3: Operations & Support
          ==================================================================== */}
      <View className="mt-6">
        <Text className="px-1 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
          Operations & Helpdesk
        </Text>

        <View className="mt-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <SettingRow
            icon={PhoneSvg}
            iconBg="#FEF2F2"
            iconColor="#DC2626"
            title="Floor Manager Hotline"
            subtitle="Instant contact with supervisor or chef"
            onPress={() => setIsSupportModalOpen(true)}
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={BookOpenSvg}
            iconBg="#F8FAFC"
            iconColor="#475569"
            title="Service SOP & Guidelines"
            subtitle="Standard guest hospitality protocol"
            onPress={() =>
              Alert.alert(
                'Service Guidelines',
                '1. Greet guests within 2 mins.\n2. Confirm allergy requests with the kitchen.\n3. Verify table bills before processing checkout.',
              )
            }
          />
          <View className="h-[1px] bg-[#F1F5F9] mx-4" />

          <SettingRow
            icon={InfoSvg}
            iconBg="#F1F5F9"
            iconColor="#334155"
            title="About Restaurant Server App"
            subtitle="v1.2.0 • Station POS Build 42"
            onPress={() =>
              Alert.alert(
                'About App',
                'Restaurant Server POS App v1.2.0\nBuild: 42 (Release)\nDevice: Station A\nRestaurant: DineServe POS',
              )
            }
          />
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
      <Modal
        visible={isIdModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIdModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-[340px] rounded-3xl bg-white p-6 shadow-2xl">
            {/* Card Header */}
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
              <View>
                <Text className="text-[10px] font-bold tracking-widest text-[#116C0B]">
                  DINESERVE RESTAURANT
                </Text>
                <Text className="text-base font-black text-[#012711]">
                  Digital Staff Badge
                </Text>
              </View>
              <Pressable
                onPress={() => setIsIdModalOpen(false)}
                className="rounded-full bg-slate-100 p-2"
              >
                <CloseSvg size={16} />
              </Pressable>
            </View>

            {/* Avatar & Info */}
            <View className="items-center py-6">
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
              <View className="mt-6 w-full items-center rounded-xl bg-slate-50 p-3 border border-slate-200">
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

              <Text className="mt-3 text-[10px] text-[#94A3B8]">
                Authorized server for Dining Station A • Valid for 2026-2027
              </Text>
            </View>

            <Pressable
              onPress={() => setIsIdModalOpen(false)}
              className="h-11 items-center justify-center rounded-xl bg-[#116C0B]"
            >
              <Text className="font-bold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
          Modal 2: Printer Setup & Test Modal
          ==================================================================== */}
      <Modal
        visible={isPrinterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPrinterModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
              <View className="flex-row items-center gap-2">
                <PrinterSvg color="#116C0B" size={20} />
                <Text className="text-base font-extrabold text-[#012711]">
                  POS Printers Status
                </Text>
              </View>
              <Pressable
                onPress={() => setIsPrinterModalOpen(false)}
                className="rounded-full bg-slate-100 p-2"
              >
                <CloseSvg size={16} />
              </Pressable>
            </View>

            <View className="my-4 gap-3">
              <View className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-bold text-[#0F172A]">
                    Kitchen KOT Printer
                  </Text>
                  <View className="flex-row items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5">
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

              <View className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-bold text-[#0F172A]">
                    Cashier Bill Printer
                  </Text>
                  <View className="flex-row items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5">
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

            <View className="gap-2">
              <Pressable
                disabled={isTestingPrint}
                onPress={handleTestPrint}
                className="h-11 items-center justify-center rounded-xl bg-[#116C0B] active:bg-[#02480B]"
              >
                {isTestingPrint ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-bold text-white">Print Test Slip</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setIsPrinterModalOpen(false)}
                className="h-10 items-center justify-center rounded-xl bg-slate-100"
              >
                <Text className="font-semibold text-[#475569]">Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
          Modal 3: Floor Support & Hotlines Modal
          ==================================================================== */}
      <Modal
        visible={isSupportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSupportModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-[340px] rounded-3xl bg-white p-6 shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
              <View className="flex-row items-center gap-2">
                <PhoneSvg color="#DC2626" size={20} />
                <Text className="text-base font-extrabold text-[#012711]">
                  Restaurant Helpdesk
                </Text>
              </View>
              <Pressable
                onPress={() => setIsSupportModalOpen(false)}
                className="rounded-full bg-slate-100 p-2"
              >
                <CloseSvg size={16} />
              </Pressable>
            </View>

            <View className="my-4 gap-2.5">
              {[
                { title: 'Floor Supervisor', phone: 'Ext 101 • Manager Desk' },
                { title: 'Executive Chef / Kitchen', phone: 'Ext 104 • Kitchen Pass' },
                { title: 'POS Technical Admin', phone: 'Ext 110 • IT Support' },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setIsSupportModalOpen(false);
                    Alert.alert('Contacting', `Connecting to ${item.title} (${item.phone})...`);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 active:bg-slate-100"
                >
                  <Text className="text-xs font-bold text-[#0F172A]">{item.title}</Text>
                  <Text className="mt-0.5 text-xs text-[#116C0B]">{item.phone}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setIsSupportModalOpen(false)}
              className="h-11 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="font-bold text-[#475569]">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
